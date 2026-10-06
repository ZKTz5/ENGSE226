import { Router } from 'express';
import { listLocations } from '../services/vehicleRequestService.js';

const router = Router();
router.get('/', (_req, res) => res.json(listLocations()));
export default router;
