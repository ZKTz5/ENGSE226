import { apiFetch } from './apiClient.js';

export function getLocations() {
  return apiFetch('/api/locations');
}

export function createVehicleRequest(input) {
  return apiFetch('/api/vehicle-requests', { method: 'POST', body: JSON.stringify(input) });
}

export function getMyVehicleRequests() {
  return apiFetch('/api/vehicle-requests/my');
}

export function getVehicleRequest(id) {
  return apiFetch(`/api/vehicle-requests/${encodeURIComponent(id)}`);
}

export function cancelVehicleRequest(id) {
  return apiFetch(`/api/vehicle-requests/${encodeURIComponent(id)}/cancel`, { method: 'PATCH' });
}

export function getAdminVehicleRequests(status) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiFetch(`/api/admin/vehicle-requests${query}`);
}

export function getAdminVehicleRequest(id) {
  return apiFetch(`/api/admin/vehicle-requests/${encodeURIComponent(id)}`);
}

export function resetAdminRequestData(confirmation) {
  return apiFetch('/api/admin/reset-data', { method: 'POST', body: JSON.stringify({ confirmation }) });
}

export function getAdminResetAvailability() {
  return apiFetch('/api/admin/reset-data');
}

export function getAdminVehicles() {
  return apiFetch('/api/admin/vehicles');
}

export function createAdminVehicle(input) {
  return apiFetch('/api/admin/vehicles', { method: 'POST', body: JSON.stringify(input) });
}

export function setAdminVehicleActive(id, active) {
  return apiFetch(`/api/admin/vehicles/${encodeURIComponent(id)}/active`, {
    method: 'PATCH', body: JSON.stringify({ active }),
  });
}

export function approveVehicleRequest(id, assignedVehicleId = null) {
  return apiFetch(`/api/admin/vehicle-requests/${encodeURIComponent(id)}/approve`, {
    method: 'PATCH', body: JSON.stringify({ assignedVehicleId }),
  });
}

export function rejectVehicleRequest(id, rejectionReason) {
  return apiFetch(`/api/admin/vehicle-requests/${encodeURIComponent(id)}/reject`, {
    method: 'PATCH', body: JSON.stringify({ rejectionReason }),
  });
}

export function completeVehicleRequest(id) {
  return apiFetch(`/api/admin/vehicle-requests/${encodeURIComponent(id)}/complete`, { method: 'PATCH' });
}
