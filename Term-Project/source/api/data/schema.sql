PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS vehicle_requests;
DROP TABLE IF EXISTS vehicles;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  password_hash TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE vehicles (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  code          TEXT NOT NULL UNIQUE,
  capacity      INTEGER NOT NULL CHECK (capacity > 0),
  home_location TEXT NOT NULL DEFAULT 'Jed Yod' CHECK (home_location = 'Jed Yod'),
  active        INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE vehicle_requests (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id             INTEGER NOT NULL,
  origin              TEXT NOT NULL CHECK (origin IN ('Jed Yod','Doi Saket')),
  destination         TEXT NOT NULL CHECK (destination IN ('Jed Yod','Doi Saket')),
  trip_type           TEXT NOT NULL CHECK (trip_type IN ('ONE_WAY','ROUND_TRIP')),
  departure_at        TEXT NOT NULL,
  return_at           TEXT,
  passenger_count     INTEGER NOT NULL CHECK (passenger_count > 0),
  purpose             TEXT NOT NULL CHECK (length(trim(purpose)) > 0),
  note                TEXT,
  status              TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED','COMPLETED')),
  assigned_vehicle_id INTEGER,
  rejection_reason    TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (origin <> destination),
  CHECK (trip_type <> 'ROUND_TRIP' OR return_at IS NOT NULL),
  CHECK (return_at IS NULL OR datetime(return_at) > datetime(departure_at)),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (assigned_vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT
);

CREATE INDEX idx_vehicle_requests_user_history
  ON vehicle_requests(user_id, created_at DESC, id DESC);
CREATE INDEX idx_vehicle_requests_status_departure
  ON vehicle_requests(status, departure_at);
CREATE INDEX idx_vehicle_requests_vehicle_interval
  ON vehicle_requests(assigned_vehicle_id, status, departure_at, return_at);

-- Development/demo users. The same password is used for all accounts: rmutl1234.
INSERT INTO users (name, email, role, password_hash) VALUES
  ('Tan K.',        'tan.khanit@live.rmutl.ac.th',   'user',  'scrypt$b884bfa0494f6fec517d0a80cb1f9098$38a54ef3d947f3a342b691dff65bacdd3ba5ef009de3aaeaa18f45ec0adb938f1de54821c9b78f45dc54d2ccec98b06102cfcead091366c0416e639c67540c7d'),
  ('Patchara W.',   'patchara.w@live.rmutl.ac.th',   'user',  'scrypt$96a1ffbb2f324b5130eabf23d1b8c406$f7bc8ae041762f7fef7b7ef3eca8f758e07240d19547cf4b912d5f87f0f021ee767354545c082595113b95d159c9b0074bf741f3bff58346287d78da19d58a8a'),
  ('Anon P.',       'anon.p@live.rmutl.ac.th',       'user',  'scrypt$f2d339506cf84f3d53644af5ce301941$59ebd72e21b810e99145fbb50f3faf1863bb0e68a3f7498e1d74d6751be4e069988e656fb86b064956e1dabf4d0c0238184af5cfa1c7de0a23c619d4606e3de3'),
  ('Wanchalern P.', 'wanchalern.p@live.rmutl.ac.th', 'user',  'scrypt$f130d2bc28486ac32ffb52973978932a$7a803220ec646e781945bf75d54ed4752e25e9e9d6064c5be62cb8388b6ae7676f746dcfc82b4ce49bb21cb0649a2fdd8803625ca4671926e50d0852c9953981'),
  ('Wichapong R.',  'wichapong.r@live.rmutl.ac.th',  'user',  'scrypt$cd8b141e6cb61e1153de50872077e89b$ae87e6e6d475bb0a2b44c871d2d8d3c010ee86b093bd102b9efcc7c0cc762709357344285a47f8f40c911acd6527e47ec5401377b3ff3e5590a8cf8a536cdceb'),
  ('Nilchar K.',    'nill.rattan@live.rmutl.ac.th',  'user',  'scrypt$aaf0c2ca659a8dfe2e4915737a27b5a4$29041e0af2141d8218b6a7c48df238caf2e0c3068eca1176a1f2acea08baf5ca64afe4fafabade16ada7ba6398ff5cc0c623f467d2836a3a9af91b68d877b2f5'),
  ('Thanut K.',     'thanut.k@live.rmutl.ac.th',    'user',  'scrypt$477cfa4abfd826f7dbe1fc790604f3ef$5c45c11c4466634d17eec7f83e52fb09742d996d260ef09190f92ea143a37830be3a6b17fb14e4d104a6758f43577f6c57feb18a971029d65b6d0616dfabc30a'),
  ('Akachai C.',    'akachai.c@live.rmutl.ac.th',   'user',  'scrypt$51bb2342fa761c3b1a7996ecc0c3d98d$03535b1991a6b6df556838c3340b9ab5c28fab82939f9e3fd120c18484564d660565069547521e72b7109b694c5bffbd2a4cb204c216b406084df39d96dfd120'),
  ('Wichian K.',    'wichian.k@live.rmutl.ac.th',   'user',  'scrypt$9c01ffe90090035388d7ad976721fe02$4bb91cf46a6b5bc3a824581354456b712244c9d06331a4c8d14a8885859473917cabc698e956638789d0ff781de206076e2724a0e8fffad611023ac25862b7b1'),
  ('Admin RMUTL',   'admin@live.rmutl.ac.th',        'admin', 'scrypt$2f853982555392b3ce888d0a2d085855$48cfc13f90cece31db5a8c5d27a23699fe816520ec5fbed3f4e027296ca56734670c2628553d571197798f9e378998fd4dfa10ba550674734cbd583897d36619');

-- Initial fleet: five active vehicles of different capacities and one in maintenance.
INSERT INTO vehicles (code, capacity, home_location, active) VALUES
  ('RMUTL-CAR-04', 4,  'Jed Yod', 1),
  ('RMUTL-VAN-12', 12, 'Jed Yod', 1),
  ('RMUTL-VAN-15', 15, 'Jed Yod', 1),
  ('RMUTL-BUS-30', 30, 'Jed Yod', 1),
  ('RMUTL-BUS-40', 40, 'Jed Yod', 1),
  ('RMUTL-BUS-50', 50, 'Jed Yod', 0);

-- Initial requests: each of the nine regular users has every workflow status.
-- day_offset is relative to the setup date in Bangkok; departures are 08:00 ICT.
-- duration_hours is the return/service-end window; NULL is allowed for one-way.
WITH seed_requests (
  email, origin, trip_type, day_offset, duration_hours, passenger_count,
  status, vehicle_code, purpose, note, rejection_reason
) AS (
  VALUES
  -- PENDING: one request per regular user.
  ('tan.khanit@live.rmutl.ac.th', 'Jed Yod', 'ONE_WAY', 1, NULL, 1, 'PENDING', NULL,
    'ประชุมโครงงานร่วมกับอาจารย์ที่ปรึกษา', 'รอยืนยันเวลาสิ้นสุดภารกิจก่อนมอบหมายรถ', NULL),
  ('patchara.w@live.rmutl.ac.th', 'Doi Saket', 'ROUND_TRIP', 2, 4, 12, 'PENDING', NULL,
    'เข้าร่วมอบรมการพัฒนาซอฟต์แวร์', 'ช่วงเวลาเดียวกับงานที่อนุมัติแล้วของ RMUTL-VAN-12 ต้องเลือกรถคันอื่น', NULL),
  ('anon.p@live.rmutl.ac.th', 'Jed Yod', 'ONE_WAY', 1, 5, 15, 'PENDING', NULL,
    'ศึกษาดูงานห้องปฏิบัติการวิศวกรรม', 'นัดรวมพลก่อนออกเดินทาง 15 นาที', NULL),
  ('wanchalern.p@live.rmutl.ac.th', 'Doi Saket', 'ROUND_TRIP', 2, 6, 30, 'PENDING', NULL,
    'เข้าร่วมกิจกรรมนักศึกษา', NULL, NULL),
  ('wichapong.r@live.rmutl.ac.th', 'Jed Yod', 'ONE_WAY', 2, NULL, 40, 'PENDING', NULL,
    'เดินทางร่วมงานสัมมนาวิชาการ', 'รอยืนยันเวลาสิ้นสุดภารกิจก่อนมอบหมายรถ', NULL),
  ('nill.rattan@live.rmutl.ac.th', 'Doi Saket', 'ROUND_TRIP', 2, 4, 60, 'PENDING', NULL,
    'เข้าร่วมกิจกรรมปฐมนิเทศนักศึกษา', 'กลุ่ม 60 คน ต้องประสานรถเพิ่มเติมก่อนมอบหมาย', NULL),
  ('thanut.k@live.rmutl.ac.th', 'Jed Yod', 'ONE_WAY', 3, 5, 4, 'PENDING', NULL,
    'ประชุมประสานงานระหว่างวิทยาเขต', NULL, NULL),
  ('akachai.c@live.rmutl.ac.th', 'Doi Saket', 'ROUND_TRIP', 3, 6, 8, 'PENDING', NULL,
    'นำเสนอผลงานวิจัยและนวัตกรรม', 'นัดรวมพลก่อนออกเดินทาง 15 นาที', NULL),
  ('wichian.k@live.rmutl.ac.th', 'Jed Yod', 'ONE_WAY', 3, NULL, 10, 'PENDING', NULL,
    'เข้าร่วมอบรมความปลอดภัยห้องปฏิบัติการ', 'รอยืนยันเวลาสิ้นสุดภารกิจก่อนมอบหมายรถ', NULL),
  -- APPROVED: one request per regular user.
  ('tan.khanit@live.rmutl.ac.th', 'Jed Yod', 'ROUND_TRIP', 1, 3, 4, 'APPROVED', 'RMUTL-CAR-04',
    'ประชุมโครงงานร่วมกับอาจารย์ที่ปรึกษา', NULL, NULL),
  ('patchara.w@live.rmutl.ac.th', 'Doi Saket', 'ONE_WAY', 2, 4, 12, 'APPROVED', 'RMUTL-VAN-12',
    'เข้าร่วมอบรมการพัฒนาซอฟต์แวร์', 'นัดรวมพลก่อนออกเดินทาง 15 นาที', NULL),
  ('anon.p@live.rmutl.ac.th', 'Jed Yod', 'ROUND_TRIP', 3, 5, 15, 'APPROVED', 'RMUTL-VAN-15',
    'ศึกษาดูงานห้องปฏิบัติการวิศวกรรม', 'นัดรวมพลก่อนออกเดินทาง 15 นาที', NULL),
  ('wanchalern.p@live.rmutl.ac.th', 'Doi Saket', 'ONE_WAY', 4, 6, 30, 'APPROVED', 'RMUTL-BUS-30',
    'เข้าร่วมกิจกรรมนักศึกษา', NULL, NULL),
  ('wichapong.r@live.rmutl.ac.th', 'Jed Yod', 'ROUND_TRIP', 5, 3, 40, 'APPROVED', 'RMUTL-BUS-40',
    'เดินทางร่วมงานสัมมนาวิชาการ', 'นัดรวมพลก่อนออกเดินทาง 15 นาที', NULL),
  ('nill.rattan@live.rmutl.ac.th', 'Doi Saket', 'ONE_WAY', 6, 4, 3, 'APPROVED', 'RMUTL-CAR-04',
    'เข้าร่วมกิจกรรมปฐมนิเทศนักศึกษา', 'นัดรวมพลก่อนออกเดินทาง 15 นาที', NULL),
  ('thanut.k@live.rmutl.ac.th', 'Jed Yod', 'ROUND_TRIP', 7, 5, 8, 'APPROVED', 'RMUTL-VAN-12',
    'ประชุมประสานงานระหว่างวิทยาเขต', NULL, NULL),
  ('akachai.c@live.rmutl.ac.th', 'Doi Saket', 'ONE_WAY', 8, 6, 12, 'APPROVED', 'RMUTL-VAN-15',
    'นำเสนอผลงานวิจัยและนวัตกรรม', 'นัดรวมพลก่อนออกเดินทาง 15 นาที', NULL),
  ('wichian.k@live.rmutl.ac.th', 'Jed Yod', 'ROUND_TRIP', 9, 3, 20, 'APPROVED', NULL,
    'เข้าร่วมอบรมความปลอดภัยห้องปฏิบัติการ', 'อนุมัติภารกิจแล้ว อยู่ระหว่างประสานรถ', NULL),
  -- REJECTED: one request per regular user.
  ('tan.khanit@live.rmutl.ac.th', 'Jed Yod', 'ONE_WAY', 2, 3, 4, 'REJECTED', NULL,
    'ประชุมโครงงานร่วมกับอาจารย์ที่ปรึกษา', NULL, 'ไม่มีรถว่างในช่วงเวลาที่ขอ กรุณาเลือกวันหรือเวลาใหม่'),
  ('patchara.w@live.rmutl.ac.th', 'Doi Saket', 'ROUND_TRIP', 3, 4, 12, 'REJECTED', NULL,
    'เข้าร่วมอบรมการพัฒนาซอฟต์แวร์', 'นัดรวมพลก่อนออกเดินทาง 15 นาที', 'ข้อมูลภารกิจยังไม่ครบถ้วน กรุณาส่งคำขอใหม่พร้อมรายละเอียด'),
  ('anon.p@live.rmutl.ac.th', 'Jed Yod', 'ONE_WAY', 4, 5, 15, 'REJECTED', NULL,
    'ศึกษาดูงานห้องปฏิบัติการวิศวกรรม', 'นัดรวมพลก่อนออกเดินทาง 15 นาที', 'ไม่มีรถว่างในช่วงเวลาที่ขอ กรุณาเลือกวันหรือเวลาใหม่'),
  ('wanchalern.p@live.rmutl.ac.th', 'Doi Saket', 'ROUND_TRIP', 5, 6, 30, 'REJECTED', NULL,
    'เข้าร่วมกิจกรรมนักศึกษา', NULL, 'ข้อมูลภารกิจยังไม่ครบถ้วน กรุณาส่งคำขอใหม่พร้อมรายละเอียด'),
  ('wichapong.r@live.rmutl.ac.th', 'Jed Yod', 'ONE_WAY', 6, 3, 40, 'REJECTED', NULL,
    'เดินทางร่วมงานสัมมนาวิชาการ', 'นัดรวมพลก่อนออกเดินทาง 15 นาที', 'ไม่มีรถว่างในช่วงเวลาที่ขอ กรุณาเลือกวันหรือเวลาใหม่'),
  ('nill.rattan@live.rmutl.ac.th', 'Doi Saket', 'ROUND_TRIP', 7, 4, 3, 'REJECTED', NULL,
    'เข้าร่วมกิจกรรมปฐมนิเทศนักศึกษา', 'นัดรวมพลก่อนออกเดินทาง 15 นาที', 'ข้อมูลภารกิจยังไม่ครบถ้วน กรุณาส่งคำขอใหม่พร้อมรายละเอียด'),
  ('thanut.k@live.rmutl.ac.th', 'Jed Yod', 'ONE_WAY', 8, 5, 8, 'REJECTED', NULL,
    'ประชุมประสานงานระหว่างวิทยาเขต', NULL, 'ไม่มีรถว่างในช่วงเวลาที่ขอ กรุณาเลือกวันหรือเวลาใหม่'),
  ('akachai.c@live.rmutl.ac.th', 'Doi Saket', 'ROUND_TRIP', 9, 6, 12, 'REJECTED', NULL,
    'นำเสนอผลงานวิจัยและนวัตกรรม', 'นัดรวมพลก่อนออกเดินทาง 15 นาที', 'ข้อมูลภารกิจยังไม่ครบถ้วน กรุณาส่งคำขอใหม่พร้อมรายละเอียด'),
  ('wichian.k@live.rmutl.ac.th', 'Jed Yod', 'ONE_WAY', 10, 3, 20, 'REJECTED', NULL,
    'เข้าร่วมอบรมความปลอดภัยห้องปฏิบัติการ', 'นัดรวมพลก่อนออกเดินทาง 15 นาที', 'ไม่มีรถว่างในช่วงเวลาที่ขอ กรุณาเลือกวันหรือเวลาใหม่'),
  -- CANCELLED: one request per regular user.
  ('tan.khanit@live.rmutl.ac.th', 'Jed Yod', 'ROUND_TRIP', 3, 3, 4, 'CANCELLED', NULL,
    'ประชุมโครงงานร่วมกับอาจารย์ที่ปรึกษา', 'ผู้ขอเปลี่ยนแผนการเดินทางและยกเลิกคำขอ', NULL),
  ('patchara.w@live.rmutl.ac.th', 'Doi Saket', 'ONE_WAY', 4, 4, 12, 'CANCELLED', NULL,
    'เข้าร่วมอบรมการพัฒนาซอฟต์แวร์', 'ผู้ขอเปลี่ยนแผนการเดินทางและยกเลิกคำขอ', NULL),
  ('anon.p@live.rmutl.ac.th', 'Jed Yod', 'ROUND_TRIP', 5, 5, 15, 'CANCELLED', NULL,
    'ศึกษาดูงานห้องปฏิบัติการวิศวกรรม', 'ผู้ขอเปลี่ยนแผนการเดินทางและยกเลิกคำขอ', NULL),
  ('wanchalern.p@live.rmutl.ac.th', 'Doi Saket', 'ONE_WAY', 6, 6, 30, 'CANCELLED', NULL,
    'เข้าร่วมกิจกรรมนักศึกษา', 'ผู้ขอเปลี่ยนแผนการเดินทางและยกเลิกคำขอ', NULL),
  ('wichapong.r@live.rmutl.ac.th', 'Jed Yod', 'ROUND_TRIP', 7, 3, 40, 'CANCELLED', NULL,
    'เดินทางร่วมงานสัมมนาวิชาการ', 'ผู้ขอเปลี่ยนแผนการเดินทางและยกเลิกคำขอ', NULL),
  ('nill.rattan@live.rmutl.ac.th', 'Doi Saket', 'ONE_WAY', 8, 4, 3, 'CANCELLED', NULL,
    'เข้าร่วมกิจกรรมปฐมนิเทศนักศึกษา', 'ผู้ขอเปลี่ยนแผนการเดินทางและยกเลิกคำขอ', NULL),
  ('thanut.k@live.rmutl.ac.th', 'Jed Yod', 'ROUND_TRIP', 9, 5, 8, 'CANCELLED', NULL,
    'ประชุมประสานงานระหว่างวิทยาเขต', 'ผู้ขอเปลี่ยนแผนการเดินทางและยกเลิกคำขอ', NULL),
  ('akachai.c@live.rmutl.ac.th', 'Doi Saket', 'ONE_WAY', 10, 6, 12, 'CANCELLED', NULL,
    'นำเสนอผลงานวิจัยและนวัตกรรม', 'ผู้ขอเปลี่ยนแผนการเดินทางและยกเลิกคำขอ', NULL),
  ('wichian.k@live.rmutl.ac.th', 'Jed Yod', 'ROUND_TRIP', 11, 3, 20, 'CANCELLED', NULL,
    'เข้าร่วมอบรมความปลอดภัยห้องปฏิบัติการ', 'ผู้ขอเปลี่ยนแผนการเดินทางและยกเลิกคำขอ', NULL),
  -- COMPLETED: one request per regular user.
  ('tan.khanit@live.rmutl.ac.th', 'Jed Yod', 'ONE_WAY', -1, 3, 4, 'COMPLETED', 'RMUTL-CAR-04',
    'ประชุมโครงงานร่วมกับอาจารย์ที่ปรึกษา', 'เดินทางเสร็จสิ้นและกลับถึงจุดหมายเรียบร้อย', NULL),
  ('patchara.w@live.rmutl.ac.th', 'Doi Saket', 'ROUND_TRIP', -2, 4, 10, 'COMPLETED', 'RMUTL-VAN-12',
    'เข้าร่วมอบรมการพัฒนาซอฟต์แวร์', 'เดินทางเสร็จสิ้นและกลับถึงจุดหมายเรียบร้อย', NULL),
  ('anon.p@live.rmutl.ac.th', 'Jed Yod', 'ONE_WAY', -3, 5, 15, 'COMPLETED', 'RMUTL-VAN-15',
    'ศึกษาดูงานห้องปฏิบัติการวิศวกรรม', 'เดินทางเสร็จสิ้นและกลับถึงจุดหมายเรียบร้อย', NULL),
  ('wanchalern.p@live.rmutl.ac.th', 'Doi Saket', 'ROUND_TRIP', -4, 6, 25, 'COMPLETED', 'RMUTL-BUS-30',
    'เข้าร่วมกิจกรรมนักศึกษา', 'เดินทางเสร็จสิ้นและกลับถึงจุดหมายเรียบร้อย', NULL),
  ('wichapong.r@live.rmutl.ac.th', 'Jed Yod', 'ONE_WAY', -5, 3, 40, 'COMPLETED', 'RMUTL-BUS-40',
    'เดินทางร่วมงานสัมมนาวิชาการ', 'เดินทางเสร็จสิ้นและกลับถึงจุดหมายเรียบร้อย', NULL),
  ('nill.rattan@live.rmutl.ac.th', 'Doi Saket', 'ROUND_TRIP', -6, 4, 2, 'COMPLETED', 'RMUTL-CAR-04',
    'เข้าร่วมกิจกรรมปฐมนิเทศนักศึกษา', 'เดินทางเสร็จสิ้นและกลับถึงจุดหมายเรียบร้อย', NULL),
  ('thanut.k@live.rmutl.ac.th', 'Jed Yod', 'ONE_WAY', -7, 5, 12, 'COMPLETED', 'RMUTL-VAN-12',
    'ประชุมประสานงานระหว่างวิทยาเขต', 'เดินทางเสร็จสิ้นและกลับถึงจุดหมายเรียบร้อย', NULL),
  ('akachai.c@live.rmutl.ac.th', 'Doi Saket', 'ROUND_TRIP', -8, 6, 14, 'COMPLETED', 'RMUTL-VAN-15',
    'นำเสนอผลงานวิจัยและนวัตกรรม', 'เดินทางเสร็จสิ้นและกลับถึงจุดหมายเรียบร้อย', NULL),
  ('wichian.k@live.rmutl.ac.th', 'Jed Yod', 'ONE_WAY', -9, 3, 30, 'COMPLETED', 'RMUTL-BUS-30',
    'เข้าร่วมอบรมความปลอดภัยห้องปฏิบัติการ', 'เดินทางเสร็จสิ้นและกลับถึงจุดหมายเรียบร้อย', NULL)
),
departures AS (
  SELECT s.*, u.id AS user_id, v.id AS vehicle_id,
         strftime('%Y-%m-%dT%H:%M:%fZ', date('now', '+7 hours'),
                  printf('%+d days', s.day_offset), '+1 hour') AS departure_at
  FROM seed_requests s
  JOIN users u ON u.email = s.email
  LEFT JOIN vehicles v ON v.code = s.vehicle_code
),
journeys AS (
  SELECT d.*,
         CASE WHEN duration_hours IS NOT NULL
              THEN strftime('%Y-%m-%dT%H:%M:%fZ', departure_at,
                            printf('+%d hours', duration_hours)) END AS return_at,
         strftime('%Y-%m-%dT%H:%M:%fZ',
                  min(julianday('now', '-1 day'), julianday(departure_at, '-2 days'))) AS created_at
  FROM departures d
)
INSERT INTO vehicle_requests (
  user_id, origin, destination, trip_type, departure_at, return_at, passenger_count,
  purpose, note, status, assigned_vehicle_id, rejection_reason, created_at, updated_at
)
SELECT user_id, origin, CASE origin WHEN 'Jed Yod' THEN 'Doi Saket' ELSE 'Jed Yod' END,
       trip_type, departure_at, return_at, passenger_count, purpose, note, status,
       vehicle_id, rejection_reason, created_at,
       CASE status
         WHEN 'PENDING' THEN created_at
         WHEN 'COMPLETED' THEN strftime('%Y-%m-%dT%H:%M:%fZ', return_at, '+1 hour')
         ELSE strftime('%Y-%m-%dT%H:%M:%fZ', created_at, '+1 hour')
       END
FROM journeys;
