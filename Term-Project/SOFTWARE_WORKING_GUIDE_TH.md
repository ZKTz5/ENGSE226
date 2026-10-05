# คู่มือทำความเข้าใจและอธิบายซอฟต์แวร์ RMUTL Shuttle

เอกสารนี้อธิบายตาม source code และผลตรวจล่าสุดใน repository เพื่อให้สมาชิกทั้ง 4 บทบาทอธิบายระบบเดียวกันได้ แม้การพัฒนาจะทำโดยผู้ร่วมพัฒนาคนเดียวก็ตาม ระบบยังใช้โครงสร้างเดิมของ Express, React, SQLite/libsql, JWT และ scrypt

> ใน repository ไม่พบไฟล์สไลด์ PowerPoint/PDF สำหรับตรวจข้อความแบ่งงาน หากสไลด์ฉบับนำเสนอระบุให้ Frontend รับผิดชอบฐานข้อมูล/API/JWT/FIFO หรือให้ Backend รับผิดชอบงาน UI ข้อความนั้นไม่ตรงกับหน้าที่ทางเทคนิคที่เห็นใน source code คู่มือนี้จึงยึดการแบ่งหน้าที่ตาม implementation จริง

## ภาพรวมสถาปัตยกรรม

```text
ผู้ใช้
  │ React + Vite, HashRouter, Language/Auth Context
  │ shuttleService → apiClient (JSON + Bearer JWT)
  ▼ HTTP / JSON
Express app → routes → validators / middleware → services
  │                                            │
  │                                    shuttleDb helpers
  ▼                                            ▼
API response ◄──────────────────────── SQLite (node:sqlite)
```

- Frontend แสดงผล รับ input และเรียก API; ไม่เป็นผู้ตัดสินสิทธิ์จองหรือจำนวนที่นั่ง
- Express route ตรวจ request และส่งต่อ service; route เหล่านี้เรียก service โดยตรง ไม่มีชั้น controller แยกใน active shuttle API
- Service ทำกฎธุรกิจและเรียก helper ที่คุยกับฐานข้อมูล
- SQLite เก็บผู้ใช้ จุดให้บริการ ตารางรถ และการจอง
- จุดให้บริการมีเพียง **Jed Yod (เจ็ดยอด)** และ **Doi Saket (ดอยสะเก็ด)**; เลือกต้นทางกับปลายทางเดียวกันไม่ได้

### ลำดับการไหลของข้อมูลทั่วไป

1. ผู้ใช้กรอกหรือเลือกข้อมูลใน React page
2. page เรียกฟังก์ชันใน `frontend/src/services/shuttleService.js`
3. `apiClient.js` ส่ง `fetch` ไป Express; ถ้ามี token จะใส่ `Authorization: Bearer …`
4. Express route ตรวจ input/authentication และเรียก service
5. service query หรือแก้ข้อมูล SQLite ผ่าน `shuttleDb.js`
6. API ตอบ JSON หรือ error code
7. Frontend แปลง error code เป็นข้อความตามภาษาปัจจุบัน แล้วแสดง loading, empty, error, success หรือผลการจอง

### Authentication flow

1. ผู้ใช้ส่ง email/password ไป `POST /api/auth/login`
2. Validator ตรวจค่าที่จำเป็น; `authService.js` trim และ lowercase email แล้วตรวจให้ตรงกับ `^[^@\s]+@live\.rmutl\.ac\.th$`
3. `shuttleDb.js` ค้นผู้ใช้; `password.js` ตรวจ scrypt hash ด้วย `timingSafeEqual`
4. สำเร็จแล้ว backend ออก JWT ด้วย `jsonwebtoken`; email ที่ไม่อยู่ในระบบและรหัสผ่านผิดใช้ข้อความปฏิเสธเดียวกัน
5. `AuthContext` เก็บ session ใน memory และส่ง token ให้ `apiClient`
6. `authenticate` ตรวจ Bearer token ใน endpoint จอง; reload หน้าแล้ว session หายและต้อง login ใหม่

