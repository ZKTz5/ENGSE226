# RMUTL Shuttle Booking System — Final Audit Report

Audit date: 2026-10-06  
Scope: Sprint 1–4 requirements in `AGENT_HANDOFF.md`, checked against current API, frontend, schema, tests, and deployment configuration.

## Executive result

All stated Sprint 1–4 functional requirements are implemented in the current local codebase. The audit reran the complete test suite and production build successfully. Production deployment readiness is **partial**: the Render blueprint currently uses local SQLite on an ephemeral free plan, and no deployed environment or persistent remote database has been verified.

## Feature checklist

| Sprint requirement | Status | Evidence / notes |
|---|---|---|
| Sprint 1: institutional email login (`@rmutl.ac.th`) | ✅ | `POST /api/auth/login`; email normalized and domain checked. |
| Required login fields and clear invalid-domain/credential errors | ✅ | Login validator and auth integration tests; invalid credentials return a generic 401. |
| JWT issued and used; protected endpoints | ✅ | Bearer JWT middleware protects booking routes; frontend stores token in memory and attaches it to API requests. |
| Password hashing | ✅ | Existing `node:crypto` scrypt utility reused. |
| Shuttle DB schema, seed data, schema compatibility guard | ✅ | Schema and seed data in `api/data/schema.sql`; legacy-schema guard avoids silent use of an old DB. |
| Sprint 2: Doi Saket, Jed Yod, Chiang Mai | ✅ | Seeded campuses and `GET /api/campuses`. |
| Select origin, destination, travel date; reject same campus | ✅ | Search UI and API filter validation. |
| Schedule route, date, departure, capacity, confirmed count, available seats, status | ✅ | Schedule list/detail responses decorate DB rows with live booking counts and derived status. |
| Filter schedules by origin, destination, and date | ✅ | Optional query filters validated and applied by schedule service. |
| Expired schedule derivation and booking rejection | ✅ | Departure time is checked for returned status and before booking. |
| Sprint 3: authenticated booking and one active booking per user/schedule | ✅ | Atomic booking path plus duplicate check and partial unique DB index. Rebooking after cancellation is permitted. |
| Prevent expired booking and overbooking | ✅ | Expiry check and `BEGIN IMMEDIATE` local SQLite write transaction; concurrent integration test covers six users competing for one seat. |
| View own bookings; cancel own confirmed bookings | ✅ | Authenticated `GET /api/bookings/my`, owner-checked cancellation, frontend My Bookings flow. |
| Atomic cancellation and promotion | ✅ | Cancellation and possible promotion occur in the same immediate transaction. |
| Full schedule joins waitlist; duplicate waitlist prevention | ✅ | New request becomes waitlisted when no seats remain; same active-booking constraint blocks duplicate waitlist entries. |
| FIFO promotion by `(created_at, id)` | ✅ | Query explicitly orders by timestamp then ID; test forces tied timestamps and reversed diagnostic sequence. |
| No promotion when cancelling a waitlisted entry | ✅ | Covered by integration test. |
| Sprint 4: login, dashboard, search, list, detail, My Bookings | ✅ | Active React Router routes and pages. |
| Loading, empty, error, success, expired, full/waitlisted states | ✅ | Reusable loading/empty/error components, booking outcome notice, derived status badges and disabled/omitted booking action for expired schedules. |
| Real API data and desktop/mobile layout | ✅ | Frontend shuttle service calls API; responsive CSS breakpoints are present. |

## API checklist

| Endpoint | Authentication | Purpose / verified behavior |
|---|---|---|
| `GET /api` | Public | API identity response. |
| `GET /api/health` | Public | Reports API and DB connectivity for deployment health checks. |
| `POST /api/auth/login` | Public | Validates fields/domain/credentials and returns JWT plus user identity. No registration endpoint is required by the project contract; accounts are seeded or created by the admin script. |
| `GET /api/campuses` | Public | Returns supported campus reference data. |
| `GET /api/schedules?originId=&destinationId=&date=` | Public | Validates optional filters, returns current counts, seats, and derived status. Invalid filters return 400 with details. |
| `GET /api/schedules/:id` | Public | Returns a schedule detail or 404. |
| `POST /api/bookings` | JWT required | Creates confirmed or waitlisted booking; rejects malformed schedule IDs, duplicates, and expired schedules. |
| `GET /api/bookings/my` | JWT required | Lists the signed-in user’s bookings. |
| `DELETE /api/bookings/:id` | JWT required | Cancels the owner’s booking; rejects another user; cancellation of a confirmed booking promotes the first waiter. |
| `DELETE /api/bookings/:id/cancel-admin` | Admin JWT required | Administrative cancellation route is present. |

