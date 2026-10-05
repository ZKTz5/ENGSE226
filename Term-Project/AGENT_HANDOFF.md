# RMUTL Shuttle Agent Handoff

## Objective

Transform the existing Campus Service full-stack project into an
RMUTL Shuttle Booking System.

Application source code is located in:

- `./source/api`
- `./source/frontend`

Both agents must read this file before making changes and update it
after completing each phase.

## Agent Roles

### Gemini CLI: Primary Implementation Agent

Responsible for:

- Repository-wide analysis
- Database schema and seed data
- Backend API
- Frontend and API integration
- Booking and cancellation
- Waitlist FIFO logic
- Integration and concurrency tests
- Running tests and builds

### Cline with Qwen 27B: Review and Fix Agent

Responsible for:

- Reviewing the latest Git diff or commit
- Finding broken imports and regressions
- Checking frontend/API contract consistency
- Checking authentication and validation
- Checking booking race conditions
- Checking FIFO waitlist behavior
- Making only necessary fixes
- Running relevant tests after fixes

Agents must not edit the repository at the same time.

## Existing Project

The current Campus Service project already includes:

- React frontend
- Node.js API
- SQLite database
- Authentication
- Middleware
- Controllers and services
- Validation
- Unit and integration tests

The existing Request domain should be reused where practical, but the
final domain must use Shuttle-specific concepts and naming.

## Final Requirements

### Authentication

- Login using institutional email ending with `@rmutl.ac.th`
- Return and use a JWT token
- Validate required fields
- Show clear errors for invalid domain and invalid credentials
- Protect authenticated endpoints

### Campus and Route Data

Supported campuses:

- Doi Saket
- Jed Yod
- Chiang Mai

Users must be able to select:

- Origin
- Destination
- Travel date

Origin and destination must not be the same.

### Schedules

Each schedule must contain:

- Route
- Travel date
- Departure time
- Capacity
- Confirmed booking count
- Available seats
- Status

Requirements:

- Obtain schedule information from the API and database
- Calculate or return available seats correctly
- Mark past schedules as expired
- Expired schedules cannot be booked
- Support filtering by origin, destination, and date

### Booking

- Authenticated users can book a schedule
- One user can book each schedule only once
- Prevent duplicate bookings
- Prevent booking an expired schedule
- Prevent overbooking
- Users can view their bookings
- Users can cancel confirmed bookings
- Booking changes must be atomic

### Waitlist

- If no seats remain, add the user to the waitlist
- Prevent duplicate waitlist entries
- FIFO order uses `created_at`, then `id` as a tie-breaker
- When a confirmed booking is cancelled, promote the first waiting user
- Cancellation and promotion must occur within one atomic transaction

### Frontend

Required pages and flows:

- Login
- Dashboard
- Schedule search
- Schedule list
- Schedule detail
- My bookings
- Booking and cancellation actions

Required states:

- Loading
- Empty
- Error
- Success
- Expired
- Full or waitlisted

The interface must work on desktop and mobile layouts.

### Testing

Required verification:

- Authentication success
- Invalid institutional email domain
- Missing required fields
- Route and schedule API
- Filtering schedules
- Expired schedule behavior
- Duplicate booking prevention
- Overbooking prevention
- Booking cancellation
- FIFO waitlist promotion
- Concurrent booking requests
- Frontend production build

Agents must not claim that tests pass unless the commands were actually
executed successfully.

## Implementation Order

1. Analyze the existing repository
2. Preserve the working Campus Service baseline
3. Define database schema and API contract
4. Implement route and schedule database tables
5. Add seed data
6. Implement route and schedule APIs
7. Integrate authentication
8. Transform the frontend into the Shuttle UI
9. Connect the frontend to real API data
10. Implement booking and cancellation
11. Implement waitlist and FIFO promotion
12. Add concurrency and integration tests
13. Run all tests and production builds
14. Prepare screenshots and deployment documentation

## Current Architecture

