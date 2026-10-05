-- ═══════════════════════════════════════════════════════════
-- RMUTL Shuttle Booking — schema
-- PRAGMA foreign_keys = ON (open on every connection)
-- ═══════════════════════════════════════════════════════════

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS schedules;
DROP TABLE IF EXISTS campuses;
DROP TABLE IF EXISTS users;

-- users — login by @rmutl.ac.th email
CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  password_hash TEXT,  -- scrypt$salt$hash; NULL = cannot log in
  created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- campuses
CREATE TABLE campuses (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

-- schedules — one shuttle trip per (origin, destination, departure_time)
-- available_seats = capacity - confirmed - waitlisted
--   recomputed inside every booking transaction (prevents overbooking)
CREATE TABLE schedules (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  origin_id       INTEGER NOT NULL,
  destination_id  INTEGER NOT NULL,
  departure_time  TEXT NOT NULL,   -- ISO8601 UTC
  capacity        INTEGER NOT NULL DEFAULT 10,
  available_seats INTEGER NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (origin_id)      REFERENCES campuses(id),
  FOREIGN KEY (destination_id) REFERENCES campuses(id)
);

-- bookings
-- waitlist_seq: monotonic sequence assigned inside the INSERT transaction
--               (MAX+1 per schedule). FIFO order by (waitlist_seq, id).
CREATE TABLE bookings (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL,
  schedule_id  INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'confirmed'
               CHECK (status IN ('confirmed','waitlisted','cancelled')),
  waitlist_seq INTEGER,
  created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (user_id)     REFERENCES users(id),
  FOREIGN KEY (schedule_id) REFERENCES schedules(id)
);

CREATE INDEX idx_schedules_search ON schedules(origin_id, destination_id, departure_time);
CREATE INDEX idx_bookings_fifo    ON bookings(schedule_id, waitlist_seq, id);
CREATE INDEX idx_bookings_user    ON bookings(user_id);
-- Permit rebooking after cancellation while preventing duplicate active bookings.
CREATE UNIQUE INDEX idx_bookings_active_user_schedule
  ON bookings(user_id, schedule_id) WHERE status != 'cancelled';

-- ═══════════════════════════════════════════════════════════
-- Seed data (reset on every schema run → consistent test state)
-- ═══════════════════════════════════════════════════════════
INSERT INTO campuses (name) VALUES
  ('Doi Saket'),
  ('Jed Yod'),
  ('Chiang Mai');

-- Test users (password: 'rmutl1234' for every account; hashes built with utils/password.js)
INSERT INTO users (name, email, role, password_hash) VALUES
  ('Tan K.',        'tan.khanit@rmutl.ac.th',   'user',  'scrypt$b884bfa0494f6fec517d0a80cb1f9098$38a54ef3d947f3a342b691dff65bacdd3ba5ef009de3aaeaa18f45ec0adb938f1de54821c9b78f45dc54d2ccec98b06102cfcead091366c0416e639c67540c7d'),
  ('Patchara W.',   'patchara.w@rmutl.ac.th',   'user',  'scrypt$96a1ffbb2f324b5130eabf23d1b8c406$f7bc8ae041762f7fef7b7ef3eca8f758e07240d19547cf4b912d5f87f0f021ee767354545c082595113b95d159c9b0074bf741f3bff58346287d78da19d58a8a'),
  ('Anon P.',       'anon.p@rmutl.ac.th',       'user',  'scrypt$f2d339506cf84f3d53644af5ce301941$59ebd72e21b810e99145fbb50f3faf1863bb0e68a3f7498e1d74d6751be4e069988e656fb86b064956e1dabf4d0c0238184af5cfa1c7de0a23c619d4606e3de3'),
  ('Wanchalern P.', 'wanchalern.p@rmutl.ac.th', 'user',  'scrypt$f130d2bc28486ac32ffb52973978932a$7a803220ec646e781945bf75d54ed4752e25e9e9d6064c5be62cb8388b6ae7676f746dcfc82b4ce49bb21cb0649a2fdd8803625ca4671926e50d0852c9953981'),
  ('Wichapong R.',  'wichapong.r@rmutl.ac.th',  'user',  'scrypt$cd8b141e6cb61e1153de50872077e89b$ae87e6e6d475bb0a2b44c871d2d8d3c010ee86b093bd102b9efcc7c0cc762709357344285a47f8f40c911acd6527e47ec5401377b3ff3e5590a8cf8a536cdceb'),
  ('Nilchar K.',    'nill.rattan@rmutl.ac.th',  'user',  'scrypt$aaf0c2ca659a8dfe2e4915737a27b5a4$29041e0af2141d8218b6a7c48df238caf2e0c3068eca1176a1f2acea08baf5ca64afe4fafabade16ada7ba6398ff5cc0c623f467d2836a3a9af91b68d877b2f5'),
  ('Thanut K.',     'thanut.k@rmutl.ac.th',     'user',  'scrypt$477cfa4abfd826f7dbe1fc790604f3ef$5c45c11c4466634d17eec7f83e52fb09742d996d260ef09190f92ea143a37830be3a6b17fb14e4d104a6758f43577f6c57feb18a971029d65b6d0616dfabc30a'),
  ('Akachai C.',    'akachai.c@rmutl.ac.th',    'user',  'scrypt$51bb2342fa761c3b1a7996ecc0c3d98d$03535b1991a6b6df556838c3340b9ab5c28fab82939f9e3fd120c18484564d660565069547521e72b7109b694c5bffbd2a4cb204c216b406084df39d96dfd120'),
  ('Wichian K.',    'wichian.k@rmutl.ac.th',    'user',  'scrypt$9c01ffe90090035388d7ad976721fe02$4bb91cf46a6b5bc3a824581354456b712244c9d06331a4c8d14a8885859473917cabc698e956638789d0ff781de206076e2724a0e8fffad611023ac25862b7b1'),
  ('Admin RMUTL',   'admin@rmutl.ac.th',        'admin', 'scrypt$2f853982555392b3ce888d0a2d085855$48cfc13f90cece31db5a8c5d27a23699fe816520ec5fbed3f4e027296ca56734670c2628553d571197798f9e378998fd4dfa10ba550674734cbd583897d36619');

-- 8 schedules: 3 expired (past) + 5 active. Seed available_seats = capacity (no bookings yet).
INSERT INTO schedules (origin_id, destination_id, departure_time, capacity, available_seats, status) VALUES
  (1, 2, datetime('now','localtime','+00:00','-3 days'),  10, 10, 'expired'),
  (1, 3, datetime('now','localtime','+00:00','-3 days'),  10, 10, 'expired'),
  (2, 3, datetime('now','localtime','+00:00','-1 day'),   10, 10, 'expired'),
  (1, 2, datetime('now','localtime','+00:00','+1 day'),   10, 10, 'active'),
  (1, 3, datetime('now','localtime','+00:00','+1 day'),   10, 10, 'active'),
  (2, 1, datetime('now','localtime','+00:00','+1 day'),   10, 10, 'active'),
  (3, 2, datetime('now','localtime','+00:00','+2 days'),  10, 10, 'active'),
  (3, 1, datetime('now','localtime','+00:00','+2 days'),  10, 10, 'active');
