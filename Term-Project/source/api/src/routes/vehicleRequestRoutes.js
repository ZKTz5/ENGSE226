import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as vehicleRequestService from '../services/vehicleRequestService.js';
import { validateVehicleRequest } from '../validators/requestValidator.js';

const router = Router();
router.use(authenticate);

router.post('/', (req, res) => {
  const { errors, value } = validateVehicleRequest(req.body);
  if (errors.length) {
    return res.status(400).json({ code: 'invalid_vehicle_request', error: 'Request details are invalid', details: errors });
  }
  const result = vehicleRequestService.createVehicleRequest(req.user.id, value);
  if (!result.ok) return res.status(result.status).json({ code: result.error, error: result.error });
  return res.status(201).json(result.request);
});

router.get('/my', (req, res) => res.json(vehicleRequestService.listRequestsByUser(req.user.id)));

router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(404).json({ code: 'request_not_found', error: 'Request not found' });
  const record = vehicleRequestService.getRequestForUser(id, req.user.id);
  if (!record) return res.status(404).json({ code: 'request_not_found', error: 'Request not found' });
  return res.json(record);
});

router.patch('/:id/cancel', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(404).json({ code: 'request_not_found', error: 'Request not found' });
  const result = vehicleRequestService.cancelOwnRequest(id, req.user.id);
  if (!result.ok) return res.status(result.status).json({ code: result.error, error: result.error });
  return res.json(result.request);
});

export default router;
