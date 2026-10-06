import { apiFetch } from './apiClient.js';

export function login(credentials) {
  return apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
}
