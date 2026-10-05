import { Router } from 'express';
import * as scheduleService from '../services/scheduleService.js';

const router = Router();

// GET /api/schedules?originId=&destinationId=&date=
router.get('/', (req, res) => {
  const { originId, destinationId, date } = req.query;
  res.json(scheduleService.getScheduleList({ originId, destinationId, date }));
});

// GET /api/schedules/:id
router.get('/:id', (req, res) => {
  const found = scheduleService.getScheduleById(Number(req.params.id));
  if (!found) return res.status(404).json({ error: 'ไม่พบตาราง' });
  res.json(found);
});

export default router;