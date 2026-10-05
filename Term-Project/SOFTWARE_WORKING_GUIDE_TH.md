# คู่มือทำความเข้าใจซอฟต์แวร์ RMUTL Shuttle

เอกสารนี้อธิบายโค้ดใน repository ปัจจุบันสำหรับสมาชิกทั้งสี่บทบาท ใช้ระบบ request-based: ผู้ใช้ระบุเวลาที่ต้องการเดินทางระหว่างเจ็ดยอดและดอยสะเก็ด แล้วส่งคำขอซึ่งเริ่มเป็น `PENDING` การส่งคำขอยังไม่ใช่การอนุมัติ รถมีฐานประจำที่เจ็ดยอด ไม่มีตารางเดินรถประจำ ไม่มีการจองที่นั่ง/คิวผู้โดยสาร และไม่มี GPS

## ภาพรวมสถาปัตยกรรม

```text
React + Vite (HashRouter)
        │ JSON + Bearer JWT
        ▼
Express API: routes → validators/services → SQLite (libsql)
        │
        └── signed JWT; password hashes use scrypt
```

Frontend แสดงข้อมูลและส่งคำขอผ่าน API client; ไม่เป็นผู้ตัดสิน ownership, สถานะ, หรือสิทธิ์ admin. Express ตรวจ token/role และข้อมูล จากนั้น service ทำกฎธุรกิจและเรียก SQLite. ตารางหลักคือ `users`, `vehicles`, `vehicle_requests`.

### ลำดับสำคัญของข้อมูล

- **เข้าสู่ระบบ:** Login page ส่งอีเมล/รหัสผ่าน → `POST /api/auth/login` ตรวจโดเมนและ scrypt → API คืน JWT กับ user → AuthContext เก็บ token ในหน่วยความจำ → API client แนบ Bearer token. โหลดหน้าใหม่แล้ว session ในหน่วยความจำสิ้นสุด.
- **ส่งคำขอ:** แบบฟอร์มตรวจข้อมูลในหน้าเว็บ → ผู้ใช้ตรวจทาน → กดส่ง → API ตรวจอีกครั้งและระบุผู้ใช้จาก JWT → service สร้างคำขอ `PENDING` → SQLite บันทึก → ticket แสดงผลตอบกลับจริง.
- **สถานะคำขอ:** `PENDING` → ผู้ใช้ยกเลิกเป็น `CANCELLED`, หรือเจ้าหน้าที่อนุมัติเป็น `APPROVED`, หรือปฏิเสธเป็น `REJECTED`; คำขอที่อนุมัติแล้วอาจถูกเจ้าหน้าที่บันทึกเป็น `COMPLETED`. API ป้องกันการเปลี่ยนสถานะผิดลำดับ.
- **ยกเลิก:** ผู้ใช้เจ้าของคำขอส่ง cancel ได้เฉพาะ `PENDING`; record ยังคงอยู่ในประวัติ.
- **ตรวจอนุมัติ:** middleware ตรวจ JWT และ role `admin` ที่ลงนามโดย server. Admin อนุมัติโดยไม่กำหนดรถได้; ถ้ามอบหมายรถ ต้องเป็นรถ active ความจุพอ และมีช่วงเวลาให้ตรวจการทับซ้อน. การตรวจ overlap กับการเปลี่ยนสถานะทำใน transaction. ปฏิเสธต้องมีเหตุผล.

## บทบาท 1: Product Owner / Lead

### 1. หน้าที่ของบทบาท

กำหนดเป้าหมายและขอบเขตระบบ รับรอง user flow และ acceptance criteria สรุป Sprint 1–4 ประเมินข้อจำกัด/ความพร้อมส่งมอบ และประสาน handoff ระหว่าง Frontend, Backend และ QA.

### 2. ส่วนของระบบที่เกี่ยวข้อง

เอกสารหลักคือ `AGENT_HANDOFF.md`, `FINAL_AUDIT_REPORT.md`, `REQUEST_WORKFLOW_MIGRATION.md`, `source/README.md` และ `PRESENTATION_SCRIPT_TH.md`.

