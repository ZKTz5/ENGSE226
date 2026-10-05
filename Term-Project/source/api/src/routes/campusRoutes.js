import { Router } from 'express';
import * as scheduleService from '../services/scheduleService.js';

const router = Router();

// Public reference data.
router.get('/', (req, res) => {
  res.json(scheduleService.getCampuses());
});

export default router;