### Backend (Express.js)
- **Framework**: Express 5.1.0 with ESM (type: module).
- **Database**: SQLite (libsql 0.5.29) with `node:sqlite` fallback.
- **Service Layer**: Business logic is separated into `services/` (e.g., `authService.js`, `requestService.js`).
- **Auth**: JWT-based authentication using `jsonwebtoken`. Password hashing via `node:crypto` (scrypt).
- **Validation**: Pure functions in `validators/` for request payload validation.
- **Error Handling**: Centralized `errorHandler.js` middleware.
- **Tests**: Vitest for unit and integration testing.

### Frontend (React)
- **Framework**: React 19 with Vite 8.
- **Routing**: React Router 7.
- **State Management**: Local component state with centralized API services in `services/apiClient.js`.
- **Layout**: `AppLayout.jsx` provides a consistent shell with header and navigation.

## Reusable Files

- `source/api/src/services/authService.js` (Login/token logic)
- `source/api/src/middleware/auth.js` (Authentication/Role middleware)
- `source/api/src/utils/password.js` (Secure hashing)
- `source/api/src/middleware/errorHandler.js` (Standard error responses)
- `source/frontend/src/services/apiClient.js` (Fetch wrapper with base URL)
- `source/frontend/src/components/LoadingState.jsx` / `ErrorState.jsx`

## Files to Modify

- `source/api/data/schema.sql` (Replace current tables with Shuttle schema)
- `source/api/src/app.js` (Update route registrations)
- `source/api/src/validators/requestValidator.js` -> Rename to `source/api/src/validators/shuttleValidator.js`
- `source/api/src/services/authService.js` (Add institutional email validation)
- `source/frontend/src/App.jsx` (New routes for schedules and bookings)
- `source/frontend/src/services/requestService.js` -> Rename to `source/frontend/src/services/shuttleService.js`

## Files to Create

- `source/api/src/routes/scheduleRoutes.js`
- `source/api/src/routes/bookingRoutes.js`
- `source/api/src/services/scheduleService.js`
- `source/api/src/services/bookingService.js`
- `source/api/tests/integration/booking.api.test.js`
- `source/api/tests/unit/waitlist.test.js`
- `source/frontend/src/pages/SchedulesPage.jsx`
- `source/frontend/src/pages/BookingDetailPage.jsx`
- `source/frontend/src/pages/MyBookingsPage.jsx`

## Proposed Database Schema

```sql
PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS schedules;
DROP TABLE IF EXISTS campuses;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE campuses (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL UNIQUE -- Doi Saket, Jed Yod, Chiang Mai
);

CREATE TABLE schedules (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  origin_id       INTEGER NOT NULL,
  destination_id  INTEGER NOT NULL,
  departure_time  TEXT NOT NULL, -- ISO8601 string
  capacity        INTEGER NOT NULL DEFAULT 10,
  available_seats INTEGER NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired')),
  FOREIGN KEY (origin_id) REFERENCES campuses(id),
  FOREIGN KEY (destination_id) REFERENCES campuses(id)
);

CREATE TABLE bookings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  schedule_id INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'waitlisted', 'cancelled')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (schedule_id) REFERENCES schedules(id),
  UNIQUE(user_id, schedule_id) WHERE status != 'cancelled'
);

CREATE INDEX idx_schedules_search ON schedules(origin_id, destination_id, departure_time);
CREATE INDEX idx_bookings_fifo ON bookings(schedule_id, created_at, id);
```

## Proposed API Contract

- `POST /api/auth/login`: `{ email, password }` (endpoint already exists; add `@rmutl.ac.th` domain check)
- `GET /api/schedules`: Query params: `originId`, `destinationId`, `date`
- `GET /api/campuses`: list of supported campuses

Note on authentication:

- `POST /api/auth/register` is NOT required by the RMUTL Shuttle spec and is NOT
  in the existing API. The spec only requires institutional-email login.
- The existing `login` restricts access to `role === 'staff'`. To support any
  RMUTL user, `authService.js` and the role check must be changed so the
  `user` role (not just staff) can authenticate and book.