### 3. หลักการทำงาน

ขอบเขตธุรกิจคือรับคำขอใช้รถระหว่างสองจุด ไม่ใช่เลือกเที่ยวรถประจำ. ผู้ใช้ระบุเที่ยวเดียวหรือไป-กลับ วันที่เวลา จำนวนผู้โดยสาร และวัตถุประสงค์ แล้วตรวจทานก่อนส่ง. Request ใหม่ต้องเป็น `PENDING`; approval เป็นการตัดสินใจของเจ้าหน้าที่ที่ได้รับสิทธิ์. ข้อมูลที่ไม่มีจริง เช่น ตำแหน่ง GPS หรือรถที่ยังไม่ได้ลงทะเบียน ห้ามนำเสนอเหมือนมีอยู่.

### 4. ลำดับการไหลของข้อมูล

รับความต้องการ → เขียน acceptance criteria → ส่ง API contract และข้อความ/สถานะให้ Frontend กับ Backend → QA ทดสอบ flow และข้อผิดพลาด → ตรวจผล build/test/limitations → เตรียม demo ด้วยฐานข้อมูล disposable.

### 5. ไฟล์และโฟลเดอร์หลัก

- `REQUEST_WORKFLOW_MIGRATION.md` — วิเคราะห์และบันทึกการเปลี่ยนโมเดล
- `AGENT_HANDOFF.md` — สถานะสำหรับผู้รับช่วง
- `FINAL_AUDIT_REPORT.md` — checklist, verification, demo และข้อจำกัด
- `source/API_CONTRACT.md` — contract ที่ frontend/backend ใช้ร่วมกัน
- `PRESENTATION_SCRIPT_TH.md` — บทนำเสนอภาษาไทย

### 6. วิธีรันและตรวจสอบ

จาก `source/` ใช้ `npm test`, `npm run check`, `npm run build`. เริ่ม API และ frontend ด้วยคำสั่งในส่วนรันทดสอบด้านล่าง. ใช้เฉพาะฐานข้อมูลทดลอง; อย่า reset ฐานข้อมูลผู้ใช้หรือ production.

### 7. ปัญหาที่พบบ่อย

- ถ้าผู้ใช้เข้าใจว่า PENDING คืออนุมัติ ให้ชี้แจงว่าเป็นเพียงระบบรับคำขอ.
- ถ้า demo ไม่พบรถ ให้ตรวจว่า admin ได้ลงทะเบียนรถในฐานข้อมูล disposable แล้ว; seed ไม่มี fleet.
- ถ้าข้อมูลเก่ามี booking อย่าแปลงเป็น request โดยเดา purpose หรือช่วงเวลา.
- การผ่าน test/build ไม่ได้ยืนยัน production deployment หรือ browser E2E.

### 8. สิ่งที่ควรอธิบายตอนนำเสนอ

อธิบายเหตุผลที่ใช้ request workflow, acceptance criteria, บทบาทผู้ใช้กับผู้อนุมัติ, ผล verification ที่รันจริง และข้อจำกัด เช่นไม่มี GPS/notification/production deployment.

### 9. การส่งต่องานให้บทบาทอื่น

ส่ง flow, สถานะที่อนุญาต, validation criteria และ API contract ให้ Frontend/Backend; ส่ง scenarios รวม failure cases และผลที่คาดหวังให้ QA. รับผลทดสอบและข้อจำกัดกลับมาปรับ acceptance/audit.

## บทบาท 2: Frontend Developer

### 1. หน้าที่ของบทบาท

ดูแล React UI, routing, form, API integration, localization, loading/empty/error/success states และ responsive behavior.

### 2. ส่วนของระบบที่เกี่ยวข้อง

โค้ดอยู่ที่ `source/frontend/src/`; application entry คือ `main.jsx`/`App.jsx`, route pages อยู่ใน `pages/`, shared UI ใน `components/`, context ใน `contexts/`, API access ใน `services/`, คำแปลใน `i18n/`, theme ใน `styles.css`.

### 3. หลักการทำงาน

