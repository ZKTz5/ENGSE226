import {
  getDb, runInImmediateTransaction, findScheduleById, findUserById, isDepartureTimePast,
} from './shuttleDb.js';

/**
 * bookingService.js — writes to bookings and updates schedules.available_seats
 * atomically. Every write is wrapped in BEGIN IMMEDIATE ... COMMIT so two
 * concurrent requests cannot overbook the same seat (single connection +
 * BEGIN IMMEDIATE = serialised write transaction).
 *
 * Result shape: { ok: false, status: 4xx/5xx, error: string } on failure,
 *                { ok: true, ... } on success.
 */

export function createBooking({ userId, scheduleId }) {
  return runInImmediateTransaction((d) => {
    const user = findUserById(userId);
    if (!user) return { ok: false, status: 401, error: 'user not found' };
    const schedule = findScheduleById(scheduleId);
    if (!schedule) return { ok: false, status: 404, error: 'schedule not found' };
    if (schedule.status === 'expired' || isDepartureTimePast(schedule.departure_time)) {
      return { ok: false, status: 409, error: 'expired_schedule' };
    }
    const existing = d
      .prepare(
        `SELECT id, status FROM bookings
         WHERE user_id = ? AND schedule_id = ? AND status != 'cancelled'`
      )
      .get(userId, scheduleId);
    if (existing) {
      return { ok: false, status: 409, error: 'duplicate_booking' };
    }

    // Recompute available seats from bookings (authoritative, not the cache).
    const confirmed = d
      .prepare("SELECT COUNT(*) c FROM bookings WHERE schedule_id = ? AND status = 'confirmed'")
      .get(scheduleId).c;
    const waitlisted = d
      .prepare("SELECT COUNT(*) c FROM bookings WHERE schedule_id = ? AND status = 'waitlisted'")
      .get(scheduleId).c;
    const available = schedule.capacity - confirmed - waitlisted;

    if (available > 0) {
      const info = d
        .prepare(
          `INSERT INTO bookings (user_id, schedule_id, status, waitlist_seq)
           VALUES (?, ?, 'confirmed', NULL)`
        )
        .run(userId, scheduleId);
      d.prepare('UPDATE schedules SET available_seats = ? WHERE id = ?')
        .run(available - 1, scheduleId);
      const booking = d
        .prepare(
          `SELECT b.id, b.user_id, b.schedule_id, b.status, b.waitlist_seq, b.created_at,
                  s.origin_id, s.destination_id, s.departure_time
           FROM bookings b JOIN schedules s ON s.id = b.schedule_id WHERE b.id = ?`
        )
        .get(info.lastInsertRowid);
      return { ok: true, booking };
    }

    // Waitlist — monotonic seq = MAX+1 within the same transaction.
    const nextSeq = d
      .prepare(
        `SELECT COALESCE(MAX(waitlist_seq), 0) + 1 AS next
         FROM bookings WHERE schedule_id = ? AND status = 'waitlisted'`
      )
      .get(scheduleId).next;
    const info = d
      .prepare(
        `INSERT INTO bookings (user_id, schedule_id, status, waitlist_seq)
         VALUES (?, ?, 'waitlisted', ?)`
      )
      .run(userId, scheduleId, nextSeq);
    const booking = d
      .prepare(
        `SELECT b.id, b.user_id, b.schedule_id, b.status, b.waitlist_seq, b.created_at,
                s.origin_id, s.destination_id, s.departure_time
         FROM bookings b JOIN schedules s ON s.id = b.schedule_id WHERE b.id = ?`
      )
      .get(info.lastInsertRowid);
    return { ok: true, booking };
  });
}

/**
 * cancelBooking(bookingId, { userId, isAdmin })
 *  - Only the booking owner or an admin may cancel.
 *  - Cancelling a confirmed booking promotes the first waitlisted entry
 *    (FIFO by created_at, then id) — all inside one transaction.
 *  - Cancelling a waitlisted entry just marks it cancelled; no promotion.
 */
