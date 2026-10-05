# RMUTL Shuttle Booking System — Final Audit Report

Audit date: 2026-10-06  
Source of truth: current repository implementation and verification run recorded below.

## Result

The approved two-location domain, exact institutional login domain, bilingual active UI, warm responsive theme, API-confirmed booking feedback, cancellation confirmation, and optional help guide are implemented on top of the existing Express, React, SQLite, JWT, and scrypt application. The automated test suites, structural checks, disposable-database checks, HTTP smoke flow, production build, and final diff check are recorded below. A graphical browser E2E run and production deployment were not performed.

## Feature checklist

| Feature | Status | Evidence |
|---|---|---|
| Exactly two service locations, Jed Yod and Doi Saket | PASS | Seed reset and HTTP campus list return exactly those names; seeded schedules use both opposite directions only. |
| Opposite travel directions; no same-location route | PASS | Schedule seed, API validation, UI validation, tests. |
| Login only with exact `@live.rmutl.ac.th`, case-insensitive | PASS | Backend and frontend validators, seeded accounts, operator account tool, auth tests, HTTP smoke. No registration endpoint/page/link exists. |
| JWT and scrypt authentication | PASS | Existing auth architecture retained; protected booking routes use bearer JWT. |
| Schedule search, list, details, date filter and derived expiry | PASS | Live API-backed active pages; expired schedules are unavailable for booking. |
| Booking, duplicate protection, overbooking prevention | PASS | Transactional service, unique active-booking constraint, integration and concurrency tests. |
| Cancellation, ownership checks, FIFO waitlist promotion | PASS | Cancellation transaction promotes by `created_at`, then booking `id`; integration tests cover ties and cancellation cases. |
| Thai and English UI | PASS | Thai first-visit default; `ไทย | EN` switch updates without reload; optional persisted selection; dictionary fallback; translated active screens and guide. |
| Warm, responsive, accessible UI | PASS | Shared CSS variables, visible focus, responsive rules, semantic dialog, reduced-motion support. No university/custom logo; text wordmark and generic bus motif only. |
| Booking feedback | PASS | Ticket uses actual API response and appears only after success. Waitlist has no confirmed stamp and no fabricated queue position. |
| Optional user guide | PASS | Normal `/guide` route and user-selected nav item, no onboarding interruption. |
| Loading, empty, error, success feedback | PASS | Shared states and active flow feedback. |

## API checklist

| Endpoint | Access | Purpose |
|---|---|---|
| `GET /api` | Public | API identity/status information. |
| `GET /api/health` | Public | Health and database connectivity. |
| `POST /api/auth/login` | Public | Validates credentials and exact institutional email domain; returns JWT and user data. |
| `GET /api/campuses` | Public | Returns the two supported service locations. |
| `GET /api/schedules?originId=&destinationId=&date=` | Public | Validates filters; returns matching schedules with current seats/counts/status. |
| `GET /api/schedules/:id` | Public | Returns schedule detail. |
| `POST /api/bookings` | Bearer JWT | Creates confirmed or waitlisted booking. |
| `GET /api/bookings/my` | Bearer JWT | Lists the authenticated user’s bookings. |
| `DELETE /api/bookings/:id` | Owner bearer JWT | Cancels the owner’s booking; confirmed cancellation may promote the first waiter. |
| `DELETE /api/bookings/:id/cancel-admin` | Admin bearer JWT | Administrative cancellation. |

There is no registration API. Accounts come from the seed or an operator running the account provisioning script.

## Database schema summary

- `users`: unique institutional email, name, role, scrypt password hash, creation time.
- `campuses`: unique location names; seed is exactly Jed Yod and Doi Saket.
- `schedules`: origin/destination foreign keys, departure timestamp, capacity, available seats, stored status and creation time. Runtime expiry is derived from departure time.
- `bookings`: user/schedule references, confirmed/waitlisted/cancelled status, diagnostic waitlist sequence and creation timestamp.
- Indexes cover schedule search, FIFO order, and user bookings. A partial unique index prevents multiple non-cancelled bookings by the same user for the same schedule.
- Booking/cancellation use SQLite immediate transactions; cancellation and FIFO promotion occur atomically.