ใช้หน้าเดียวร่วมกันทั้งไทย/อังกฤษผ่าน LanguageContext และ dictionary; ไทยเป็นค่าเริ่มต้น. API response เป็นแหล่งข้อมูลสถานะและ assignment. JWT ส่งผ่าน API client แต่ backend เป็นผู้ตรวจสิทธิ์. หน้าสำเร็จแสดงหลัง API ตอบสำเร็จเท่านั้น. Guide เปิดเมื่อผู้ใช้เลือก ไม่ใช่ onboarding บังคับ.

### 4. ลำดับการไหลของข้อมูล

`App.jsx` จัด routes → `AppLayout` แสดง nav/outlet → page รวบรวม/ตรวจ form → `vehicleRequestService.js` เรียก API client → page แสดง loading/error/result → My Requests/Detail ขอข้อมูลจาก endpoint owner-scoped. Admin page แสดง controls ตาม role แต่ role check ของ browser เป็น usability בלבד; server authorization เป็น security boundary.

### 5. ไฟล์และโฟลเดอร์หลัก

- `source/frontend/src/App.jsx` — active routes
- `pages/LoginPage.jsx`, `DashboardPage.jsx`, `NewRequestPage.jsx`, `MyRequestsPage.jsx`, `RequestDetailPage.jsx`, `AdminRequestsPage.jsx`, `UserGuidePage.jsx`
- `components/AppHeader.jsx`, `VehicleRequestCard.jsx`, `RequestSubmissionTicket.jsx`
- `services/authService.js`, `services/vehicleRequestService.js`
- `contexts/AuthContext.jsx`, `LanguageContext.jsx`; `i18n/translations.js`
- `utils/vehicleRequestForm.js`; `styles.css`

### 6. วิธีรันและตรวจสอบ

จาก `source/`: `npm install --prefix frontend`, `npm run dev --prefix frontend`; test ด้วย `npm test --prefix frontend`, ตรวจ static flow ด้วย `npm run check --prefix frontend`, production build ด้วย `npm run build --prefix frontend`. API ต้องทำงานที่ URL ที่ตั้งไว้ใน `VITE_API_BASE_URL` (ค่าเริ่มต้น localhost:3001).

### 7. ปัญหาที่พบบ่อย

- Network/API error: ตรวจ API process, base URL, CORS และว่า API ใช้ schema request ใหม่.
- Login หายหลัง reload: token เก็บใน memory ตาม implementation ปัจจุบัน; เข้าระบบใหม่.
- รายการว่าง: เป็น empty state ปกติสำหรับบัญชีที่ยังไม่มีคำขอ.
- แสดงรถ/เหตุผลปฏิเสธไม่ตรง: UI ต้อง render เฉพาะ field ที่ API ส่งมาจริง.
- วันเวลาไม่ผ่าน: ต้องเป็นเวลาอนาคต; ไป-กลับต้องมี return หลัง departure.

### 8. สิ่งที่ควรอธิบายตอนนำเสนอ

ชี้เส้นทางหน้าเว็บ, วิธีตรวจทานก่อนส่ง, Thai/English switch, feedback ระหว่างเรียก API, My Requests/detail และการแสดง PENDING โดยไม่เรียกว่าอนุมัติ.

### 9. การส่งต่องานให้บทบาทอื่น

แจ้ง Backend เมื่อ payload/error code/response ไม่ตรง `source/API_CONTRACT.md`; ส่ง acceptance scenarios และ UI states ให้ QA; รายงาน Product Owner เมื่อข้อความหรือ flow ขัดกับ business rule.

## บทบาท 3: Backend Developer

### 1. หน้าที่ของบทบาท

ดูแล Express API, SQLite schema, JWT/password verification, domain validation, ownership, cancellation, admin approval boundary และ request/vehicle rules.

### 2. ส่วนของระบบที่เกี่ยวข้อง

โค้ด API อยู่ที่ `source/api/src/`; schema/seed อยู่ที่ `source/api/data/schema.sql`; scripts และ tests อยู่ที่ `source/api/scripts/`, `source/api/tests/`.

### 3. หลักการทำงาน