แอปนี้เป็น **login-only** ไม่มี registration endpoint, หน้าสมัคร หรือ public self-signup บัญชีได้จาก seed สำหรับ demo หรือผู้ดูแลเรียก `create-user.mjs`

### Booking และ FIFO waitlist flow

1. ผู้ใช้เลือกตารางรถแล้ว Frontend ส่ง `POST /api/bookings` พร้อม `scheduleId` และ JWT
2. `bookingService.createBooking()` เปิด SQLite `BEGIN IMMEDIATE` transaction, ตรวจผู้ใช้/เที่ยวรถ/เวลาออกและรายการที่ยัง active อยู่
3. คำนวณที่นั่งจาก capacity หัก confirmed และ waitlisted ภายใน transaction; ถ้ามีที่นั่งสร้าง confirmed ถ้าเต็มสร้าง waitlisted
4. partial unique index กัน active booking ซ้ำต่อผู้ใช้/เที่ยวรถ; transaction ที่ serialize การเขียนช่วยป้องกัน overbooking ใน local SQLite
5. Frontend แสดง ticket หลังได้ผล API สำเร็จเท่านั้น โดยใช้ booking response จริงประกอบกับข้อมูล route ที่โหลดไว้
6. การยกเลิกส่ง `DELETE /api/bookings/:id`; backend ตรวจเจ้าของรายการหรือสิทธิ์ admin
7. ยกเลิก confirmed แล้วเลือก waitlisted แรกด้วย `ORDER BY created_at, id`; เปลี่ยนสถานะ cancelled และเลื่อนคนขึ้น confirmed ภายใน transaction เดียวกัน การยกเลิก waitlist ไม่ promote คนอื่น

`waitlist_seq` เป็นข้อมูลวินิจฉัย ไม่ใช่ตำแหน่งคิวปัจจุบัน; UI จึงไม่แสดงตัวเลขลำดับคิวจาก field นี้

## 1. Product Owner / Lead

### 1. หน้าที่ของบทบาท

กำหนดวัตถุประสงค์และขอบเขต ประสาน Sprint 1–4 นิยาม acceptance criteria จัดลำดับงาน ตรวจข้อจำกัด และส่งงานที่พร้อมให้ Frontend, Backend และ QA ตามส่วนรับผิดชอบ

### 2. ส่วนของระบบที่เกี่ยวข้อง

- Product scope: ระบบค้นหา/จอง shuttle ระหว่างเจ็ดยอดกับดอยสะเก็ดสองทิศทาง
- User journey: เข้าระบบ → เลือกเส้นทาง/วัน → ดูเที่ยวรถ → จองหรือเข้าคิว → ดูรายการ → ยกเลิก
- Sprint overview: Sprint 1 database/auth; Sprint 2 campuses/schedules; Sprint 3 booking/cancellation/FIFO; Sprint 4 React UI/API integration และการส่งมอบ
- ข้อจำกัด production: ยังไม่ยืนยัน persistent production DB, deployment, remote transaction หรือ browser E2E

### 3. หลักการทำงาน

ยึด acceptance criteria ที่ตรวจได้จาก API/UI/test เช่น มีจุดให้บริการสองแห่งเท่านั้น, email ต้องจบตรง `@live.rmutl.ac.th`, ต้นทางและปลายทางต้องต่างกัน, ห้ามจองซ้ำ/เกินความจุ, cancellation ต้องตรวจเจ้าของและ promote FIFO. ผู้ใช้เห็นข้อความจองสำเร็จหลัง API ตอบรับเท่านั้น

### 4. ลำดับการไหลของข้อมูล

รับความต้องการและกำหนด acceptance criteria → มอบ API contract ให้ Backend → มอบเส้นทาง/สถานะหน้าจอให้ Frontend → มอบกรณีทดสอบและหลักฐานให้ QA → รวบรวมผล test/build และ limitation สำหรับ demo/release readiness

### 5. ไฟล์และโฟลเดอร์หลัก

