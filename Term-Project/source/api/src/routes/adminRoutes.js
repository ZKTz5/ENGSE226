import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as vehicleRequestService from '../services/vehicleRequestService.js';
import { REQUEST_STATUSES, validateRejectionReason, validateVehicleInput } from '../validators/requestValidator.js';

const router = Router();
router.use(authenticate, requireRole('admin'));

router.get('/vehicle-requests', (req, res) => {
  const status = req.query.status;
  if (status !== undefined && !REQUEST_STATUSES.includes(status)) {
    return res.status(400).json({ code: 'invalid_status_filter', error: 'Invalid request status filter' });
  }
  return res.json(vehicleRequestService.listAdminRequests(status));
});

router.get('/vehicles', (_req, res) => res.json(vehicleRequestService.listVehicles()));

router.post('/vehicles', (req, res) => {
  const { errors, value } = validateVehicleInput(req.body);
  if (errors.length) return res.status(400).json({ code: 'invalid_vehicle', error: 'Vehicle details are invalid', details: errors });
  const result = vehicleRequestService.createVehicle(value);
  if (!result.ok) return res.status(result.status).json({ code: result.error, error: result.error });
  return res.status(201).json(result.vehicle);
});

router.patch('/vehicles/:id/active', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0 || typeof req.body?.active !== 'boolean') {
    return res.status(400).json({ code: 'invalid_vehicle_state', error: 'A positive vehicle ID and boolean active value are required' });
  }
  const result = vehicleRequestService.setVehicleActive(id, req.body.active);
  if (!result.ok) return res.status(result.status).json({ code: result.error, error: result.error });
  return res.json(result.vehicle);
});

router.patch('/vehicle-requests/:id/approve', (req, res) => {
  const id = Number(req.params.id);
  const rawVehicleId = req.body?.assignedVehicleId;
  const assignedVehicleId = rawVehicleId == null || rawVehicleId === '' ? null : Number(rawVehicleId);
  if (!Number.isSafeInteger(id) || id <= 0 || (assignedVehicleId !== null && (!Number.isSafeInteger(assignedVehicleId) || assignedVehicleId <= 0))) {
    return res.status(400).json({ code: 'invalid_approval_input', error: 'Invalid request or vehicle ID' });
  }
  const result = vehicleRequestService.approveRequest(id, assignedVehicleId);
  if (!result.ok) return res.status(result.status).json({ code: result.error, error: result.error });
  return res.json(result.request);
});

router.patch('/vehicle-requests/:id/reject', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ code: 'invalid_request_id', error: 'Invalid request ID' });
  const { errors, value } = validateRejectionReason(req.body);
  if (errors.length) return res.status(400).json({ code: 'rejection_reason_required', error: 'A rejection reason is required' });
  const result = vehicleRequestService.rejectRequest(id, value);
  if (!result.ok) return res.status(result.status).json({ code: result.error, error: result.error });
  return res.json(result.request);
});

router.patch('/vehicle-requests/:id/complete', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ code: 'invalid_request_id', error: 'Invalid request ID' });
  const result = vehicleRequestService.completeRequest(id);
  if (!result.ok) return res.status(result.status).json({ code: result.error, error: result.error });
  return res.json(result.request);
});

export default router;
