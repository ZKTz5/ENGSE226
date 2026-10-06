# RMUTL Shuttle — Vehicle Request System

ระบบรับคำขอใช้รถระหว่าง **เจ็ดยอด (Jed Yod)** และ **ดอยสะเก็ด (Doi Saket)** เท่านั้น รถมีฐานประจำที่เจ็ดยอด ผู้ใช้ระบุวันและเวลาที่ต้องการเดินทาง ส่งคำขอ แล้วติดตามสถานะได้ คำขอใหม่เริ่มเป็น `PENDING`; การส่งคำขอไม่ใช่การอนุมัติให้ใช้รถ

สถาปัตยกรรมเดิมยังคงอยู่: React/Vite → Express API → SQLite/libsql, ใช้ JWT สำหรับ session และ scrypt สำหรับ password hash

## User workflow

เข้าสู่ระบบ → เปิด “ขอใช้รถ” → เลือกเที่ยวเดียวหรือไป-กลับ → ระบุต้นทาง/ปลายทาง วันเวลา จำนวนผู้โดยสาร และวัตถุประสงค์ → ตรวจทาน → ส่งคำขอ (`PENDING`) → ติดตามใน “คำขอของฉัน” และดูรายละเอียด → ยกเลิกได้ขณะยัง `PENDING`.

สถานะที่ระบบเก็บ: `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`, `COMPLETED`. เจ้าหน้าที่ที่มี admin role สามารถตรวจ อนุมัติ/ไม่อนุมัติคำขอที่รอ และบันทึกว่าคำขอที่อนุมัติแล้วดำเนินการเสร็จ ผ่าน API ที่ตรวจ JWT role ฝั่ง server. การมอบหมายต้องใช้รถ active, ความจุพอ และช่วงเวลาไม่ทับกับงานอนุมัติอื่น. สำหรับเที่ยวเดียวที่ต้องการมอบหมายรถ ต้องระบุเวลาสิ้นสุดภารกิจ. ระบบไม่ติดตาม GPS.

## Login-only authentication

รับเฉพาะอีเมลที่ลงท้ายตรงตัวด้วย `@live.rmutl.ac.th` (ไม่แยกตัวพิมพ์เล็ก/ใหญ่) ไม่มี registration endpoint, หน้าสมัคร หรือ public self-signup. บัญชี demo มาจาก seed; ผู้ดูแลระบบสร้างบัญชีผ่าน script เท่านั้น

Seed credentials สำหรับ development/demo เท่านั้น:

- User: `tan.khanit@live.rmutl.ac.th` / `rmutl1234`
- Admin: `admin@live.rmutl.ac.th` / `rmutl1234`

## Setup and local run

ใช้ Node.js ตาม package engines (API `>=22.13.0`; frontend `>=22.12.0`). จากโฟลเดอร์ `source/`:

```bash
npm install --prefix api
npm install --prefix frontend
cp api/.env.example api/.env   # สำหรับค่าเฉพาะเครื่องพัฒนาเท่านั้น
npm run db:setup --prefix api
npm run dev --prefix api
```

เปิด terminal อีกหน้าต่าง:

```bash
npm run dev --prefix frontend
```

API ปกติอยู่ที่ `http://localhost:3001`; frontend Vite ที่ `http://localhost:5173`. กำหนด `VITE_API_BASE_URL` เมื่อ API อยู่คนละ URL จากค่า default. ห้าม commit `.env` หรือ secrets.

## Safe disposable database reset

คำสั่งตรวจสอบและทดลองที่ไม่แตะ `source/api/data/campus.db`:

```bash
DB_FILE=/tmp/rmutl-shuttle-requests.db npm run db:reset --prefix api
```

คำสั่งนี้สร้าง `users`, `vehicles`, `vehicle_requests` พร้อม seed users; fleet/request tables เริ่มว่าง. ห้ามชี้ไปยัง production หรือ user database. การ reset default DB ต้องหยุด API ก่อนและเป็นคำสั่ง explicit; `setup-db.mjs --force` ทำสำเนา timestamped backup ก่อนแทนไฟล์ แต่ reset จะสร้าง schema/seed ใหม่และไม่แปลง booking เก่าเป็นคำขอ เพราะข้อมูลเดิมไม่พอ. สำรองข้อมูลที่ต้องเก็บก่อน reset. API startup เพียงตรวจ schema ที่มีอยู่และไม่รัน schema SQL เพื่อแทนข้อมูล; หากยังไม่มี schema ต้องสั่ง `npm run db:setup --prefix api` อย่างชัดเจน. `DB_FILE` กำหนดไฟล์ และเมื่อไม่ตั้งค่าจะใช้ `source/api/data/campus.db`.

ปุ่ม Reset Data ใน admin ใช้ `POST /api/admin/reset-data` โดยต้องเป็น admin JWT และตั้ง `ENABLE_ADMIN_DATA_RESET=true` ใน environment ของ API; ค่าเริ่มต้นคือปิด รวมถึง production. การทำงานนี้ลบเฉพาะ request records ภายใน transaction และเก็บ users, password hashes, admin account, vehicles, schema และไฟล์ฐานข้อมูลไว้. หน้า admin ซ่อนปุ่มเมื่อ API แจ้งว่าฟีเจอร์ปิด.

เพิ่มบัญชีผู้ใช้/admin ผ่านเครื่องมือ operator:

```bash
npm run create-user --prefix api -- <email@live.rmutl.ac.th> <password> [name] [user|admin]
```

## Tests and build

จาก `source/`:

```bash
npm test
npm run check
npm run build
```

Backend ใช้ Vitest + Supertest integration tests; frontend ใช้ Vitest และ static route/flow checks. ดู `API_CONTRACT.md` สำหรับ contract ปัจจุบัน, `../REQUEST_WORKFLOW_MIGRATION.md` สำหรับเหตุผล/แผนย้ายโดเมน และ `../FINAL_AUDIT_REPORT.md` สำหรับผล verify ล่าสุด

## Production limitations

ยังไม่มีการ deploy หรือ persistent production database ที่ตรวจยืนยันแล้ว. ยังไม่มี live fleet registry seed; admin ต้องบันทึกรถจริงก่อนมอบหมาย. ไม่มี GPS tracking หรือ integration กับ dispatch/notification service. การแจ้งเตือนสถานะอาศัยผู้ใช้เปิด My Requests/refresh หน้า.