- `AGENT_HANDOFF.md`: ขอบเขต, sprint status, implementation/verification history
- `FINAL_AUDIT_REPORT.md`: checklist, API/schema, ผลตรวจ, demo, limitation
- `PRESENTATION_SCRIPT_TH.md`: บทนำเสนอภาษาไทย
- `source/README.md`: setup, reset, API และ test commands
- `source/api/data/schema.sql`: แหล่งจริงของ seed/schema ที่ต้องสอดคล้องกับขอบเขต

### 6. วิธีรันและตรวจสอบ

จาก `source/` เตรียม environment และ database พัฒนา จากนั้นรัน API/frontend ตามคำสั่งในหัวข้อ “คำสั่งตรวจสอบและนำเสนอ”. ตรวจครบ `npm test`, `npm run check`, `npm run build`; อย่าอ้างว่า production พร้อมเพียงเพราะ local build ผ่าน

### 7. ปัญหาที่พบบ่อย

- Requirement หรือสไลด์เก่าอาจยังพูดถึงสามวิทยาเขต/อีเมลโดเมนเดิม: ยืนยันกับ schema และ validator ปัจจุบัน
- วันออกเดินทางใน seed เปลี่ยนสัมพันธ์กับเวลาจริง: ตรวจ `departure_time` ก่อน demo expiry
- การ reset DB กระทบข้อมูลในไฟล์เป้าหมาย: หยุด API ใช้ disposable `DB_FILE` หรืออ่าน backup timestamp ก่อนเสมอ
- Local SQLite pass ไม่ได้แปลว่า remote database concurrency ผ่าน

### 8. สิ่งที่ควรอธิบายตอนนำเสนอ

อธิบายผู้ใช้เป้าหมายและเส้นทางหลัก, ขอบเขตสอง location, การตรวจสิทธิ์/ที่นั่งที่ backend, atomic booking/cancellation และ FIFO. บอกตามจริงว่า automated local checks ผ่าน แต่ production storage/deployment และ graphical browser E2E ยังไม่ได้ยืนยัน

### 9. การส่งต่องานให้บทบาทอื่น

- ให้ Backend: acceptance criteria, allowed campus/domain, API payload/error expectations, data rules
- ให้ Frontend: user journey, Thai/English copy, loading/empty/error/success states, responsive behavior
- ให้ QA: traceable criteria, reproducible seed/reset data, expected status/error และหลักฐานที่ต้องเก็บ

## 2. Frontend Developer

### 1. หน้าที่ของบทบาท

ดูแล React user flow, routing, localization, การเรียก API, การแสดงสถานะ และ responsive/accessibility behavior โดยไม่ย้าย business rule การจองมาเป็นอำนาจตัดสินของ browser

### 2. ส่วนของระบบที่เกี่ยวข้อง

- React 19 + Vite; entry ใช้ `HashRouter`
- Routes: `/` dashboard, `/login`, `/schedules`, `/schedules/:scheduleId`, `/bookings`, `/guide`
- `LanguageProvider`: Thai default, `ไทย | EN`, เปลี่ยนทันที, เก็บ preference ใน localStorage ได้; fallback English แล้ว fallback เป็น key
- `AuthProvider`: เก็บ session/JWT ใน memory
- active user-facing page ใช้ API จริงและสถานะโหลด/ไม่มีข้อมูล/ผิดพลาด/สำเร็จ

### 3. หลักการทำงาน

ใช้ `shuttleService.js` เป็นฟังก์ชันตาม feature และ `apiClient.js` เป็นจุด `fetch` กลาง. API error มี `code/status`; dictionary ใน `i18n/translations.js` เลือกข้อความให้ตรงภาษา. ชื่อ campus/date แสดงแปลตาม locale แต่ API identifiers/field names คงเดิม. JWT จาก login ถูกเก็บใน memory และแนบเป็น Bearer token; ไม่เปลี่ยน authentication behavior ด้วย language preference

### 4. ลำดับการไหลของข้อมูล

