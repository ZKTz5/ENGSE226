import { getDb, runInImmediateTransaction, findUserById } from './shuttleDb.js';
import { SERVICE_LOCATIONS } from '../validators/requestValidator.js';

export function listLocations() {
  return SERVICE_LOCATIONS.map((name) => ({
    value: name,
    name,
    isHomeBase: name === 'Jed Yod',
  }));
}

const REQUEST_COLUMNS = `
  r.id, r.user_id AS userId, r.origin, r.destination, r.trip_type AS tripType,
  r.departure_at AS departureAt, r.return_at AS returnAt,
  r.passenger_count AS passengerCount, r.purpose, r.note, r.status,
  r.assigned_vehicle_id AS assignedVehicleId, r.rejection_reason AS rejectionReason,
  r.created_at AS createdAt, r.updated_at AS updatedAt,
  v.code AS assignedVehicleCode, v.capacity AS assignedVehicleCapacity,
  u.name AS requesterName, u.email AS requesterEmail`;

function presentRequest(row) {
  if (!row) return null;
  const result = { ...row };
  if (result.assignedVehicleId == null) {
    delete result.assignedVehicleId;
    delete result.assignedVehicleCode;
    delete result.assignedVehicleCapacity;
  }
  if (result.rejectionReason == null) delete result.rejectionReason;
  return result;
}

function getRequestRow(whereSql, ...params) {
  const row = getDb().prepare(`
    SELECT ${REQUEST_COLUMNS}
    FROM vehicle_requests r
    JOIN users u ON u.id = r.user_id
    LEFT JOIN vehicles v ON v.id = r.assigned_vehicle_id
    WHERE ${whereSql}
  `).get(...params) ?? null;
  return presentRequest(row);
}

export function createVehicleRequest(userId, input) {
  return runInImmediateTransaction((db) => {
    if (!findUserById(userId)) return { ok: false, status: 401, error: 'user_not_found' };
    const result = db.prepare(`
      INSERT INTO vehicle_requests
        (user_id, origin, destination, trip_type, departure_at, return_at,
         passenger_count, purpose, note, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
    `).run(
      userId, input.origin, input.destination, input.tripType, input.departureAt,
      input.returnAt, input.passengerCount, input.purpose, input.note,
    );
    return { ok: true, request: getRequestRow('r.id = ?', result.lastInsertRowid) };
  });
}

export function listRequestsByUser(userId) {
  return getDb().prepare(`
    SELECT ${REQUEST_COLUMNS}
    FROM vehicle_requests r
    JOIN users u ON u.id = r.user_id
    LEFT JOIN vehicles v ON v.id = r.assigned_vehicle_id
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC, r.id DESC
  `).all(userId).map(presentRequest);
}

export function getRequestForUser(id, userId) {
  return getRequestRow('r.id = ? AND r.user_id = ?', id, userId);
}

export function cancelOwnRequest(id, userId) {
  return runInImmediateTransaction((db) => {
    const current = db.prepare('SELECT id, status FROM vehicle_requests WHERE id = ? AND user_id = ?').get(id, userId);
    if (!current) return { ok: false, status: 404, error: 'request_not_found' };
    if (current.status !== 'PENDING') return { ok: false, status: 409, error: 'request_not_cancellable' };
    db.prepare("UPDATE vehicle_requests SET status = 'CANCELLED', updated_at = datetime('now') WHERE id = ?")
      .run(id);
    return { ok: true, request: getRequestRow('r.id = ?', id) };
  });
}

export function listAdminRequests(status) {
  const where = status ? 'WHERE r.status = ?' : '';
  return getDb().prepare(`
    SELECT ${REQUEST_COLUMNS}
    FROM vehicle_requests r
    JOIN users u ON u.id = r.user_id
    LEFT JOIN vehicles v ON v.id = r.assigned_vehicle_id
    ${where}
    ORDER BY CASE r.status WHEN 'PENDING' THEN 0 ELSE 1 END, r.departure_at, r.id
  `).all(...(status ? [status] : [])).map(presentRequest);
}

export function listVehicles({ activeOnly = false } = {}) {
  const where = activeOnly ? 'WHERE active = 1' : '';
  return getDb().prepare(`
    SELECT id, code, capacity, home_location AS homeLocation, active,
           created_at AS createdAt, updated_at AS updatedAt
    FROM vehicles ${where} ORDER BY code
  `).all();
}