Request đi qua route → auth/role middleware → validator/service → `shuttleDb.js`. API lấy user/role từ JWT đã verify; không tin userId/status/assignment จาก request body. Domain chỉ cho Jed Yod ↔ Doi Saket. `vehicle_requests` giữ lịch sử; không hard-delete qua API user. Approval và overlap check dùng SQLite transaction. Hiện có admin role an toàn ở server; không tạo quyền dựa trên frontend.

### 4. ลำดับการไหลของข้อมูล

Express nhận JSON → route áp middleware → validator kiểm fields → service kiểm state/ownership/business rules → transaction khi cần → SQLite → service tạo response → error middleware chuyển lỗi thành JSON/status nhất quán. Login xác thực email domain và scrypt hash trước khi ký JWT.

### 5. ไฟล์และโฟลเดอร์หลัก

- `source/api/src/server.js`, `app.js`, `config.js`
- `src/routes/authRoutes.js`, `locationRoutes.js`, `vehicleRequestRoutes.js`, `adminRoutes.js`
- `src/services/shuttleDb.js`, `vehicleRequestService.js`, `authService.js`
- `src/validators/authValidator.js`, `requestValidator.js`
- `src/middleware/` authentication, role, error handling
- `data/schema.sql`, `scripts/setup-db.mjs`, `scripts/create-user.mjs`
- `tests/integration/vehicleRequests.api.test.js`, `adminRequests.api.test.js`, `auth.api.test.js`; `tests/unit/requestValidator.test.js`, `shuttleDb.test.js`

### 6. วิธีรันและตรวจสอบ

จาก `source/`: ตั้งค่า local `.env` จาก `api/.env.example` หากจำเป็น, สร้าง schema ด้วย `npm run db:setup --prefix api`, เริ่มด้วย `npm run dev --prefix api`. ทดสอบด้วย `npm test --prefix api`; static check `npm run check --prefix api`.

### 7. ปัญหาที่พบบ่อย

- Database legacy: startup ไม่ควรลบหรือ reset อัตโนมัติ. ใช้ disposable `DB_FILE` และคำสั่ง reset ที่ระบุไว้; อย่าแตะ `campus.db` โดยไม่สำรอง/อนุมัติ.
- `401`: token ขาด/หมดอายุ/ไม่ถูกต้อง; `403`: ผู้ใช้ไม่ใช่ admin; request ที่ไม่เป็นเจ้าของตอบ 404.
- Assignment overlap: ตรวจว่าทั้งสองคำขอมีช่วงเวลาจำกัดและ query อยู่ใน transaction.
- รถไม่มีในรายการ: fleet seed ว่าง; admin ต้องบันทึกรถจริง.
- ไม่พบข้อมูลในตารางใหม่: ตรวจ `DB_FILE` และ schema ด้วยคำสั่ง database setup.

### 8. สิ่งที่ควรอธิบายตอนนำเสนอ

อธิบาย API boundary, signed JWT และ scrypt, validate ở frontend และ backend, `PENDING` ที่ server đặt, owner restriction, cancellation history, transaction chống assignment overlap, vàเหตุผลที่ไม่ migrate booking cũ bằngการเดา.

### 9. การส่งต่องานให้บทบาทอื่น

แจ้ง Frontend เรื่อง endpoint, payload, error code และ transition; ส่ง QA กฎ/กรณีขอบและ reset command; แจ้ง Product Owner เมื่อกฎธุรกิจต้องการช่วงเวลา/ข้อมูล/สิทธิ์ที่ยังไม่มี.

## บทบาท 4: QA & Test

### 1. หน้าที่ของบทบาท

ทดสอบ API/backend, frontend states, auth/domain validation, request lifecycle, ownership, cancellation, admin transition/overlap, production build และเก็บหลักฐานที่ตรวจซ้ำได้.

### 2. ส่วนของระบบที่เกี่ยวข้อง

Backend tests `source/api/tests/`; frontend tests อยู่ใกล้ service/util/page structure ใน `source/frontend/src/`; static check scripts อยู่ใน `source/api/scripts/check-project.mjs` และ `source/frontend/scripts/check-project.mjs`.