Page รับ interaction → service สร้าง endpoint/query/body → `apiFetch` ใส่ JSON และ token → parse response หรือโยน `ApiError` → page อัปเดต state → `translate()` แสดงข้อความ. Schedule detail แสดง `BookingTicket` หลัง `createBooking()` resolve. My Bookings เปิด dialog เพื่อยืนยันก่อน `cancelBooking()`

### 5. ไฟล์และโฟลเดอร์หลัก

- `source/frontend/src/App.jsx`: route map และ providers
- `src/main.jsx`: React root, `HashRouter`, CSS
- `src/pages/`: `DashboardPage`, `LoginPage`, `SchedulesPage`, `ScheduleDetailPage`, `MyBookingsPage`, `UserGuidePage`, layout และ not-found
- `src/components/`: header, schedule card, booking ticket, cancellation dialog, loading/empty/error
- `src/services/apiClient.js`, `shuttleService.js`: API integration
- `src/contexts/AuthContext.jsx`, `LanguageContext.jsx`: session และ locale
- `src/i18n/translations.js`: dictionary/error mapping/date/campus labels
- `src/styles.css`: shared theme variables, responsive UI, focus, reduced-motion rules
- `src/utils/institutionalEmail.js`: client-side exact-domain convenience validation; backend remains authoritative
- `scripts/check-project.mjs`: frontend structural checks
- `src/**/*.test.js`: service, dictionary/language, email utility tests

### 6. วิธีรันและตรวจสอบ

จาก `source/`: `npm install --prefix frontend`, `npm run dev --prefix frontend`; เว็บ Vite ปกติที่ `http://localhost:5173`. ตรวจด้วย `npm test --prefix frontend`, `npm run check --prefix frontend`, `npm run build --prefix frontend` หรือ root commands

### 7. ปัญหาที่พบบ่อย

- API connection failed: ตรวจ API ว่ารันหรือไม่, `VITE_API_BASE_URL`, CORS และพอร์ต
- 401 สำหรับ booking: login ใหม่; JWT อยู่ใน memory และหายเมื่อ reload
- 400 schedule filter: ตรวจ origin/destination IDs, วันรูปแบบ YYYY-MM-DD และไม่เลือก campus เดียวกัน
- เห็นข้อความอังกฤษในไทย: ตรวจ key ในทั้ง dictionary และ fallback โดยไม่เปลี่ยน API contract
- API login ผ่านแต่ UI ไม่ผ่าน: ตรวจ validation/helper ที่ frontend และ payload ที่ `shuttleService.login` ส่ง
- Guide ไม่ขึ้น nav: ตรวจ `AppHeader.jsx`, `/guide` ใน `App.jsx` และ language keys

### 8. สิ่งที่ควรอธิบายตอนนำเสนอ

Frontend แยก page/component/service/context; หน้าจอใช้ข้อมูล API จริง; ไทยเป็นค่าเริ่มต้นและสลับ EN ได้ทันที; JWT ใช้ใน memory; booking ticket ปรากฏเมื่อ API success; dialog cancellation ต้องยืนยัน; loading/empty/error มี state แยก; layout รองรับ mobile และลด motion ตาม user preference

### 9. การส่งต่องานให้บทบาทอื่น

- ส่ง Backend: endpoint, payload, response field หรือ error code ที่ UI ต้องใช้
- ส่ง QA: route/state ที่ต้องตรวจ, locale, input boundary, disabled/pending action และ network failure
- แจ้ง Product Owner: ข้อความ/flow ที่เปลี่ยน, limitation ที่ผู้ใช้เห็น และหลักฐาน build/check

## 3. Backend Developer

### 1. หน้าที่ของบทบาท

ดูแล Express API, validation, authentication, service rules, schema/seed และ transaction ให้ API เป็นผู้ตัดสินความถูกต้องของบัญชี ตารางรถ การจอง และการยกเลิก

### 2. ส่วนของระบบที่เกี่ยวข้อง

Express request ไหลจาก `app.js` → route → validator/auth middleware เมื่อจำเป็น → service → `shuttleDb.js` → SQLite. Route ปัจจุบันเรียก service โดยตรง ไม่มี controllers layer แยกสำหรับ active shuttle routes

### 3. หลักการทำงาน

