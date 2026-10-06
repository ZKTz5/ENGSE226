import { DatabaseSync } from 'node:sqlite';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  if (!tables.includes('users')) {
    if (DB_FILE === ':memory:' && existsSync(SCHEMA_FILE)) {
      db.exec(readFileSync(SCHEMA_FILE, 'utf8'));
    } else {
      throw new Error('Database schema is not initialized. Run `npm run db:setup --prefix api` explicitly before starting the API.');
    }
  }
  assertRequestSchema(db);
}

const REQUIRED_COLUMNS = {
  users: ['id', 'email', 'role', 'password_hash'],
  vehicles: ['id', 'code', 'capacity', 'home_location', 'active'],
  vehicle_requests: [
    'id', 'user_id', 'origin', 'destination', 'trip_type', 'departure_at', 'return_at',
    'passenger_count', 'purpose', 'note', 'status', 'assigned_vehicle_id', 'rejection_reason',
    'created_at', 'updated_at',
  ],
};

export function assertRequestSchema(database) {
  const missing = [];
  for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
    const exists = database.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name = ?").get(table);
    if (!exists) {
      missing.push(table);
      continue;
    }
    const actual = new Set(database.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name));
    for (const column of columns) if (!actual.has(column)) missing.push(`${table}.${column}`);
  }
  if (missing.length) {
    throw new Error(
      `Incompatible request-workflow database schema; missing: ${missing.join(', ')}. ` +
      'Back up the existing DB and point DB_FILE at a new disposable DB, or explicitly run `npm run db:reset --prefix api` after preserving the old DB.',
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
  } catch (error) {
    return { connected: false, reason: error.message };
  }
}

export function runInImmediateTransaction(fn) {
  const database = getDb();
  database.exec('BEGIN IMMEDIATE');
  try {
    const result = fn(database);
    database.exec('COMMIT');
    return result;
  } catch (error) {
    try { database.exec('ROLLBACK'); } catch { /* ignore rollback error */ }
    throw error;
  }
}

export function findUserByEmail(email) {
  return getDb().prepare(
    'SELECT id, name, email, role, password_hash AS passwordHash FROM users WHERE email = ?',
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