### 3. หลักการทำงาน

รักษา assertion ให้มีความหมาย; test data ใช้ DB แยก. ตรวจค่าจริงจาก response และ HTTP status. อย่ารายงาน smoke/build/deploy ว่าผ่านถ้าไม่ได้รัน. Test admin authorization ผ่าน API ไม่ใช่เพียงซ่อนปุ่ม.

### 4. ลำดับการไหลของข้อมูล

Reset DB disposable → เริ่ม API → integration test ส่ง HTTP request → ตรวจ status/body/database outcome → รัน frontend test/check/build → เก็บคำสั่ง, exit status และผลสรุป → แจ้ง defect พร้อมขั้นตอนทำซ้ำ.

### 5. ไฟล์และโฟลเดอร์หลัก

- Backend: `source/api/tests/integration/auth.api.test.js`, `vehicleRequests.api.test.js`, `adminRequests.api.test.js`; `tests/unit/requestValidator.test.js`, `shuttleDb.test.js`
- Frontend: `src/utils/vehicleRequestForm.test.js`, `src/services/vehicleRequestService.test.js`, `src/i18n/translations.test.js`, `src/pages/requestWorkflowStructure.test.js`
- Checkers: `source/api/scripts/check-project.mjs`, `source/frontend/scripts/check-project.mjs`

### 6. วิธีรันและตรวจสอบ

จาก `source/`:

```bash
npm test
npm run check
npm run build
DB_FILE=/tmp/rmutl-shuttle-requests.db npm run db:reset --prefix api
```

ณ รอบ audit ที่บันทึกไว้ `npm test` ผ่าน backend 52 tests/7 files และ frontend 19 tests/5 files; check ผ่าน API 4/4 และ frontend 7/7; build ผ่าน. รันใหม่ก่อนส่งมอบหาก source เปลี่ยน.

### 7. ปัญหาที่พบบ่อย

- API test พังเพราะ schema เก่า: ใช้ DB disposable และตรวจ env ชี้ไปยังไฟล์นั้น.
- `401/403/404` ที่คาดไม่ตรง: ตรวจ token, role, owner และ ID fixture.
- เวลา test ไม่นิ่ง: ใช้วันที่อนาคตและ ISO datetime ที่สร้างใกล้เวลารันทดสอบ.
- Frontend static check ผ่านไม่ได้ยืนยัน visual browser behavior; ไม่มี browser E2E ใน repo ที่ตรวจนี้.
- Build fail แต่ unit tests ผ่าน: ตรวจ Vite compile/import/dependency separately.

### 8. สิ่งที่ควรอธิบายตอนนำเสนอ

สรุป auth/validation, one-way/round-trip, ownership, cancellation retention, admin guard, overlap test, language/build checks. แยกผลที่รันจริงจากข้อจำกัดที่ยังไม่ได้ทดสอบ production/browser.

### 9. การส่งต่องานให้บทบาทอื่น

รายงาน Frontend/Backend ด้วย test name, command, expected/actual และ reproduction steps; ส่ง Product Owner เฉพาะผลกระทบ acceptance/readiness; เก็บหลักฐานและ environment/database ที่ใช้.

## API endpoint reference

Contract ฉบับเต็มอยู่ใน `source/API_CONTRACT.md`.

| Method | Endpoint | สิทธิ์ / ความหมาย |
|---|---|---|
| `GET` | `/api/health` | Public health check |
| `POST` | `/api/auth/login` | Login; exact `@live.rmutl.ac.th` domain |
| `GET` | `/api/locations` | สองจุดบริการ |
| `POST` | `/api/vehicle-requests` | ผู้ใช้ที่ login; สร้าง PENDING |
| `GET` | `/api/vehicle-requests/my` | ผู้ใช้ที่ login; รายการของตน |
| `GET` | `/api/vehicle-requests/:id` | ผู้ใช้เจ้าของคำขอ |
| `PATCH` | `/api/vehicle-requests/:id/cancel` | เจ้าของ; เฉพาะ PENDING |
| `GET` | `/api/admin/vehicle-requests` | Admin; review queue/filter |
| `GET`, `POST` | `/api/admin/vehicles` | Admin; ดู/ลงทะเบียนรถจริง |
| `PATCH` | `/api/admin/vehicles/:id/active` | Admin; เปิด/ปิดรถ |
| `PATCH` | `/api/admin/vehicle-requests/:id/approve` | Admin; อนุมัติและเลือก assignment แบบ optional |
| `PATCH` | `/api/admin/vehicle-requests/:id/reject` | Admin; ต้องส่ง rejection reason |
| `PATCH` | `/api/admin/vehicle-requests/:id/complete` | Admin; จบคำขอ APPROVED |