- If registration is NOT implemented, `users` must be seeded directly via
  `schema.sql` or `create-staff`-style scripts so a real login is possible in
  the primary flow (do not rely on mock data for the primary flow).
- `GET /api/schedules/:id`: Detail with current booking status
- `POST /api/bookings`: `{ scheduleId }` (Authenticated)
- `GET /api/bookings/my`: List of user's bookings
- `DELETE /api/bookings/:id`: Cancel booking (triggers waitlist promotion)

## Implementation Risks

- **Concurrency**: SQLite handles multiple writes via file locking, but `BEGIN IMMEDIATE` transactions are required to ensure `available_seats` doesn't drop below zero under load.
- **FIFO Accuracy (tie-breaking is NOT fully deterministic)**: `created_at` is a
  second-resolution `TEXT` timestamp, so many concurrent bookings share the same
  `created_at`. `id` only breaks the tie when inserts are sequential. Under the
  existing DB pool, inserts from different connections can have overlapping
  `id` ordering, so promotion order is not guaranteed. Recommend adding a
  monotonic `waitlist_seq INTEGER` column set to `MAX(waitlist_seq)+1` inside
  the booking transaction, and order FIFO by `(waitlist_seq, id)`.
- **Timezone Drift**: Standardizing on ISO8601 strings and server-side `datetime('now')` is critical.
- **Waitlist Loop**: Cancellation of a waitlisted entry should NOT trigger a promotion, only cancellation of a confirmed entry.

## Implementation Order

1. **Phase 1: DB & Auth Migration**
   - Update `schema.sql` and `authService.js` (RMUTL domain check).
   - Reconcile roles so authenticated RMUTL users (not just staff) can book.
   - Seed real users (registration is optional and not required by the spec).
2. **Phase 2: Schedule Engine**
   - Implement `campuses` and `schedules` services/routes.
   - Add seed data for testing.
3. **Phase 3: Booking & Waitlist Logic**
   - Implement atomic `POST /api/bookings`.
   - Implement `DELETE /api/bookings/:id` with FIFO promotion.
4. **Phase 4: Frontend Transformation**
   - Refactor UI to Shuttle domain.
   - Build Search, List, Detail, and My Bookings pages.
5. **Phase 5: Validation & Testing**
   - Run concurrency tests for bookings.
   - Verify FIFO waitlist promotion.
   - Full integration test suite.

> Note: the earlier 14-step "Implementation Order" and this "Phase 1-5" list
> describe the same work; keep both in sync when updating this file.

## Current Status

### Completed

- [x] Existing Campus Service repository available
- [x] Frontend foundation available
- [x] Backend foundation available
- [x] SQLite database foundation available
- [x] Authentication foundation available
- [x] Existing test structure available
- [x] Repository analysis and migration plan

### In Progress

- [ ] Shuttle database schema

### Pending

- [ ] Seed routes and schedules
... (rest of the file) ...

- [ ] Schedules API
- [ ] Shuttle frontend
- [ ] Frontend/API integration
- [ ] Booking
- [ ] Cancellation
- [ ] Waitlist
- [ ] FIFO promotion
- [ ] Concurrency tests
- [ ] Final test and build verification
- [ ] Deployment and handover evidence

## Current Phase

Repository analysis only.

The first agent must inspect the entire repository and update this
document before changing implementation files.

## Decisions

- Keep the existing React, Node.js, and SQLite stack
- Reuse the existing authentication implementation where possible
- Reuse existing components and service patterns where practical
- Do not retain Request terminology in the final user-facing system
- Do not replace working architecture without a documented reason
- Do not use mock data in the final primary user flow
- Commit after each successful implementation phase

## Safety Rules for Agents

- Do not delete existing tests to make the test suite pass
- Do not overwrite environment files or secrets
- Do not commit API keys, tokens, or passwords
- Do not modify unrelated files
- Do not perform large rewrites without documenting the reason
- Do not report completion without running tests
- Do not allow both agents to edit files simultaneously
- Stop the current phase if the baseline project no longer runs

