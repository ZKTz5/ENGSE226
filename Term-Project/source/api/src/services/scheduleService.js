import { listCampuses, findCampusById, findScheduleById, listSchedules, getDb } from './shuttleDb.js';

/**
 * scheduleService.js — read-side queries for campuses and schedules.
 */

/**
 * GET /api/campuses
 */
export function getCampuses() {
  return listCampuses();
}

/**
 * GET /api/schedules?originId=&destinationId=&date=
 * Each result:
 *   {
 *     id, origin_id, destination_id, departure_time, capacity,
 *     originName, destinationName,
 *     status: 'active' | 'expired' | 'waitlist' | 'full',
 *     confirmedCount, waitlistCount, availableSeats
 *   }
 *
 * The `status` field is derived:
 *   - 'expired'  if the stored status is 'expired' (past departure_time)
 *   - 'full'     if available_seats === 0 and no waitlist (rare)
 *   - 'waitlist' if available_seats <= 0 (booking will put users in waitlist)
 *   - 'active'   otherwise
 */
export function getScheduleList({ originId, destinationId, date } = {}) {
  return listSchedules({ originId, destinationId, date }).map((row) => decorate(row));
}

export function getScheduleById(id) {
  const row = findScheduleById(id);
  return row ? decorate(row) : null;
}

function decorate(row) {
  // Compute live counts from the bookings table.
  const confirmed = getDb()
    .prepare("SELECT COUNT(*) c FROM bookings WHERE schedule_id = ? AND status = 'confirmed'")
    .get(row.id).c;
  const waitlist = getDb()
    .prepare("SELECT COUNT(*) c FROM bookings WHERE schedule_id = ? AND status = 'waitlisted'")
    .get(row.id).c;
  const available = Math.max(0, row.capacity - confirmed - waitlist);
  const storedStatus = row.status;
  const derivedStatus =
    storedStatus === 'expired' ? 'expired'
    : available <= 0 ? (waitlist > 0 ? 'waitlist' : 'full')
    : 'active';
  return {
    ...row,
    confirmedCount: confirmed,
    waitlistCount: waitlist,
    availableSeats: available,
    status: derivedStatus,
  };
}