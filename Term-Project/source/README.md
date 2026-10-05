# RMUTL Shuttle Booking System

ระบบค้นหาและจองรถรับส่งระหว่าง **เจ็ดยอด (Jed Yod)** และ **ดอยสะเก็ด (Doi Saket)** เท่านั้น ให้บริการได้ทั้งสองทิศทาง พัฒนาบน React/Vite, Express, SQLite/libsql, JWT และ scrypt

## ขอบเขตระบบ

- ค้นหาตารางรถด้วยต้นทาง ปลายทาง และวันที่; ต้นทางกับปลายทางต้องต่างกัน
- จอง ยกเลิก และดูคิวสำรองที่เลื่อนตาม FIFO
- เข้าสู่ระบบด้วยอีเมลที่ลงท้ายตรงตัวด้วย `@live.rmutl.ac.th` โดยไม่แยกตัวพิมพ์เล็ก/ใหญ่
- ระบบเป็น login-only ไม่มีหน้าสมัครสมาชิกหรือ public self-signup บัญชีมาจาก seed หรือผู้ดูแลสร้างผ่านเครื่องมือบัญชี
- ภาษาไทยเป็นค่าเริ่มต้นและสลับเป็น English ได้จากหน้าเว็บ

## ติดตั้งและเริ่มระบบในเครื่อง

ใช้ Node.js ตาม engines ใน package files (API ต้องการ `>=22.13.0`; frontend `>=22.12.0`). จากโฟลเดอร์ `source/`:

```bash
npm install --prefix api
npm install --prefix frontend
cp api/.env.example api/.env   # ตั้งค่าเฉพาะเครื่องพัฒนา หากยังไม่มีไฟล์
npm run db:setup --prefix api
npm run dev --prefix api
```

เปิด terminal อีกหน้าต่าง:

```bash
npm run dev --prefix frontend
```

ค่าเริ่มต้นคือ API `http://localhost:3001` และเว็บ Vite `http://localhost:5173` หากต้องเริ่ม backend/frontend คำสั่ง dev จะอ่าน `api/.env` และ frontend ใช้ `VITE_API_BASE_URL` เมื่อจำเป็น

### รีเซ็ตฐานข้อมูลพัฒนาอย่างปลอดภัย

สร้าง/รีเซ็ตฐานข้อมูลชั่วคราวโดยไม่แตะไฟล์ฐานข้อมูลเดิม:

```bash
DB_FILE=/tmp/rmutl-shuttle-dev.db npm run db:reset --prefix api
```

การ reset ฐานข้อมูลพัฒนาเริ่มต้นต้องหยุด API ก่อน แล้วค่อยใช้ `npm run db:reset --prefix api`; สคริปต์สำรองไฟล์เดิมเป็นชื่อ `.backup-<timestamp>` ก่อนแทนที่ ห้ามใช้คำสั่ง reset กับข้อมูล production หรือฐานข้อมูลผู้ใช้ที่ต้องเก็บไว้ สคริปต์เริ่มระบบจะไม่ลบหรือ migrate schema Campus Service เก่าโดยอัตโนมัติ

บัญชี seed สำหรับ demo ใช้รหัสผ่าน `rmutl1234` และอีเมล `@live.rmutl.ac.th` ใช้เฉพาะ development เท่านั้น ตัวอย่าง login: `tan.khanit@live.rmutl.ac.th`. ผู้ดูแลสร้างบัญชีได้ด้วย:

```bash
npm run create-user --prefix api -- <อีเมล@live.rmutl.ac.th> <รหัสผ่าน> [ชื่อ] [user|admin]
```

ไม่มี API สมัครสมาชิกสำหรับผู้ใช้ทั่วไป

## ตรวจสอบและ build

จาก `source/`:

```bash
npm test       # backend และ frontend
npm run check  # project/API/frontend structural checks
npm run build  # production Vite build และ API dependency install ตาม root script
```

ฐานทดสอบ backend ใช้ Vitest และ integration tests; frontend ใช้ Vitest. รายงาน audit พร้อมผลล่าสุดอยู่ที่ `../FINAL_AUDIT_REPORT.md`; ภาพรวม handoff อยู่ที่ `../AGENT_HANDOFF.md`.

## API หลัก

- `POST /api/auth/login`
- `GET /api/campuses`
- `GET /api/schedules?originId=&destinationId=&date=`
- `GET /api/schedules/:id`
- `POST /api/bookings` (JWT)
- `GET /api/bookings/my` (JWT)
- `DELETE /api/bookings/:id` (JWT เจ้าของรายการ)
- `GET /api/health`

รายละเอียดเพิ่มเติมดู `API_CONTRACT.md`. การจองและเลื่อน FIFO ใช้ transaction ใน SQLite.

## Production limitation

การ build และ local tests ผ่าน แต่ยังไม่มี production deployment หรือ persistent production database ที่ยืนยันแล้ว SQLite บน free ephemeral storage ไม่เหมาะกับข้อมูล booking ระยะยาว และยังไม่ได้ทดสอบ transaction concurrency บน remote database.
