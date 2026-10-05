import { Router } from 'express';
import * as authService from '../services/authService.js';
import { validateLoginInput } from '../validators/shuttleValidator.js';

const router = Router();

router.post('/login', (req, res) => {
  const errors = validateLoginInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ code: 'invalid_login_input', error: 'ข้อมูลเข้าสู่ระบบไม่ถูกต้อง', details: errors });
  }
  const result = authService.login(req.body.email, req.body.password);
  if (!result.ok) {
    const body =
      result.error === 'invalid_email_domain'
        ? { code: 'invalid_email_domain', error: 'อีเมลต้องลงท้ายด้วย @live.rmutl.ac.th' }
        : { code: 'invalid_credentials', error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' };
    return res.status(result.status).json(body);
  }
  res.status(200).json(result);
});

export default router;
