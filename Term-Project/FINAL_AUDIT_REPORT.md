# Final Audit Report — RMUTL Shuttle Vehicle Request System

Audit basis: current repository implementation and the verification commands listed below. The application is request-based: vehicle home base is Jed Yod; the only service locations are Jed Yod and Doi Saket. Users request a future date/time and each new request is `PENDING`. Submission is not approval.

## Feature checklist

- [x] Login-only account access; exact `@live.rmutl.ac.th` domain, case-insensitive; JWT and scrypt retained.
- [x] Thai default, English switcher, shared translation dictionary and fallback.
- [x] Dashboard, reviewed one-way/round-trip request form, My Requests, request detail, cancellation, user-opened guide.
- [x] Two location choices; origin and destination differ; future departure, positive passenger count, purpose, and return-time validation.
- [x] New request is server-set `PENDING`; no client-supplied status/assignment can grant approval.
- [x] Owner-only list/detail; other user's detail is concealed; eligible pending cancellation retains history.
- [x] Signed-role admin API and admin UI for actual vehicle registration/activation, approval, rejection with reason, and completion.
- [x] Explicit single-active navigation mapping, admin request summary/detail pages, and opt-in admin-only request data reset.
- [x] Session restore happens before protected-route decisions; only JWT and minimal user identity persist in tab-scoped `sessionStorage`; request data refetches through API after refresh.
- [x] Assignment validates active vehicle/capacity/service interval and rejects overlapping approved assignments transactionally.
- [x] Loading, empty, API-error and submission-success states; success reflects the API's status.
- [x] Responsive warm brown theme, keyboard focus and reduced-motion support.
- [x] No active recurring schedule, seat availability, automatic seat confirmation, passenger waitlist, or passenger FIFO promotion.

## API checklist

- [x] `POST /api/auth/login`; `GET /api/locations`; `GET /api/health`.
- [x] `POST /api/vehicle-requests`; `GET /api/vehicle-requests/my`; `GET /api/vehicle-requests/:id`; `PATCH /api/vehicle-requests/:id/cancel`.
- [x] Admin: request list/detail, `GET/POST /api/admin/vehicles`, `PATCH /api/admin/vehicles/:id/active`, and request `approve`, `reject`, `complete` actions.
- [x] Admin detail returns requester `{ id, name, email }`; list returns `{ id, name }` only. Responses select no password hashes, tokens, or secrets.
- [x] `GET/POST /api/admin/reset-data`: admin JWT only; reset is disabled unless `ENABLE_ADMIN_DATA_RESET=true`; POST additionally requires exact `RESET` confirmation.
- [x] Authentication, validation, ownership, transition, role and overlap rules are enforced on the server.
- [x] Old `/api/schedules` and `/api/bookings` returned 404 in disposable HTTP smoke.

See [API contract](source/API_CONTRACT.md) for payloads, status codes, and errors.

## Database schema summary

`source/api/data/schema.sql` defines:

- `users`: identity, unique institutional email, role, scrypt hash, created timestamp.
- `vehicles`: actual vehicle code, positive capacity, Jed Yod home location, active flag, timestamps.
- `vehicle_requests`: owner, two-location route, `ONE_WAY`/`ROUND_TRIP`, departure/optional return, passenger count, purpose/note, status, optional assigned vehicle/rejection reason, timestamps. Constraints prevent same endpoints, invalid enums/counts, and invalid return chronology. Foreign keys preserve request history.

The schema seeds ten development accounts, including one admin; it seeds no fleet and no requests. There is no schedule/campus/booking table in the new reset schema.

`DB_FILE` resolves to `/home/zee/workspace/ENGSE226/Term-Project/source/api/data/campus.db` in the current environment (the default when unset). That local file exists and is ignored, not tracked; no `.db`, `.db-wal`, `.db-shm`, `.sqlite`, or `.sqlite3` file is tracked. API startup validates schema and does not apply destructive schema SQL; new schema setup is explicit. The admin reset deletes only `vehicle_requests` transactionally and preserves users/password hashes/admin, vehicles, schema, and database file. No separate request-history/child table exists. Current `ENABLE_ADMIN_DATA_RESET` is false, so the admin UI does not offer reset until an operator opts in.