- Auth: email normalize/ตรวจ exact `@live.rmutl.ac.th`; JWT sign/verify; scrypt hash และ constant-time compare
- Locations/routes: seed สองแห่งและห้าม origin=destination ผ่าน filter validation
- Expiry: schedule service derive จาก departure time; booking service ตรวจเวลาอีกครั้งก่อนสร้าง booking
- Seat counts: คำนวณจาก rows ภายใน transaction ไม่พึ่ง cache อย่างเดียว
- Atomicity: `BEGIN IMMEDIATE`/COMMIT/ROLLBACK ของ local SQLite; partial unique index ป้องกัน active duplicate
- FIFO: cancellation of confirmed promotes `created_at`, then `id` ลำดับแรก ใน transaction เดียวกัน
- Startup: schema compatibility guard ไม่ reset DB เก่าเอง; DB reset เป็นคำสั่ง explicit และ backup ไฟล์เดิมก่อนเขียนทับ

### 4. ลำดับการไหลของข้อมูล

Express รับ HTTP → route ตรวจรูปแบบ/สิทธิ์ → service ตรวจ business rule → transaction/query ผ่าน `shuttleDb` → DB constraint และผล query เป็น source of truth → route แปลงเป็น HTTP status/JSON → client แปล display message. Login ไม่มี public registration; `create-user` เป็น operator script

### 5. ไฟล์และโฟลเดอร์หลัก

- `source/api/src/app.js`, `server.js`, `config.js`: app, routes, startup/config
- `src/routes/`: auth, campus, schedule, booking, health
- `src/middleware/auth.js`, `errorHandler.js`
- `src/validators/shuttleValidator.js`
- `src/services/authService.js`, `scheduleService.js`, `bookingService.js`, `shuttleDb.js`
- `src/utils/password.js`
- `source/api/data/schema.sql`: tables, indexes, seeds
- `source/api/scripts/setup-db.mjs`: setup/reset with existing-file backup
- `scripts/create-user.mjs`: operator account tool
- `source/api/tests/`: integration และ unit tests

### 6. วิธีรันและตรวจสอบ

จาก `source/`: `npm install --prefix api`; หากต้องตั้ง dev environment ให้คัดลอก `api/.env.example` เป็น `api/.env` แล้วตั้งค่าเฉพาะเครื่อง. เตรียมฐานข้อมูลด้วย `npm run db:setup --prefix api`; API รันด้วย `npm run dev --prefix api` ที่พอร์ต 3001. ตรวจ `npm test --prefix api` และ `npm run check --prefix api`. สร้างบัญชี operator ด้วย `npm run create-user --prefix api -- <email> <password> [name] [user|admin]`

สำหรับการตรวจ reset ให้กำหนด DB_FILE ไป disposable path เช่น `DB_FILE=/tmp/rmutl-shuttle-dev.db npm run db:reset --prefix api`; อย่า reset user/production DB

### 7. ปัญหาที่พบบ่อย

- Startup บอก missing Shuttle tables: ตรวจ DB_FILE; อาจชี้ legacy schema; backup ก่อน แล้วเลือก migrate/reset ด้วยความเข้าใจ
- Login 400: ตรวจ suffix, whitespace และ payload; Login 401: ตรวจบัญชี/password โดยไม่เปิดเผยว่าบัญชีใดมีอยู่
- Booking 409: schedule expired หรือผู้ใช้มี active booking อยู่แล้ว
- 401/403: token ขาด/หมดอายุเทียบกับ role/ownership
- Seats/FIFO ต่างจากที่คาด: ตรวจ rows, timestamps, capacity และใช้ local SQLite test; อย่าอนุมาน remote behavior
- Port in use: ตรวจ `PORT` และ process ที่ใช้อยู่ก่อนเริ่ม server

### 8. สิ่งที่ควรอธิบายตอนนำเสนอ

อธิบาย route-service-database path, JWT/scrypt, exact email domain, schema สี่ตาราง, immediate transactions, unique index, expiry จากเวลาออก, duplicate/overbooking protection และ FIFO tie-break `(created_at, id)`. ระบุว่า test ใช้ local SQLite และ remote concurrency ยังไม่ verify

