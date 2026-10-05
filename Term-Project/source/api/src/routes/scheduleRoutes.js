import { Router } from 'express';
import * as scheduleService from '../services/scheduleService.js';
import { validateScheduleFilters } from '../validators/shuttleValidator.js';

const router = Router();

// GET /api/schedules?originId=&destinationId=&date=
router.get('/', (req, res) => {
  const { errors, filters } = validateScheduleFilters(req.query);
  if (errors.length) {
    return res.status(400).json({ code: 'invalid_schedule_filters', error: 'Invalid schedule filters', details: errors });
  }
  res.json(scheduleService.getScheduleList(filters));
});

// GET /api/schedules/:id
router.get('/:id', (req, res) => {
  const found = scheduleService.getScheduleById(Number(req.params.id));
  if (!found) return res.status(404).json({ code: 'schedule_not_found', error: 'ไม่พบตาราง' });
  res.json(found);
});

export default router;
