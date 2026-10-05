# RMUTL Shuttle Booking System

ระบบค้นหาเที่ยวรถและจองรถรับส่งระหว่างวิทยาเขต · **React + Express API + SQLite**

## สถาปัตยกรรม 3 ชั้น

```
┌─────────────┐   HTTP    ┌──────────────┐   SQL    ┌───────────┐
│  React      │ ────────► │  Express API │ ───────► │  SQLite   │
│  (frontend) │ ◄──────── │  (api)       │ ◄─────── │  campus.db│
└─────────────┘   JSON    └──────────────┘   rows   └───────────┘
   พอร์ต 5173              พอร์ต 3001              ไฟล์ในเครื่อง
```

| ชั้น | หน้าที่ | โฟลเดอร์ |
|---|---|---|
| Frontend | หน้าจอผู้ใช้ · เรียก API | `frontend/` |
| API | auth · campus · schedule · booking routes/services | `api/src/` |
| Database | เก็บบัญชีผู้ใช้ · วิทยาเขต · ตารางรถ · การจอง | `api/data/campus.db` |

## วิธีรัน (development)

```bash
# ชั้นฐานข้อมูล + API
cd api
npm install
cp .env.example .env
npm run db:setup      # สร้าง campus.db จาก schema.sql
npm run dev           # API ที่ http://localhost:3001

# ชั้น frontend (อีก terminal)
cd frontend
npm install
npm run dev           # React ที่ http://localhost:5173
```

## วิธีรัน (production)

```bash
# build แบบเดียวกับ cloud (script อยู่ใน package.json ระดับบนสุด)
NODE_ENV=production npm install
NODE_ENV=production npm run build

# start — เสิร์ฟทั้งหน้าเว็บและ API จากพอร์ตเดียว (สัปดาห์ 13: production ต้องตั้ง JWT_SECRET ไม่งั้นไม่ยอม start)
NODE_ENV=production JWT_SECRET=<ค่าสุ่ม> PORT=10000 npm start
# เปิด http://localhost:10000
```

| ไฟล์ | ทำให้ production ทำงานอย่างไร |
|---|---|
| `frontend/.env.production` | `VITE_API_BASE_URL=` ว่าง → frontend เรียก `/api/...` บนโดเมนเดียวกัน |
| `api/src/app.js` | production เสิร์ฟ `frontend/dist` · path ที่ไม่ใช่ `/api` ได้ index.html |
| `package.json` | `build` ใช้ `--include=dev` เพราะ cloud ตั้ง NODE_ENV=production ตั้งแต่ build |

## Live Demo

🔗 (ใส่ URL หลัง deploy ขึ้น Render)

หมายเหตุ: Render free tier — เปิดครั้งแรกช้า 30–60 วินาที · ข้อมูลที่เพิ่มจะกลับเป็นค่าตั้งต้นเมื่อ restart

## ตรวจสุขภาพระบบ

```bash
curl http://localhost:3001/api/health
# { "status": "ok", "env": "...", "database": { "connected": true, ... } }
```

## Environment Variables

| ตัวแปร | ค่าเริ่มต้น | ความหมาย |
|---|---|---|
| `NODE_ENV` | development | สภาพแวดล้อม |
| `PORT` | 3001 | พอร์ต API |
| `CORS_ORIGIN` | http://localhost:5173 | ที่อยู่ frontend ที่อนุญาต |
| `DB_FILE` | api/data/campus.db | ไฟล์ฐานข้อมูล |
| `JWT_SECRET` | (dev: ค่าสำหรับพัฒนา) | secret สำหรับเซ็น JWT · production ไม่ตั้ง = ไม่ยอม start |

## API Endpoints

ดู `API_CONTRACT.md` สำหรับรายละเอียดครบ · สรุป: `/api/auth`, `/api/campuses`, `/api/schedules`, `/api/bookings`, `/api/health`

## การตัดสินใจด้านการออกแบบ

- **แยก 3 ชั้นชัดเจน** — เปลี่ยนแหล่งข้อมูลได้โดยกระทบชั้นเดียว (พิสูจน์มา 4 ครั้งใน Week 05–10)
- **เลือก SQLite** — ข้อมูลมีโครงและความสัมพันธ์ชัด · ดู `DATABASE_CHOICES.md`
- **config รวมศูนย์** — ไม่ hardcode · แยก dev/production ด้วย `NODE_ENV`

## การทดสอบ (สัปดาห์ 12)

```bash
npm install --prefix api && npm install --prefix frontend
npm test                 # api (Vitest) + frontend (Vitest)
npm run coverage         # รายงานว่าบรรทัดไหนยังไม่มี test วิ่งผ่าน → api/coverage/index.html
```

| โฟลเดอร์ | ชนิด test | ทดสอบอะไร |
|---|---|---|
| `api/tests/unit/` | unit | pure function เช่น `validators/shuttleValidator.js` — ไม่ต้องเปิด server |
| `api/tests/integration/` | integration | ยิง HTTP จริงผ่านทุกชั้น ด้วย supertest บนฐานข้อมูลในหน่วยความจำ (`DB_FILE=:memory:`) |
| `frontend/src/**/*.test.js` | unit | pure function ฝั่ง React เช่น `utils/requestSummary.js` |

หลักฐานการไล่ปัญหา: `BUG_REPORTS.md` (อาการที่ผู้ใช้แจ้ง) · `DEBUG_LOG.md` (สาเหตุและวิธีแก้) · `TEST_CASES.md` (ตารางกรณีทดสอบ)


## ความปลอดภัย (สัปดาห์ 13)

| เรื่อง | ไฟล์ |
|---|---|
| validation login และตัวกรองตารางรถ · body ≤ 10kb | `api/src/validators/shuttleValidator.js` · `api/src/app.js` |
| รหัสผ่านเก็บเป็น hash (scrypt) | `api/src/utils/password.js` |
| เข้าสู่ระบบด้วย JWT | `api/src/services/authService.js` · `POST /api/auth/login` |
| สิทธิ์: สร้างและดูการจองต้องใช้ JWT | `api/src/middleware/auth.js` · `api/src/routes/bookingRoutes.js` |
| secret มาจาก env · production ไม่มี secret = ไม่ start | `api/src/config.js` · `api/.env.example` |

บัญชีทดสอบใน schema ใช้รหัสผ่าน `rmutl1234` สำหรับ development เท่านั้น บัญชีต้องลงท้ายด้วย `@live.rmutl.ac.th`; แอปนี้เป็นระบบ login-only และไม่มีหน้าสมัครสมาชิกหรือ public self-signup
ก่อนใช้งานจริง ให้ตั้ง `JWT_SECRET` และให้ผู้ดูแลสร้างบัญชีด้วย `npm run create-user --prefix api -- <อีเมล@live.rmutl.ac.th> <รหัสผ่าน> [ชื่อ] [user|admin]`.

```bash
curl -X POST localhost:3001/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"tan.khanit@live.rmutl.ac.th","password":"rmutl1234"}'
# → { "token": "eyJ...", "user": { ... } }

curl 'localhost:3001/api/schedules?originId=1&destinationId=2'
```