### 9. การส่งต่องานให้บทบาทอื่น

- ส่ง Frontend: stable endpoint, JSON field, status code และ error code; อย่าให้ UI คำนวณสิทธิ์แทน server
- ส่ง QA: resettable DB path, seed users/schedules, expected states และ concurrency/FIFO scenarios
- ส่ง Product Owner: API contract ที่เปลี่ยน, deployment/configuration requirements, migration risk และข้อจำกัด

## 4. QA & Test

### 1. หน้าที่ของบทบาท

ตรวจ requirement ด้วย unit, integration, static check และ production build; สร้างหลักฐานที่ทำซ้ำได้ และจำแนกสาเหตุเมื่อระบบผิดพลาดโดยไม่ลดคุณภาพ assertion หรือแก้ data จริง

### 2. ส่วนของระบบที่เกี่ยวข้อง

- API unit: config, password, DB schema guard, validators
- API integration: auth, schedules, booking, cancellation, expiry, FIFO และ concurrency
- Frontend unit: API client/service behavior, translation/language, email validation และ utility
- Static project checks: API smoke/contract structure และ frontend routes/accessibility-related wiring
- Build: Vite production bundle ผ่าน root `npm run build`

### 3. หลักการทำงาน

เริ่มจาก test ตาม acceptance criteria; ใช้ isolated/in-memory DB ใน suite และ disposable file สำหรับ reset/HTTP smoke; test domain acceptance/rejection, same-campus/filter errors, expiry, ownership, duplicate, capacity, FIFO tie และ six-way last-seat concurrency. เก็บ command, output, counts และ git revision ไว้ในหลักฐาน. ไม่ถือว่า static checker แทน browser E2E

### 4. ลำดับการไหลของข้อมูล

Requirement → test case/input/setup → command → API/service/UI response → assert expected status/data → บันทึก output/count → ถ้าล้มเหลวแยก frontend/API/database/environment ก่อนส่งกลับเจ้าของ component

### 5. ไฟล์และโฟลเดอร์หลัก

- `source/api/tests/unit/`: `config.test.js`, `password.test.js`, `shuttleDb.test.js`, `shuttleValidator.test.js`
- `source/api/tests/integration/`: `auth.api.test.js`, `schedules.api.test.js`, `shuttle.api.test.js`
- `source/frontend/src/i18n/translations.test.js`
- `source/frontend/src/services/shuttleService.test.js`
- `source/frontend/src/utils/institutionalEmail.test.js`, `requestSummary.test.js`
- `source/api/scripts/check-project.mjs`
- `source/frontend/scripts/check-project.mjs`

### 6. วิธีรันและตรวจสอบ

คำสั่ง root-level จาก `source/` ที่ใช้ตรวจรอบล่าสุด:

```bash
npm test
npm run check
npm run build
git diff --check
```

แยก suite ได้ด้วย `npm test --prefix api` และ `npm test --prefix frontend`. API check: `npm run check --prefix api`; UI check: `npm run check --prefix frontend`. Build เฉพาะ UI: `npm run build --prefix frontend`.

ผลที่ตรวจล่าสุด: backend 49/49 tests ใน 7 files; frontend 17/17 ใน 4 files; API checks 4/4; frontend checks 7/7; root production build ผ่าน; disposable reset และ HTTP smoke ครอบคลุมสอง campus, domain acceptance/rejection, confirmed/waitlist/duplicate, cancellation/FIFO promotion และ expiry. ไม่มี graphical browser ใน environment จึงไม่มี click-through E2E/screenshot ที่อ้างว่าผ่าน

### 7. ปัญหาที่พบบ่อย