export function cancelBooking(bookingId, { userId, isAdmin = false } = {}) {
  return runInImmediateTransaction((d) => {
    const booking = d
      .prepare(
        `SELECT b.id, b.user_id, b.schedule_id, b.status, b.waitlist_seq, s.capacity
         FROM bookings b JOIN schedules s ON s.id = b.schedule_id WHERE b.id = ?`
      )
      .get(bookingId);
    if (!booking) return { ok: false, status: 404, error: 'booking not found' };
    if (booking.status === 'cancelled') {
      return { ok: false, status: 409, error: 'already_cancelled' };
    }
    if (!isAdmin && booking.user_id !== userId) {
      return { ok: false, status: 403, error: 'forbidden' };
    }

    d.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(booking.id);

    // Recompute + refresh available_seats (authoritative).
    const confirmed = d
      .prepare("SELECT COUNT(*) c FROM bookings WHERE schedule_id = ? AND status = 'confirmed'")
      .get(booking.schedule_id).c;
    const waitlisted = d
      .prepare("SELECT COUNT(*) c FROM bookings WHERE schedule_id = ? AND status = 'waitlisted'")
      .get(booking.schedule_id).c;
    d.prepare('UPDATE schedules SET available_seats = ? WHERE id = ?')
      .run(booking.capacity - confirmed - waitlisted, booking.schedule_id);

    // Promote the first waitlisted user only when a confirmed seat was freed.
    let promoted = null;
    if (booking.status === 'confirmed' && waitlisted > 0) {
      const next = d
        .prepare(
          `SELECT id FROM bookings
           WHERE schedule_id = ? AND status = 'waitlisted'
           ORDER BY created_at ASC, id ASC LIMIT 1`
        )
        .get(booking.schedule_id);
      if (next) {
        d.prepare("UPDATE bookings SET status = 'confirmed', waitlist_seq = NULL WHERE id = ?")
          .run(next.id);
        const c2 = d
          .prepare("SELECT COUNT(*) c FROM bookings WHERE schedule_id = ? AND status = 'confirmed'")
          .get(booking.schedule_id).c;
        const w2 = d
          .prepare("SELECT COUNT(*) c FROM bookings WHERE schedule_id = ? AND status = 'waitlisted'")
          .get(booking.schedule_id).c;
        d.prepare('UPDATE schedules SET available_seats = ? WHERE id = ?')
          .run(booking.capacity - c2 - w2, booking.schedule_id);
        promoted = next.id;
      }
    }

    return {
      ok: true,
      cancelledId: booking.id,
      promotedId: promoted,
      scheduleId: booking.schedule_id,
      availableSeats: d
        .prepare('SELECT available_seats a FROM schedules WHERE id = ?')
        .get(booking.schedule_id).a,
    };
  });
}

export function listBookingsByUser(userId) {
  return getDb()
    .prepare(
      `SELECT b.id, b.user_id, b.schedule_id, b.status, b.waitlist_seq, b.created_at,
              s.origin_id, s.destination_id, s.departure_time, s.capacity,
              o.name AS originName, d.name AS destinationName
       FROM bookings b
       JOIN schedules s ON s.id = b.schedule_id
       JOIN campuses o ON o.id = s.origin_id
       JOIN campuses d ON d.id = s.destination_id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC, b.id DESC`
    )
    .all(userId);
}

export function getBookingById(id) {
  return getDb()
    .prepare(
      `SELECT b.id, b.user_id, b.schedule_id, b.status, b.waitlist_seq, b.created_at,
              s.origin_id, s.destination_id, s.departure_time, s.capacity,
              o.name AS originName, d.name AS destinationName
       FROM bookings b
       JOIN schedules s ON s.id = b.schedule_id
       JOIN campuses o ON o.id = s.origin_id
       JOIN campuses d ON d.id = s.destination_id
       WHERE b.id = ?`
    )
    .get(id) ?? null;
}