## ตารางฐานข้อมูล

| ตาราง | เนื้อหา |
|---|---|
| `users` | ชื่อ, unique email, role, scrypt password hash, วันที่สร้าง |
| `vehicles` | รหัสรถ, ความจุ, ฐาน Jed Yod, active, timestamps |
| `vehicle_requests` | เจ้าของ, เส้นทาง, trip type, เวลา, passengers, purpose/note, status, optional vehicle/rejection reason, timestamps |

## คำสั่งรันและหลักฐานตรวจสอบ

จาก `source/`, ใช้ terminal แยกกัน:

```bash
npm run dev --prefix api
npm run dev --prefix frontend
```

API ปกติ `http://localhost:3001`, frontend `http://localhost:5173`. Verification commands: `npm test`, `npm run check`, `npm run build`. Disposable reset: `DB_FILE=/tmp/rmutl-shuttle-requests.db npm run db:reset --prefix api`. คำสั่ง reset สำรอง target ที่มีอยู่ก่อนแทนไฟล์; ห้ามชี้ไปยัง production/user DB. Seed มี 10 บัญชี demo และไม่มีรถ/คำขอ. รหัส demo `rmutl1234` ใช้เฉพาะ development.

## ข้อจำกัดที่ต้องสื่อสาร

ยังไม่ได้ deploy หรือทดสอบ persistent production DB; ยังไม่มี fleet จริง, GPS, dispatch integration, email/push notification, หรือ browser E2E. ผู้ใช้ตรวจสถานะโดยเปิด My Requests. Admin approval มี authorization ใน API แต่ production role provisioning และขั้นตอนปฏิบัติงานยังต้องกำหนด. ข้อมูล booking เก่าไม่ migrate เพราะข้อมูลวัตถุประสงค์และ service window ขาด.

## คำศัพท์ย่อ

- **API:** ช่องทางที่ frontend ขอ/ส่งข้อมูลไปยัง backend.
- **JWT:** token ที่ server ลงนาม ใช้ยืนยันตัวตนและ role.
- **scrypt:** วิธี derive/hash password ที่มี salt.
- **SQLite transaction:** กลุ่มคำสั่งฐานข้อมูลที่ commit/rollback ร่วมกัน.
- **PENDING:** รับคำขอแล้ว รอเจ้าหน้าที่ตัดสินใจ.
- **Ownership:** การจำกัดการอ่าน/เปลี่ยน request ให้เจ้าของตาม user จาก token.
- **Responsive:** layout ปรับตามขนาดหน้าจอ.

## Checklist ก่อนนำเสนอ

- [ ] ทุกคนอธิบายได้ว่าการ submit สร้าง `PENDING` ไม่ใช่ approval.
- [ ] ใช้ DB disposable และสอง location เท่านั้น.
- [ ] Login ด้วยบัญชี demo และแสดงไทย/อังกฤษ.
- [ ] ทดลอง request, My Requests, detail และ cancellation พร้อม history.
- [ ] ถ้าสาธิต staff ให้แยกบัญชี admin และใช้รถ demo ที่ติดป้ายชัดเจน.
- [ ] อธิบายข้อจำกัด: ไม่มี GPS, notification, production deploy หรือ browser E2E.
- [ ] นำเสนอความรับผิดชอบทางเทคนิคให้ถูกต้อง: Frontend ทำ UI/API integration; Backend ทำ API/database/JWT/rules; QA ทำ verification; Product Owner ทำ scope/acceptance/readiness.
