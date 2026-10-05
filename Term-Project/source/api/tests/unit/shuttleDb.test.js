import { afterEach, describe, expect, test } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { assertRequestSchema } from '../../src/services/shuttleDb.js';

let db;
afterEach(() => db?.close());

describe('request database compatibility guard', () => {
  test('rejects an old Campus Service or schedule/booking schema', () => {
    db = new DatabaseSync(':memory:');
    db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY); CREATE TABLE schedules (id INTEGER PRIMARY KEY); CREATE TABLE bookings (id INTEGER PRIMARY KEY)');
    expect(() => assertRequestSchema(db)).toThrow(/vehicle_requests/);
  });
  test('accepts schema containing users, vehicles, and vehicle request columns', () => {
    db = new DatabaseSync(':memory:');
    db.exec(`
      CREATE TABLE users (id INTEGER, email TEXT, role TEXT, password_hash TEXT);
      CREATE TABLE vehicles (id INTEGER, code TEXT, capacity INTEGER, home_location TEXT, active INTEGER);
      CREATE TABLE vehicle_requests (
        id INTEGER, user_id INTEGER, origin TEXT, destination TEXT, trip_type TEXT,
        departure_at TEXT, return_at TEXT, passenger_count INTEGER, purpose TEXT, note TEXT,
        status TEXT, assigned_vehicle_id INTEGER, rejection_reason TEXT, created_at TEXT, updated_at TEXT
      );
    `);
    expect(assertRequestSchema(db)).toBe(true);
  });
});
