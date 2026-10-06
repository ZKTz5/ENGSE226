import { apiFetch } from './apiClient.js';

export function login(credentials) {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export function getCampuses() {
  return apiFetch('/api/campuses');
}

export function getSchedules(filters = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  }
  const suffix = query.size ? `?${query.toString()}` : '';
  return apiFetch(`/api/schedules${suffix}`);
}

export function getSchedule(scheduleId) {
  return apiFetch(`/api/schedules/${encodeURIComponent(scheduleId)}`);
}

export function getMyBookings() {
  return apiFetch('/api/bookings/my');
}

export function createBooking(scheduleId) {
  return apiFetch('/api/bookings', {
    method: 'POST',
    body: JSON.stringify({ scheduleId }),
  });
}

export function cancelBooking(bookingId) {
  return apiFetch(`/api/bookings/${encodeURIComponent(bookingId)}`, { method: 'DELETE' });
}
