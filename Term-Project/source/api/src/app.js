import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { config } from './config.js';
import campusRoutes from './routes/campusRoutes.js';
import scheduleRoutes from './routes/scheduleRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';

export function createApp() {
  const app = express();

  // ① CORS — dev uses (frontend 5173 calls API 3001 across ports)
  app.use(cors({ origin: config.corsOrigin }));

  // ② logging
  if (config.env !== 'test') app.use(morgan(config.isProd ? 'combined' : 'dev'));

  // ③ JSON body (10kb limit)
  app.use(express.json({ limit: '10kb' }));

  // ④ routes — everything under /api
  app.get('/api', (req, res) => {
    res.json({ message: 'RMUTL Shuttle Booking API is running', version: '4.0.0' });
  });
  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/campuses', campusRoutes);
  app.use('/api/schedules', scheduleRoutes);
  app.use('/api/bookings', bookingRoutes);

  // ⑤ หน้าแรก / — ขึ้นกับสภาพแวดล้อม (CP39)
  if (config.isProd && existsSync(config.staticDir)) {
    // production: API เสิร์ฟหน้าเว็บที่ build แล้ว → ผู้ใช้เปิด URL เดียวได้ทั้งเว็บและ API
    app.use(express.static(config.staticDir));
    // ทุก path ที่ไม่ขึ้นต้นด้วย /api → คืน index.html ให้ React Router จัดการต่อ
    app.get(/^\/(?!api).*/, (req, res) => {
      res.sendFile(path.join(config.staticDir, 'index.html'));
    });
  } else {
    // development: หน้าเว็บอยู่ที่ Vite (พอร์ต 5173) · / ของ API ตอบข้อความบอกทางแทน
    app.get('/', (req, res) => {
      res.json({ message: 'RMUTL Shuttle API (dev) — หน้าเว็บอยู่ที่ Vite พอร์ต 5173', api: '/api' });
    });
  }

  // ⑥ ปิดท้าย — ต้องอยู่หลังสุดเสมอ
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
