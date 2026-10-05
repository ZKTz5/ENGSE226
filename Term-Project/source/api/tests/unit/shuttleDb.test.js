import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, test } from 'vitest';
import { assertShuttleSchema } from '../../src/services/shuttleDb.js';

describe('assertShuttleSchema', () => {
  let db;
  afterEach(() => db?.close());

  test('gives an explicit backup/reset instruction for a legacy Campus Service database', () => {
    db = new DatabaseSync(':memory:');
    db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY); CREATE TABLE requests (id TEXT PRIMARY KEY)');

    expect(() => assertShuttleSchema(db)).toThrow(/Back up the existing database.*db:reset/);
  });

  test('accepts a database containing all Shuttle tables', () => {
    db = new DatabaseSync(':memory:');
    db.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY);
      CREATE TABLE campuses (id INTEGER PRIMARY KEY);
      CREATE TABLE schedules (id INTEGER PRIMARY KEY);
      CREATE TABLE bookings (id INTEGER PRIMARY KEY);`);

    expect(assertShuttleSchema(db)).toBe(true);
  });
});
