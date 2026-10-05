import { DatabaseSync } from 'node:sqlite';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * shuttleDb.js — single shared SQLite connection + query helpers.
 *
 * Uses node:sqlite (DatabaseSync). A single connection is required so that
 * BEGIN IMMEDIATE transactions work deterministically; the Express server is
 * single-process and Node event-loop is single-threaded, so this serialises
 * all bookings.
 *
 * libsql / Turso remote path is preserved in `openDatabase` but the booking
 * transaction guarantee only holds for local node:sqlite.  If TURSO_DATABASE_URL
 * is set, open the libsql client instead — BEGIN/COMMIT/ROLLBACK via exec()
 * still works, but concurrent writers come over the network, so the waitlist
 * FIFO guarantee must be checked against that environment separately.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const API_ROOT = path.resolve(HERE, '../..');
const DB_FILE = process.env.DB_FILE ?? path.join(API_ROOT, 'data', 'campus.db');
const SCHEMA_FILE = path.join(API_ROOT, 'data', 'schema.sql');

let db;
let driver = 'sqlite';

async function openDatabase() {
  const url = process.env.TURSO_DATABASE_URL;
  if (url) {
    const lib = await import('libsql');
    // libsql exposes a synchronous `Database` in 0.5.x (also re-exported as
    // default); fall back to createClient if not present.
    const DatabaseCtor = lib.Database ?? lib.createClient;
    driver = 'turso';
    return new DatabaseCtor(url, { authToken: process.env.TURSO_AUTH_TOKEN });
  }
  driver = 'sqlite';
  return new DatabaseSync(DB_FILE);
}

export async function loadSeed() {
  db = await openDatabase();
  db.exec('PRAGMA foreign_keys = ON');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((row) => row.name);
  if (!tables.includes('users') && existsSync(SCHEMA_FILE)) {
    db.exec(readFileSync(SCHEMA_FILE, 'utf8'));
  }
  assertShuttleSchema(db);
}

const REQUIRED_TABLES = ['users', 'campuses', 'schedules', 'bookings'];

export function assertShuttleSchema(database) {
  const tables = new Set(database.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((row) => row.name));
  const missing = REQUIRED_TABLES.filter((table) => !tables.has(table));
  if (missing.length) {
    throw new Error(
      `Incompatible database schema; missing Shuttle tables: ${missing.join(', ')}. ` +
      'Back up the existing database, then run `npm run db:reset --prefix api` to create the Shuttle schema.',
    );
  }
  return true;
}

export function getDb() {
  if (!db) throw new Error('database not initialised — call loadSeed() first');
  return db;
}

export function getDbStatus() {
  try {
    if (!db) return { connected: false, reason: 'database not initialised' };
    const n = db.prepare("SELECT COUNT(*) c FROM sqlite_master WHERE type='table'").get().c;
    return { connected: true, driver, tables: n };
  } catch (e) {
    return { connected: false, reason: e.message };
  }
}

export function getDriver() {
  return driver;
}

/** Compare against SQLite's local clock, matching the local timestamps in schema.sql. */
export function isDepartureTimePast(departureTime) {
  return Boolean(getDb()
    .prepare("SELECT datetime(?) <= datetime('now','localtime') AS expired")
    .get(departureTime).expired);
}

/** Run a callback inside a BEGIN IMMEDIATE ... COMMIT/ROLLBACK block. */
export function runInImmediateTransaction(fn) {
  const d = getDb();
  d.exec('BEGIN IMMEDIATE');
  try {
    const result = fn(d);
    d.exec('COMMIT');
    return result;
  } catch (err) {
    try { d.exec('ROLLBACK'); } catch { /* ignore rollback error */ }
    throw err;
  }
}

// ───────────────────────────────────────────────
// users
// ───────────────────────────────────────────────
export function findUserByEmail(email) {
  return getDb().prepare(
    'SELECT id, name, email, role, password_hash AS passwordHash FROM users WHERE email = ?'
  ).get(String(email).trim().toLowerCase()) ?? null;
}

export function findUserById(id) {
  return getDb().prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(id) ?? null;
}

export function upsertUser({ email, name, passwordHash, role = 'user' }) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = findUserByEmail(normalizedEmail);
  if (existing) {
    getDb().prepare('UPDATE users SET name = ?, role = ?, password_hash = ? WHERE id = ?')
      .run(name, role, passwordHash, existing.id);
    return 'updated';
  }
  getDb().prepare('INSERT INTO users (name, email, role, password_hash) VALUES (?, ?, ?, ?)')
    .run(name, normalizedEmail, role, passwordHash);
  return 'created';
}

// ───────────────────────────────────────────────
// campuses
// ───────────────────────────────────────────────
export function listCampuses() {
  return getDb().prepare('SELECT id, name FROM campuses ORDER BY id').all();
}

export function findCampusById(id) {
  return getDb().prepare('SELECT id, name FROM campuses WHERE id = ?').get(id) ?? null;
}

// ───────────────────────────────────────────────
// schedules
// ───────────────────────────────────────────────
const SCHEDULE_SELECT_SHAPE = `
  SELECT s.id,
         s.origin_id,
         s.destination_id,
         s.departure_time,
         s.capacity,
         s.status,
         s.available_seats,
         o.name AS originName,
         d.name AS destinationName
  FROM schedules s
  JOIN campuses o ON o.id = s.origin_id
  JOIN campuses d ON d.id = s.destination_id`;

export function findScheduleById(id) {
  return getDb().prepare(`${SCHEDULE_SELECT_SHAPE} WHERE s.id = ?`).get(id) ?? null;
}

export function listSchedules({ originId, destinationId, date } = {}) {
  const clauses = [];
  const params = [];
  if (originId != null && originId !== '') {
    clauses.push('s.origin_id = ?');
    params.push(Number(originId));
  }
  if (destinationId != null && destinationId !== '') {
    clauses.push('s.destination_id = ?');
    params.push(Number(destinationId));
  }
  if (date != null && date !== '') {
    // date is YYYY-MM-DD (local date); match against departure_time prefix
    clauses.push("strftime('%Y-%m-%d', s.departure_time, 'localtime') = ?");
    params.push(String(date));
  }
  const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
  return getDb()
    .prepare(`${SCHEDULE_SELECT_SHAPE}${where} ORDER BY s.departure_time ASC`)
    .all(...params);
}