- Test ใช้ข้อมูลเก่า: ตรวจ `DB_FILE` และ reset เฉพาะ disposable database
- API integration ล้มก่อน route: ตรวจ DB initialization, `NODE_ENV`, `JWT_SECRET` config และ port/environment
- UI service test fail: ตรวจ endpoint/base URL, request body, token/header และ API response contract
- 401 เทียบกับ 400: ตรวจ token setup กับ request validation แยกกัน
- Build fail แต่ tests ผ่าน: ตรวจ import, JSX, Vite config และ environment build; test suite ไม่ได้ compile ทุก route configuration เหมือน production build
- Concurrent test fail: ตรวจ driver/database ที่กำลังใช้; ผล local SQLite ไม่ยืนยัน remote storage

### 8. สิ่งที่ควรอธิบายตอนนำเสนอ

บอก test types และสิ่งที่แต่ละชุดพิสูจน์; ยก FIFO equal-timestamp tie และผู้ใช้ 6 คนแย่ง 1 seat; แยก automated test/check/build ออกจาก browser E2E; แสดงคำสั่งและผลจริงแทนคำว่า “ทดสอบแล้ว” แบบไม่มีหลักฐาน

### 9. การส่งต่องานให้บทบาทอื่น

- ส่ง Backend: failing request, status/code, test file และ expected DB state
- ส่ง Frontend: route, language, browser-independent state, mocked/API result และ reproduction steps
- ส่ง Product Owner: acceptance ที่ผ่าน/ไม่ผ่าน, risk ระดับผู้ใช้, test/build counts และ limitation ที่ยังค้าง

## API reference โดยยึด route ปัจจุบัน

| Method | Path | Auth | หน้าที่ |
|---|---|---|---|
| `GET` | `/api` | ไม่ต้อง | ข้อมูลสถานะ API |
| `GET` | `/api/health` | ไม่ต้อง | health และ database connection |
| `POST` | `/api/auth/login` | ไม่ต้อง | ตรวจ login และส่ง JWT |
| `GET` | `/api/campuses` | ไม่ต้อง | คืนสอง service locations |
| `GET` | `/api/schedules?originId=&destinationId=&date=` | ไม่ต้อง | ค้นหาตารางรถ; filter ผิดตอบ 400 |
| `GET` | `/api/schedules/:id` | ไม่ต้อง | รายละเอียด schedule |
| `POST` | `/api/bookings` | Bearer JWT | สร้าง confirmed หรือ waitlisted booking |
| `GET` | `/api/bookings/my` | Bearer JWT | รายการของ user ปัจจุบัน |
| `DELETE` | `/api/bookings/:id` | Bearer JWT + owner | ยกเลิก booking ของตน |
| `DELETE` | `/api/bookings/:id/cancel-admin` | Bearer JWT + admin | ยกเลิกรายการในสิทธิ์ admin |

ไม่มี registration endpoint

## ตารางฐานข้อมูลตาม `source/api/data/schema.sql`

| ตาราง | เนื้อหาและข้อบังคับหลัก |
|---|---|
| `users` | ชื่อ, unique email, role `user/admin`, `password_hash`, `created_at` |
| `campuses` | ชื่อสถานที่ unique; seed มี Jed Yod และ Doi Saket |
| `schedules` | `origin_id`, `destination_id`, เวลาเดินทาง, capacity, available seats, status, created time; foreign keys ไป campuses |
| `bookings` | user/schedule foreign keys, status `confirmed/waitlisted/cancelled`, diagnostic `waitlist_seq`, created time |

Indexes: schedule search `(origin_id, destination_id, departure_time)`, FIFO `(schedule_id, created_at, id)`, bookings by user, และ partial unique booking `(user_id, schedule_id)` เฉพาะ status ที่ไม่ใช่ cancelled

## คำสั่งเตรียม demo และหลักฐาน

จาก `source/`:

```bash
npm install --prefix api
npm install --prefix frontend
DB_FILE=/tmp/rmutl-shuttle-demo.db npm run db:reset --prefix api
DB_FILE=/tmp/rmutl-shuttle-demo.db npm run dev --prefix api
npm run dev --prefix frontend
```