## Test and build summary

Executed from `source/` after implementation:

| Command | Actual result |
|---|---|
| `npm test` | Backend 53 passed / 7 files; frontend 29 passed / 7 files |
| `npm run check` | API 4/4; frontend 7/7 |
| `npm run build` | Passed; Vite 8.1.5 production bundle created |
| File-backed API startup preservation | Passed; `loadSeed()` preserved an existing request row in a disposable SQLite file |
| Disposable DB reset | Passed twice; 10 users, 0 vehicles, 0 requests; second reset backed up target |
| HTTP smoke | Passed: two locations; live-domain acceptance and other-domain rejection; PENDING one-way/round-trip; ownership; cancellation history; admin guard/review, actual assignment, overlap denial, rejection, completion; legacy schedule/booking endpoints 404 |
| `git diff --check` | Passed after final docs; no whitespace errors |

No browser-based click-through E2E was run. Static frontend structure/flow checks and API tests are not a substitute for that.

Refresh/session tests use the actual storage restore helper and protected-route structure. The startup-preservation smoke invokes the same database loader used by the API server against a disposable file database; no browser refresh or real production database was used.

## Disposable database command

Run from `source/`:

```bash
DB_FILE=/tmp/rmutl-shuttle-requests.db npm run db:reset --prefix api
```

This explicitly replaces only the named disposable target and creates a timestamped backup if it already exists. The existing `source/api/data/campus.db` was not changed. No automatic legacy booking-to-request migration exists: old rows do not contain enough information to invent request purpose, passenger count, and service interval. Do not point reset at production or a user database without a separately approved backup/migration plan.

## Demo script

1. Start API and frontend using the commands below.
2. Open the app in Thai and show `ไทย | EN` switching.
3. Sign in as `tan.khanit@live.rmutl.ac.th` / `rmutl1234` (development seed only).
4. Create a future one-way request Jed Yod → Doi Saket; review and submit.
5. Show the returned request ticket with `PENDING` / “รอตรวจสอบ”. Explain that submission is not approval.
6. Open My Requests and detail; cancel a still pending disposable request and show it remains in history.
7. Optional staff demonstration: use `admin@live.rmutl.ac.th` / `rmutl1234`; register a clearly labeled demo vehicle or approve without assignment; demonstrate rejection reason or completion only for an approved request.
8. Open User Guide explicitly from navigation.

## Presentation talking points

- The service accepts requests for transport between two locations, rather than offering recurring departures.
- The requester supplies trip type, date/time, passengers, and purpose; backend validation independently enforces the rules.
- The server establishes ownership and PENDING state; signed JWT role middleware separates staff operations.
- Vehicle assignment is based on registered data and transactionally checks active status, capacity, and interval overlap.
- Thai is the first-visit language; shared localization supports English without reloading.

## Limitations and deployment readiness

- Staff approval endpoints exist behind the existing verified admin role. Production role provisioning and staff operating procedure remain to be established.
- Fleet starts empty; no real fleet data or dispatch process was verified.
- No GPS, notifications, or external dispatch integration. Users check status in My Requests.
- One-way vehicle assignment requires a bounded service-end time.
- No production deployment, production persistence, or browser E2E was run. Treat this as locally verified development/demo software, not deployment-ready production service.

## Local start commands

From `source/`, use separate terminals:

```bash
npm run dev --prefix api
npm run dev --prefix frontend
```

API defaults to `http://localhost:3001`; Vite defaults to `http://localhost:5173`. For setup, see [source README](source/README.md). The request-domain analysis and implementation log are in [REQUEST_WORKFLOW_MIGRATION.md](REQUEST_WORKFLOW_MIGRATION.md).
