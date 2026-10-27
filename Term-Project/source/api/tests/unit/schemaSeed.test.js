import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { validateVehicleRequest } from '../../src/validators/requestValidator.js';

const schema = readFileSync(new URL('../../data/schema.sql', import.meta.url), 'utf8');
let db;
beforeEach(() => {
  db = new DatabaseSync(':memory:');
  db.exec(schema);
});
afterEach(() => db.close());

describe('schema.sql initial data', () => {
  test('creates ten users, six vehicles and all five request statuses for every regular user', () => {
    expect(db.prepare('SELECT count(*) AS n FROM users').get().n).toBe(10);
    expect(db.prepare('SELECT count(*) AS n FROM vehicles').get().n).toBe(6);
    expect(db.prepare('SELECT count(*) AS n FROM vehicle_requests').get().n).toBe(45);
    expect(db.prepare('SELECT status, count(*) AS n FROM vehicle_requests GROUP BY status').all())
      .toEqual(['APPROVED', 'CANCELLED', 'COMPLETED', 'PENDING', 'REJECTED'].map((status) => ({ status, n: 9 })));
    const users = db.prepare(`SELECT u.email, count(DISTINCT r.status) AS statuses
      FROM users u LEFT JOIN vehicle_requests r ON r.user_id = u.id
      WHERE u.role = 'user' GROUP BY u.id`).all();
    expect(users).toHaveLength(9);
    expect(users.every((user) => user.statuses === 5)).toBe(true);
    expect(db.prepare('SELECT DISTINCT origin FROM vehicle_requests').all()).toHaveLength(2);
    expect(db.prepare('SELECT DISTINCT trip_type FROM vehicle_requests').all()).toHaveLength(2);
    expect(db.prepare('SELECT count(*) AS n FROM vehicles WHERE active = 0').get().n).toBe(1);
  });

  test('stores valid inputs, future journeys and completed history with consistent timestamps', () => {
    const now = new Date();
    const rows = db.prepare('SELECT * FROM vehicle_requests').all();
    expect(rows).toHaveLength(45);
    for (const row of rows) {
      const createdAt = new Date(row.created_at);
      const updatedAt = new Date(row.updated_at);
      expect(createdAt.getTime()).toBeLessThanOrEqual(now.getTime());
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(createdAt.getTime());
      expect(updatedAt.getTime()).toBeLessThanOrEqual(now.getTime());
      expect(validateVehicleRequest({
        origin: row.origin, destination: row.destination, tripType: row.trip_type,
        departureAt: row.departure_at, returnAt: row.return_at,
        passengerCount: row.passenger_count, purpose: row.purpose, note: row.note,
      }, createdAt).errors).toEqual([]);
      if (row.status === 'COMPLETED') expect(new Date(row.return_at).getTime()).toBeLessThan(now.getTime());
      else expect(new Date(row.departure_at).getTime()).toBeGreaterThan(now.getTime());
      if (row.status === 'REJECTED') expect(row.rejection_reason.length).toBeGreaterThan(0);
      else expect(row.rejection_reason).toBeNull();
    }
    const tomorrow = new Date(now.getTime() + 7 * 3_600_000 + 86_400_000).toISOString().slice(0, 10);
    expect(rows.find((row) => row.status === 'PENDING').departure_at).toBe(`${tomorrow}T01:00:00.000Z`);
  });

  test('keeps assignments within capacity and active fleet, without approved overlaps or broken references', () => {
    expect(db.prepare('SELECT count(*) AS n FROM vehicle_requests WHERE assigned_vehicle_id IS NOT NULL').get().n)
      .toBe(17);
    expect(db.prepare(`SELECT r.id FROM vehicle_requests r JOIN vehicles v ON v.id = r.assigned_vehicle_id
      WHERE v.active = 0 OR r.passenger_count > v.capacity OR r.return_at IS NULL
         OR r.status NOT IN ('APPROVED', 'COMPLETED')`).all()).toEqual([]);
    expect(db.prepare(`SELECT a.id FROM vehicle_requests a JOIN vehicle_requests b
      ON a.id < b.id AND a.assigned_vehicle_id = b.assigned_vehicle_id
      WHERE a.status = 'APPROVED' AND b.status = 'APPROVED'
        AND datetime(a.departure_at) < datetime(b.return_at)
        AND datetime(a.return_at) > datetime(b.departure_at)`).all()).toEqual([]);
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    expect(db.prepare('PRAGMA integrity_check').get().integrity_check).toBe('ok');
  });

  test('includes unassigned approval, unbounded one-way request, oversized group and conflicting pending journey', () => {
    expect(db.prepare(`SELECT id FROM vehicle_requests WHERE status = 'APPROVED' AND assigned_vehicle_id IS NULL`).all())
      .toHaveLength(1);
    expect(db.prepare(`SELECT id FROM vehicle_requests WHERE status = 'PENDING' AND trip_type = 'ONE_WAY' AND return_at IS NULL`).all().length)
      .toBeGreaterThan(0);
    expect(db.prepare(`SELECT id FROM vehicle_requests WHERE status = 'PENDING'
      AND passenger_count > (SELECT max(capacity) FROM vehicles WHERE active = 1)`).all()).toHaveLength(1);
    expect(db.prepare(`SELECT p.id FROM vehicle_requests p JOIN vehicle_requests a ON p.user_id = a.user_id
      WHERE p.status = 'PENDING' AND a.status = 'APPROVED' AND p.return_at IS NOT NULL
        AND datetime(p.departure_at) < datetime(a.return_at)
        AND datetime(p.return_at) > datetime(a.departure_at)`).all().length).toBeGreaterThan(0);
  });

  test('explicit schema reset recreates the same dataset without duplicates', () => {
    db.exec(schema);
    expect(db.prepare('SELECT count(*) AS n FROM users').get().n).toBe(10);
    expect(db.prepare('SELECT count(*) AS n FROM vehicles').get().n).toBe(6);
    expect(db.prepare('SELECT count(*) AS n FROM vehicle_requests').get().n).toBe(45);
  });
});