ใช้คนละ terminal สำหรับ API และ frontend. Demo seed login ที่ยืนยันจาก seed: `tan.khanit@live.rmutl.ac.th` / `rmutl1234`; ใช้เฉพาะฐานข้อมูล demo. เก็บหลักฐานโดยบันทึก git revision, คำสั่ง, test output/count, ผล query/HTTP smoke ที่ไม่รวม token/password และภาพหน้าจอเฉพาะเมื่อมี browser ให้ตรวจจริง. อย่าบันทึก secret หรือข้อมูลผู้ใช้จริง

## การจำแนกปัญหา

| อาการ | จุดตรวจแรก |
|---|---|
| เว็บโหลดไม่ได้ | Vite process/port, build output และ browser console เมื่อมี browser |
| หน้าเว็บขึ้นแต่ API ไม่ตอบ | API process, `/api/health`, base URL, CORS, port |
| API เปิดแต่ DB degraded | `DB_FILE`, database initialization, schema compatibility, file permission |
| Login ปฏิเสธ | email suffix/payload, seeded/operator account, scrypt verification; แยก 400 domain/input กับ 401 credential |
| Booking/cancel ผิด | JWT/owner role, schedule expiry, active duplicate, capacity, DB transaction/test output |
| Thai/English ผิด | context state, dictionary key, fallback, document `lang`; API field identifiers ควรคงเดิม |
| Test/build ต่างกัน | ระบุว่าล้มใน unit/integration/check/build; อย่าใช้ผลประเภทหนึ่งแทนอีกประเภท |

## Glossary

- **API**: จุดให้บริการข้อมูลและคำสั่งผ่าน HTTP
- **JWT**: token ที่ backend เซ็นเพื่อยืนยันตัวตนใน request
- **scrypt**: password key-derivation function ที่ใช้ salt เพื่อเก็บรหัสผ่านเป็น hash
- **SQLite transaction**: กลุ่มคำสั่งฐานข้อมูลที่ commit พร้อมกันหรือ rollback เมื่อผิดพลาด
- **FIFO**: มาก่อนมีสิทธิ์ก่อน; ที่นี่เรียงด้วย `created_at` และ `id`
- **Waitlist**: รายการรอที่นั่งเมื่อเที่ยวรถเต็ม
- **Integration test**: ทดสอบการทำงานร่วมกันหลายชั้น เช่น HTTP route/service/database
- **Disposable database**: ฐานข้อมูลชั่วคราวที่สร้างใหม่หรือลบได้โดยไม่กระทบข้อมูลที่ต้องเก็บ
- **Reduced motion**: การลด/ปิดการเคลื่อนไหวตาม `prefers-reduced-motion`

## Checklist ก่อนนำเสนอ

### Product Owner / Lead
- [ ] อธิบายขอบเขตสองจุดให้บริการ, user flow, Sprint 1–4 และ acceptance criteria ได้
- [ ] บอกข้อจำกัด deployment/persistent storage และไม่อ้าง remote concurrency ที่ยังไม่ตรวจ
- [ ] ส่ง scenario และผลที่คาดให้ Frontend, Backend และ QA ตรงกัน

### Frontend Developer
- [ ] รัน API/frontend และแสดง dashboard, search, detail, My Bookings ได้
- [ ] แสดง Thai default, switch EN, guide แบบเปิดเอง และ loading/empty/error state
- [ ] อธิบายว่า JWT อยู่ใน memory และ booking success มาจาก API response

### Backend Developer
- [ ] อธิบาย login domain, JWT/scrypt, route/service/database flow และ schema ได้
- [ ] อธิบาย duplicate/overbooking guard, transaction, cancellation และ FIFO tie-break ได้
- [ ] ใช้เฉพาะ disposable DB ใน demo/reset และแจ้งข้อจำกัด remote DB

### QA & Test
- [ ] รัน `npm test`, `npm run check`, `npm run build`, `git diff --check` และเก็บผลจริง
- [ ] อธิบาย auth/filter/expiry/cancel/FIFO/concurrency coverage และขอบเขตของแต่ละ test
- [ ] แยกข้อเท็จจริงที่ตรวจจาก test/build ออกจาก browser E2E/deployment ที่ยังไม่มี