## Test Results

Not executed for the Shuttle implementation yet.

| Check | Status |
|---|---|
| Backend tests | NOT RUN |
| Frontend tests | NOT RUN |
| Frontend build | NOT RUN |
| API integration tests | NOT RUN |
| Concurrency tests | NOT RUN |

## Changed Files

No Shuttle implementation files changed yet.

## Known Issues

- Booking and waitlist logic do not appear to be implemented yet
- Deployment configuration must be checked before final delivery

## Technical Review — Verified Assumptions (2026-10-05)

Repository inspection confirmed:

- Express 5.1.0 ESM backend (`type: module`), service/controller/middleware
  split, centralized `errorHandler.js`.
- React 19 + Vite 8 + React Router 7 frontend; API calls via
  `services/apiClient.js` (fetch wrapper), `services/requestService.js`.
- DB layer: `services/requestService.js` uses `node:sqlite` (`DatabaseSync`)
  by default and `libsql` (`new Database(url, {authToken})`) when
  `TURSO_DATABASE_URL` is set.
- Authentication: JWT via `jsonwebtoken`; password hashing via
  `node:crypto` scrypt (`scrypt$<salt>$<hash>`); `authenticate`/`requireRole`
  middleware.
- Existing schema: `users` (name, department, email, role `requester`/`staff`,
  nullable `password_hash`), `requests` (TEXT PK `REQ-00n`).
- Package scripts: api `dev|start|check|test|db:setup|db:reset|test:watch|
  coverage|create-staff`; frontend `dev|check|build|preview|verify|test`;
  root `build|start|test|coverage|check`.
- Existing tests: `tests/unit/password.test.js`,
  `tests/unit/requestValidator.test.js`, `tests/integration/
  auth.api.test.js`, `tests/integration/requests.api.test.js`
  (integration tests call `loadSeed()` in `beforeEach` and use
  `DB_FILE=':memory:'` via `vitest.config.js`).

Issues found in the proposed plan:

1. **Authentication flow not preserved by the proposed schema.**
   - `users.role` changes `requester/staff` → `user/admin`, but
     `authService.login` still checks `role === 'staff'` and
     `requireRole('staff')` is used on the existing PUT/DELETE routes.
     Roles must be reconciled in one pass or existing tests break.
   - `users.password_hash` becomes `NOT NULL`, but seeded `requester` users
     have `NULL` — seeding must provide hashes or use a nullable column.
   - `department` is dropped, but `GET /api/users` currently returns it and
     `requests.api.test.js` expects 5 users without email. If `/api/users` is
     kept, the service and its test must be updated in Phase 1.

2. **`BEGIN IMMEDIATE` + the existing libsql path is not verified/working.**
   - `openDatabase()` uses `new Database(url, {authToken})` from `libsql`, but
     that is the async **Client** API (`libsql` v0.5 exposes `Client` and
     `createClient`, not a synchronous `Database` constructor). The sync
     `db.exec('BEGIN IMMEDIATE')` pattern used for overbooking prevention
     therefore does not work on the current Turso path.
   - The deterministic FIFO/transaction work is only guaranteed on a single
     synchronous local connection. Concurrency tests must run against the
     same driver that is used at runtime, and the Turso path must either be
     fixed or excluded from the concurrency guarantees.
   - Environment note: `package.json` requires Node `>=22.13.0`; the dev box
     observed during review is Node 18 where `node:sqlite` is unavailable.
     Confirm the runtime Node version before relying on `node:sqlite`.

## Instructions for the Next Agent

1. Read this entire file
2. Inspect both `./source/api` and `./source/frontend`
3. Inspect all package scripts and existing tests
4. Do not modify implementation files yet
5. Update this document with:
   - Current architecture
   - Reusable files
   - Files to modify
   - Files to create
   - Proposed database schema
   - Proposed API contract
   - Implementation risks
6. Report the analysis before starting implementation