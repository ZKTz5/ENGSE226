import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as bookingService from '../services/bookingService.js';

const router = Router();

// Every booking endpoint requires a valid JWT.
router.use(authenticate);

// GET /api/bookings/my — the current user's bookings.
router.get('/my', (req, res) => {
  res.json(bookingService.listBookingsByUser(req.user.id));
});

// POST /api/bookings — { scheduleId } (or ?scheduleId=)
router.post('/', (req, res) => {
  const scheduleId = Number(req.body?.scheduleId ?? req.query?.scheduleId);
  if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
    return res.status(400).json({ error: 'กรุณาระบุ scheduleId' });
  }
  const result = bookingService.createBooking({ userId: req.user.id, scheduleId });
  if (!result.ok) {
    const message =
      result.error === 'expired_schedule' ? 'ตารางนี้หมดอายุแล้ว ไม่สามารถจองได้'
      : result.error === 'duplicate_booking' ? 'คุณจองตารางนี้แล้ว'
      : result.error ?? 'การจองไม่สำเร็จ';
    return res.status(result.status).json({ error: message });
  }
  res.status(201).json(result.booking);
});

// DELETE /api/bookings/:id — owner cancels their booking.
router.delete('/:id', (req, res) => {
  const bookingId = Number(req.params.id);
  const result = bookingService.cancelBooking(bookingId, { userId: req.user.id });
  if (!result.ok) {
    const message =
      result.error === 'already_cancelled' ? 'การจองนี้ถูกลบแล้ว'
      : result.error === 'forbidden' ? 'คุณไม่มีสิทธิ์ลบรายการนี้'
      : result.error ?? 'การลบไม่สำเร็จ';
    return res.status(result.status).json({ error: message });
  }
  res.status(200).json({
    cancelledId: result.cancelledId,
    promotedId: result.promotedId,
    availableSeats: result.availableSeats,
  });
});

// DELETE /api/bookings/:id/cancel-admin — admin cancels any booking (same handler, admin flag).
router.delete('/:id/cancel-admin', requireRole('admin'), (req, res) => {
  const bookingId = Number(req.params.id);
  const result = bookingService.cancelBooking(bookingId, { userId: null, isAdmin: true });
  if (!result.ok) {
    return res.status(result.status).json({ error: result.error ?? 'การลบไม่สำเร็จ' });
  }
  res.status(200).json({
    cancelledId: result.cancelledId,
    promotedId: result.promotedId,
    availableSeats: result.availableSeats,
  });
});

export default router;