### Safe development database reset

To initialize an isolated disposable database from `source/`:

```bash
DB_FILE=/tmp/rmutl-shuttle-dev.db npm run db:reset --prefix api
```

To explicitly reset the default developer database, stop the API first, then run `npm run db:reset --prefix api`. The script makes a timestamped backup beside an existing file before replacing it. Review and preserve that backup. Do not run reset against production or a user database. Startup does not silently migrate or delete an incompatible Campus Service database.

## Test summary (executed 2026-10-06)

From `source/`:

- `npm test` — PASS: backend **49/49** across 7 files; frontend **17/17** across 4 files.
- `npm run check` — PASS: API **4/4**, frontend **7/7**.
- `npm run build` — PASS: Vite production build and root build script completed.
- `git diff --check` — PASS after final documentation edits.
- Disposable reset — PASS: 2 approved campuses, 8 schedules, 10 seeded live-domain users, only the two opposite route pairs, no invalid schedule endpoints.
- HTTP smoke against that disposable DB — PASS: exact campus list; mixed-case live-domain login; rejection of old/lookalike domains; confirmed booking; waitlist result; duplicate rejection; cancellation and FIFO promotion; expired booking rejection.
- Backend integration suite includes concurrent users competing for the last seat and deterministic FIFO tie-breaking.
- No graphical browser was installed, so no browser click-through E2E, visual screenshot, or manual animated interaction run is claimed. Language toggle, fallback, reduced-motion rules, guide wiring, and UI structure are covered by unit/static checks and build.

## Demo script

1. Start the API and frontend using the commands below, then open the Vite URL.
2. Show Thai as the initial language and switch to English using `ไทย | EN`; show the User Guide only after selecting its navigation item.
3. Show the dashboard, then search between Jed Yod and Doi Saket for a date. Point out the same-origin validation.
4. Open a schedule detail and explain departure, capacity, availability, status, and expiry behavior.
5. Log in with a seed demo account, e.g. `tan.khanit@live.rmutl.ac.th` / `rmutl1234` (development only).
6. Book an available trip; show the API-confirmed ticket and My Bookings. Explain that the ticket is shown only after a successful response.
7. If demonstrating a full trip, use two demo accounts and a disposable database with a one-seat schedule. Show waitlist and FIFO promotion after the confirmed booking is cancelled.
8. Show cancellation confirmation and an expired trip’s disabled booking action.

Use a disposable development database for all mutating demos.

## Presentation talking points

- Scope is two supported service locations and travel in both directions.
- The backend controls availability, expiry, duplicate checks, and booking outcome; the frontend renders real API data.
- SQLite transactions protect seat claims, cancellation, and promotion; the waitlist uses FIFO by creation time then ID.
- Login requires an exact `@live.rmutl.ac.th` suffix, but case is ignored. The application has no public registration.
- The UI defaults to Thai and supports English without reload, including an optional guide.
- Local automated verification passes. Persistent production storage and deployment have not been verified.

## Known limitations and delivery readiness

1. Production storage/deployment is not configured or verified. The current Render free-plan SQLite setup is ephemeral and unsuitable for persistent booking records.
2. SQLite concurrency/FIFO behavior is tested locally; no remote database driver or remote transaction behavior is verified.
3. The JWT is kept in application memory; a page reload requires login again.
4. No graphical browser E2E or screenshot evidence was produced because the environment had no browser installed.
5. Demo seed credentials are development-only. Production credentials and `JWT_SECRET` must be provisioned securely.
6. Inactive Campus Service source files remain outside active Shuttle routes.

**Readiness:** local development and demonstration ready; production deployment readiness is partial and must not be represented as verified.

## Exact local start commands

From `source/`, use separate terminals:

```bash
npm run dev --prefix api
npm run dev --prefix frontend
```

API defaults to `http://localhost:3001`; Vite defaults to `http://localhost:5173`. Configure a development `.env` and initialize the intended development database first when needed.
