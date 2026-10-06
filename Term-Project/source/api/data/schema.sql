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
