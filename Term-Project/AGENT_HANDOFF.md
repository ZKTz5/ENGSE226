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
- **Service Layer**: Business logic is separated into `services/` (`authService.js`, `scheduleService.js`, `bookingService.js`, `shuttleDb.js`).
- **Auth**: JWT-based authentication using `jsonwebtoken`. Password hashing via `node:crypto` (scrypt).
- **Validation**: Pure functions in `validators/shuttleValidator.js` for login payloads and schedule filters.
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

## Remaining Handover Work

- Select persistent production database/storage; the configured Render free plan uses ephemeral local SQLite.
- Back up and explicitly migrate/reset any developer database that still has the Campus Service schema.
- Prepare deployment evidence after persistent storage and environment secrets are configured.

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
  password_hash TEXT,
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
  waitlist_seq INTEGER,
  created_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (schedule_id) REFERENCES schedules(id)
);

CREATE INDEX idx_schedules_search ON schedules(origin_id, destination_id, departure_time);
CREATE INDEX idx_bookings_fifo ON bookings(schedule_id, created_at, id);
CREATE UNIQUE INDEX idx_bookings_active_user_schedule
  ON bookings(user_id, schedule_id) WHERE status != 'cancelled';
```

## Proposed API Contract

- `POST /api/auth/login`: `{ email, password }`; validates the `@rmutl.ac.th` domain and returns a JWT.
- `GET /api/schedules`: Query params: `originId`, `destinationId`, `date`
- `GET /api/campuses`: list of supported campuses

Note on authentication:

- `POST /api/auth/register` is NOT required by the RMUTL Shuttle spec and is NOT
  in the existing API. The spec only requires institutional-email login.
- If registration is NOT implemented, `users` must be seeded directly via
  `schema.sql` or the `create-user` script so a real login is possible in
  the primary flow (do not rely on mock data for the primary flow).
- `GET /api/schedules/:id`: Detail with current booking status
- `POST /api/bookings`: `{ scheduleId }` (Authenticated)
- `GET /api/bookings/my`: List of user's bookings
- `DELETE /api/bookings/:id`: Cancel booking (triggers waitlist promotion)

## Implementation Risks

- **Concurrency**: SQLite handles multiple writes via file locking, but `BEGIN IMMEDIATE` transactions are required to ensure `available_seats` doesn't drop below zero under load.
- **FIFO and remote transactions**: Local SQLite promotes waitlisted rows by
  `(created_at, id)`. The Turso branch still needs driver and concurrency
  verification before making the same claim for a deployed remote database.
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

## Current Status (2026-10-06)

The shuttle migration from commit `5209174` was reviewed and preserved. Backend
work and shuttle frontend flows are implemented. Deployment checks and evidence
remain.

## Sprint 1–4 Gap Analysis (2026-10-06)

| Sprint | Already implemented | Remaining at start of this phase |
|---|---|---|
| 1 — Database and authentication | Shuttle schema/seed, `@rmutl.ac.th` login, JWT, password hashing, protected booking routes, missing/domain/credential tests, incompatible-schema startup guard, production JWT secret requirement | Before starting against the local legacy DB, an operator must back it up and explicitly reset or migrate it; automatic destructive migration is intentionally not performed. |
| 2 — Campuses and schedules | Three campus records, route/date filters, same-campus validation, API counts, runtime expiry and booking rejection, frontend search/list/detail | No functional gap identified; filter and expiry tests already run. |
| 3 — Booking and waitlist | Atomic local SQLite booking/cancellation, duplicate prevention, waitlisting, ownership checks, FIFO by `(created_at, id)`, promotion | Functional requirements and local concurrency cases are covered. A remote driver is not configured; its concurrency behavior is not verified and cannot be claimed. |
| 4 — Frontend and handover | Login, dashboard, schedule search/list/detail, My Bookings, booking/cancellation actions, booking/waitlist outcome, API connection, responsive styling, loading/empty/error states, corrected Render service/root and secret prompt, shuttle root checks | Configured SQLite storage is ephemeral; use supported persistent storage before relying on deployed bookings, then perform build/deployment evidence checks. |

Remaining operational tasks: back up and migrate/reset any local old-schema DB;
select persistent production database/storage; deploy with the required `JWT_SECRET`;
verify concurrency on the selected remote driver if applicable; prepare deployment
evidence.

### Backend implementation

- [x] Shuttle schema, seed data, authentication, campus/schedule APIs, booking,
  cancellation, and waitlist promotion remain in the existing Express/SQLite
  architecture.
- [x] Validate optional schedule filters (`originId`, `destinationId`, `date`),
  reject malformed values and same-campus filters, and return HTTP 400 with
  field details.
- [x] Derive schedule expiration from departure time in schedule responses and
  reject booking after departure, even if the stored status remains `active`.
- [x] Replace request validator naming with `shuttleValidator.js`; remove the
  unused request middleware and references to the deleted request service from
  the API checker, account script, and backend tests.
- [x] Replace legacy request tests with shuttle auth, schedule, filter, booking,
  and expiration coverage. Keep the existing password tests.
- [x] Update database setup foreign-key reporting and API smoke checks for the
  shuttle schema. The smoke check uses a fresh in-memory DB to avoid touching a
  pre-existing local database file.
- [x] Replace the obsolete `create-staff` script with `create-user` for
  institutional `user` or `admin` accounts; update the project README.

### Verification

- Backend suite: **PASS**, `npm test --prefix api` — 44 tests in 7 files.
- Backend smoke check: **PASS**, `npm run check --prefix api` — 4/4 checks.
- Root check: **PASS**, `npm run check` — API 4/4 and frontend 4/4.
- Root test suite: **PASS**, `npm test` — backend 44/44 and frontend 7/7.
- Root production build: **PASS**, `npm run build` — frontend bundle generated and API dependencies installed.
- `git diff --check`: passed.
- Frontend suite: **PASS**, `npm test --prefix frontend` — 7 tests in 2 files.
- Frontend production build: **PASS**, `npm run build --prefix frontend`.

### Remaining project work

- Frontend login, dashboard, schedule search/list/detail, API integration,
  responsive layout, and loading/empty/error states are implemented. The JWT is
  kept in app memory and sent with API requests; a page reload signs the user out.
- Verify transaction behavior if a remote DB driver is selected; local SQLite
  concurrency cases pass, but no remote DB is configured or verified.
- An existing `data/campus.db` can still contain the original Campus Service
  schema. Startup now fails with a backup/reset instruction instead of failing
  later on missing tables. After backing it up, explicitly run
  `npm run db:reset --prefix api` before using that local DB.
- Render SQLite storage is ephemeral on the configured free plan; deployment is
  not ready for persistent booking data until a persistent database/storage target
  is selected. No production deployment or persistent database has been verified.

### Changes in this phase

- `source/api/src/validators/shuttleValidator.js`: login and schedule-filter validation.
- `source/api/src/routes/scheduleRoutes.js`: HTTP 400 filter errors.
- `source/api/src/services/shuttleDb.js`, `scheduleService.js`, and `bookingService.js`:
  departure-time expiry check shared by schedule display and booking.
- Backend auth/schedule tests migrated from request-domain tests to shuttle equivalents.
- Removed the request-oriented checker and middleware; updated setup-db, account
  tooling, package scripts, and project documentation for the shuttle domain.
- Booking FIFO promotion now orders by `created_at`, then `id`, matching the requirement.
- Tests cover equal-timestamp FIFO tie-breaking, duplicate waitlist prevention,
  cancellation ownership, no promotion on waitlist cancellation, and six concurrent
  users competing for one seat; backend suite passes 44/44.
- Added `assertShuttleSchema()` so a legacy DB is never mistaken for a valid Shuttle DB;
  unit tests verify both incompatible and complete table sets.
- Production config now refuses to start without `JWT_SECRET`; the Render blueprint
  uses the actual repository root, shuttle service name, and prompts for the secret.
- Added config tests for development fallback and production secret requirements.
- Replaced the missing root checker and stale frontend Campus Service checker with
  working Shuttle checks; root checks pass 8/8 total.

### Frontend phase (2026-10-06)

- Reused `AppLayout`, `LoadingState`, `ErrorState`, and the existing fetch client;
  replaced the request dashboard and header with RMUTL shuttle navigation.
- Added institutional login, a live dashboard, campus/date schedule search,
  schedule cards and detail pages, plus a reusable empty state.
- Added shuttle API services for login, campuses, filtered schedules, and details.
  Successful login stores the JWT in app memory; `apiFetch` sends it as a bearer
  token on subsequent API requests without browser storage.
- Initial frontend milestone: tests **PASS**, 6/6; production build **PASS**.
- Added My Bookings, confirmed/waitlisted/cancelled booking views, cancellation
  actions, schedule booking/waitlist actions, and outcome notices. Booking APIs
  refresh details after success and expose API errors to the user.
- Extended service tests for reading bookings, booking, and cancellation.
- Frontend tests: **PASS**, 7/7. Production build: **PASS**.
- The inactive tracked Campus Service files remain outside the active route tree.