export function createVehicle(input) {
  return runInImmediateTransaction((db) => {
    try {
      const info = db.prepare(`
        INSERT INTO vehicles (code, capacity, home_location)
        VALUES (?, ?, ?)
      `).run(input.code, input.capacity, input.homeLocation);
      return { ok: true, vehicle: listVehicles().find(({ id }) => id === Number(info.lastInsertRowid)) };
    } catch (error) {
      if (String(error.message).includes('UNIQUE')) return { ok: false, status: 409, error: 'vehicle_code_exists' };
      throw error;
    }
  });
}

export function setVehicleActive(id, active) {
  return runInImmediateTransaction((db) => {
    const current = db.prepare('SELECT id FROM vehicles WHERE id = ?').get(id);
    if (!current) return { ok: false, status: 404, error: 'vehicle_not_found' };
    db.prepare("UPDATE vehicles SET active = ?, updated_at = datetime('now') WHERE id = ?")
      .run(active ? 1 : 0, id);
    return { ok: true, vehicle: listVehicles().find(({ id: vehicleId }) => vehicleId === id) };
  });
}

export function approveRequest(id, assignedVehicleId = null) {
  return runInImmediateTransaction((db) => {
    const current = db.prepare('SELECT * FROM vehicle_requests WHERE id = ?').get(id);
    if (!current) return { ok: false, status: 404, error: 'request_not_found' };
    if (current.status !== 'PENDING') return { ok: false, status: 409, error: 'request_not_pending' };

    if (assignedVehicleId !== null) {
      const vehicle = db.prepare('SELECT id, active FROM vehicles WHERE id = ?').get(assignedVehicleId);
      if (!vehicle) return { ok: false, status: 404, error: 'vehicle_not_found' };
      if (!vehicle.active) return { ok: false, status: 409, error: 'vehicle_inactive' };
      if (vehicle.capacity < current.passenger_count) return { ok: false, status: 409, error: 'vehicle_capacity_insufficient' };
      if (!current.return_at) return { ok: false, status: 409, error: 'service_window_required' };
      const overlap = db.prepare(`
        SELECT id FROM vehicle_requests
        WHERE assigned_vehicle_id = ? AND status = 'APPROVED'
          AND datetime(departure_at) < datetime(?)
          AND datetime(return_at) > datetime(?)
        LIMIT 1
      `).get(assignedVehicleId, current.return_at, current.departure_at);
      if (overlap) return { ok: false, status: 409, error: 'vehicle_assignment_overlap' };
    }

    db.prepare(`
      UPDATE vehicle_requests
      SET status = 'APPROVED', assigned_vehicle_id = ?, rejection_reason = NULL,
          updated_at = datetime('now')
      WHERE id = ? AND status = 'PENDING'
    `).run(assignedVehicleId, id);
    return { ok: true, request: getRequestRow('r.id = ?', id) };
  });
}

export function rejectRequest(id, rejectionReason) {
  return runInImmediateTransaction((db) => {
    const current = db.prepare('SELECT id, status FROM vehicle_requests WHERE id = ?').get(id);
    if (!current) return { ok: false, status: 404, error: 'request_not_found' };
    if (current.status !== 'PENDING') return { ok: false, status: 409, error: 'request_not_pending' };
    db.prepare(`
      UPDATE vehicle_requests
      SET status = 'REJECTED', rejection_reason = ?, updated_at = datetime('now')
      WHERE id = ? AND status = 'PENDING'
    `).run(rejectionReason, id);
    return { ok: true, request: getRequestRow('r.id = ?', id) };
  });
}

export function completeRequest(id) {
  return runInImmediateTransaction((db) => {
    const current = db.prepare('SELECT id, status FROM vehicle_requests WHERE id = ?').get(id);
    if (!current) return { ok: false, status: 404, error: 'request_not_found' };
    if (current.status !== 'APPROVED') return { ok: false, status: 409, error: 'request_not_approved' };
    db.prepare(`
      UPDATE vehicle_requests SET status = 'COMPLETED', updated_at = datetime('now')
      WHERE id = ? AND status = 'APPROVED'
    `).run(id);
    return { ok: true, request: getRequestRow('r.id = ?', id) };
  });
}