## Database schema summary

- **`users`**: name, unique email, user/admin role, scrypt password hash, creation time.
- **`campuses`**: unique campus names; seeded with Doi Saket, Jed Yod, and Chiang Mai.
- **`schedules`**: origin/destination foreign keys, ISO departure time, capacity, cached available seats, stored active/expired status, creation time. Runtime schedule status is derived using departure time and live booking counts.
- **`bookings`**: user/schedule foreign keys, confirmed/waitlisted/cancelled state, diagnostic `waitlist_seq`, creation time.
- **Indexes/constraints**: schedule search index; FIFO `(schedule_id, created_at, id)` index; user booking index; partial unique index preventing more than one non-cancelled booking per user and schedule.
- Writes that claim/cancel seats use immediate SQLite transactions. `available_seats` is recomputed from booking rows inside those transactions.
- The schema setup script drops/recreates tables when explicitly run as a reset; the startup compatibility check does not automatically destroy or migrate a legacy database.

## Test and build summary

Freshly executed from `Term-Project/source` on 2026-10-06:

- `npm test` — **PASS**: backend 44 tests across 7 files; frontend 7 tests across 2 files.
- `npm run build` — **PASS**: Vite production bundle generated; root build completed API dependency installation.
- Handoff also records `npm run check` as **PASS** (API checks 4/4 and frontend checks 4/4). It was not rerun during this audit.
- Integration coverage includes login/domain/missing fields, campus and schedule retrieval/filtering, malformed filter validation, departure-based expiry, booking/cancel/rebook, duplicate rejection, ownership enforcement, FIFO tie breaking, waitlisted cancellation, and concurrent competition for one seat.

## Demo script

1. Start the API from `Term-Project/source`: `npm run dev --prefix api` (use a development `.env` and run the documented DB setup if required). Start the frontend separately with `npm run dev --prefix frontend`.
2. Open the Vite URL. Show the dashboard loading live upcoming schedules.
3. Open **Schedules**, choose different origin/destination campuses and a travel date, and search. Demonstrate that choosing the same campus is rejected by the UI/API validation.
4. Open a schedule detail and point out departure, capacity, confirmed count, available seats, and status.
5. Sign in using a seeded demo account, for example `tan.khanit@rmutl.ac.th` / `rmutl1234` (development/demo credentials only).
6. Book an available trip, show the confirmed notice, then open **My Bookings** and cancel it.
7. For the waitlist demo, reduce a seeded schedule capacity to one in a disposable development DB, sign in as two distinct seeded accounts, book once with each, and cancel the confirmed booking. Show the second account promoted. Restore/reset the demo DB after the demonstration.
8. Show an expired schedule and its unavailable booking action. If the seeded expired dates no longer match the current clock, set one departure time to the past in a disposable demo DB.
9. Show the mobile layout using the browser’s responsive viewport.

Demo actions that modify the database should use a disposable, resettable development database, never the production DB.

## Presentation talking points

- The project retains the existing Express, SQLite/libsql, React, and Vite structure while replacing the active request-service user flow with shuttle scheduling and booking.
- The backend remains the authority for schedule availability, expiry, duplicate checks, and booking outcomes; the frontend presents live API results.
- Seat claiming and cancellation are transactional. Cancellation promotes waitlisted users FIFO using timestamp with ID tie-break, including deterministic behavior when timestamps match.
- Validation and integration tests cover error cases and concurrent requests in the configured local SQLite implementation.
- The UI completes a user journey from campus/date search through confirmed booking or waitlist and cancellation.
- Deployment configuration is prepared, but production persistence and remote-database transaction behavior are not yet demonstrated.

## Known limitations and remaining work

1. Render’s configured free plan uses ephemeral local SQLite. Select and configure persistent production storage before relying on deployed bookings.
2. Local SQLite concurrency is tested; no remote Turso/other database driver is configured or verified. Do not claim equivalent remote transaction behavior until tested.
3. Existing developer `api/data/campus.db` files may contain the Campus Service schema. Back up first, then explicitly migrate/reset; startup intentionally fails rather than silently resetting incompatible data.
4. The frontend keeps the JWT in memory only; reloading the page signs the user out.
5. No production deployment, persistent DB configuration, screenshots, or deployment evidence were produced in this audit.
6. Seeded demo credentials are for development/demo use and must not be treated as production credentials.
7. Some inactive Campus Service components/files remain in the source tree outside active shuttle routes; the active user flow is Shuttle-specific.

## Deployment readiness

**Partial / not production-ready for persistent booking data.** Build and local tests pass. Render has the service name, source root, health check, and required production JWT secret prompt. Production storage selection/configuration, live deployment verification, and deployment evidence remain outstanding.
