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

## Remaining Frontend Files

- `source/frontend/src/App.jsx` (Add shuttle routes)
- `source/frontend/src/services/requestService.js` (Replace with shuttle API client)
- `source/frontend/src/pages/` (Add schedules, schedule detail, and My Bookings pages)
- `source/frontend/src/components/` (Replace request-specific UI with shuttle UI)

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
CREATE INDEX idx_bookings_fifo ON bookings(schedule_id, waitlist_seq, id);
CREATE UNIQUE INDEX idx_bookings_active_user_schedule
  ON bookings(user_id, schedule_id) WHERE status != 'cancelled';
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
- **FIFO and remote transactions**: Local SQLite assigns `waitlist_seq` inside
  the booking transaction and promotes by `(waitlist_seq, id)`. The Turso branch
  still needs driver and concurrency verification before making the same claim
  for a deployed remote database.
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

The shuttle migration from commit `5209174` was reviewed and preserved. The
backend scope requested in this phase is implemented; the frontend remains the
Campus Service UI and is outside this backend phase.

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

- Backend suite: **PASS**, `npm test --prefix api` — 37 tests in 5 files.
- Backend smoke check: **PASS**, `npm run check --prefix api` — 4/4 checks.
- `git diff --check`: passed.
- Frontend build: not run in this backend phase; previous environment attempt
  failed while initializing Qt's `xcb` plugin and remains unverified.

### Remaining project work

- Frontend login and shuttle pages, API integration, responsive layouts, and
  loading/empty/error/success/expired/full states remain pending.
- Add concurrent booking coverage and verify transaction behavior on any
  deployed Turso driver; current test coverage uses local in-memory SQLite.
- The existing ignored `data/campus.db` can still contain the original Campus
  Service schema. `db:setup` intentionally does not overwrite an existing DB;
  migrate or explicitly reset that database before using the shuttle server.
- Review deployment configuration and prepare deployment evidence after the
  frontend conversion.

### Changes in this phase

- `source/api/src/validators/shuttleValidator.js`: login and schedule-filter validation.
- `source/api/src/routes/scheduleRoutes.js`: HTTP 400 filter errors.
- `source/api/src/services/shuttleDb.js`, `scheduleService.js`, and `bookingService.js`:
  departure-time expiry check shared by schedule display and booking.
- Backend auth/schedule tests migrated from request-domain tests to shuttle equivalents.
- Removed the request-oriented checker and middleware; updated setup-db, account
  tooling, package scripts, and project documentation for the shuttle domain.
