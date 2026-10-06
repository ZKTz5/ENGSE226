# Request Workflow Migration Plan

Status: Phase 0 analysis, before implementation.  
Repository inspected: `Term-Project` at clean commit `deb5c52` (2026-10-06). No implementation files have been changed for this migration yet.

> Phase 0 was completed before implementation changes. Progress below records the implemented migration; verification and final team guide are updated at the end.

## 1. Current fixed-schedule architecture

### Backend

- Express entry is `source/api/src/server.js`; `app.js` mounts auth, campuses, schedules, bookings, and health routes.
- `scheduleRoutes.js` + `scheduleService.js` + `shuttleDb.js` expose recurring seeded trips, date/origin/destination filters, seat counts, and departure-derived expiry.
- `bookingRoutes.js` + `bookingService.js` create confirmed/waitlisted passenger bookings, cancel bookings, and promote the FIFO waiter using SQLite immediate transactions.
- `schema.sql` has `users`, `campuses`, `schedules`, and `bookings`, seeded with two campuses, eight schedules, ten demo accounts. It drops/recreates those tables when explicitly reset.
- Auth is an existing signed JWT boundary: `authService.login()` loads `role` from the user row into a JWT; `authenticate` verifies the signature; `requireRole('admin')` protects the existing admin cancellation route. Roles are not accepted from request bodies. This is sufficient to build admin-only request review routes, with the server remaining authoritative.

### Frontend

- React/Vite app uses `HashRouter`, shared `AppLayout`, `AuthContext`, `LanguageContext`, `apiClient`, and a shared brown responsive theme.
- Active routes are login, dashboard, schedule list/search, schedule detail, My Bookings, and optional guide.
- `shuttleService.js` talks to the schedule/booking API; old generic request pages/components and `requestService.js` also remain in the tree but call the removed `/api/requests` API or are inactive.
- Thai-first bilingual dictionaries, login validation, loading/empty/error components, accessible cancellation dialog, and reduced-motion support are reusable.

## 2. Existing code and components that can be reused

- Preserve `authService.js`, JWT middleware, `password.js`, login routes, current institutional email checks, and signed role claims.
- Preserve the Express app/config/error middleware and route-to-service-to-DB structure. There is no active shuttle controller directory; service modules are the business-logic layer.
- Preserve `shuttleDb.js` connection/transaction helpers, but replace schedule helpers with location/request/vehicle helpers.
- Preserve React app shell, `AppLayout`, `AppHeader`, login page, `AuthContext`, `LanguageContext`, translation utilities, API client, error/loading/empty states, warm theme, shared form styling, and user-opened guide pattern.
- Adapt the old generic `RequestForm`, `RequestList`, `RequestCard`, `NewRequestPage`, and `RequestDetailPage` only as layout/interaction references. Their current English/Thai copy, fields, fake service expectations, or delete behavior are not the vehicle-request contract and must be replaced.
- Preserve reusable validation patterns, cancellation dialog focus behavior, date formatting, and reduced-motion CSS.

## 3. Obsolete schedule, seat-booking, and waitlist behavior

Retire from active API/UI/docs/tests:

- `campuses` and seeded `schedules`, schedule filters/detail, seat capacity/count/availability, expiry of recurring schedule rows.
- `bookings` with `confirmed`/`waitlisted`/`cancelled`, duplicate booking constraint, seat decrement, waitlist sequence, passenger FIFO promotion, and automatic confirmed outcome.
- Active Schedule Search, Schedule List, Schedule Detail, My Bookings, schedule cards, booking ticket, passenger cancellation flow, and copy referring to departures/seats/booking/waitlist/FIFO.
- Integration and frontend service tests asserting schedules, confirmed seats, passenger waitlist, or promotion. Replace with vehicle-request lifecycle tests; retain auth/password/config coverage and relevant generic loading/localization tests.

Keep FIFO/booking terminology only in historical Git history, not in current active docs or UX. Old generic Campus Service request code is not a valid implementation of the new vehicle request API either; replace/adapt it rather than pointing it at stale endpoints.

## 4. Proposed database migration

Target schema:

- Keep `users` as-is, including institutional email, role, scrypt hash, and creation time.
- Add `vehicles(id, code, capacity, home_location, active, created_at, updated_at)`. `home_location` defaults/checks to `Jed Yod`; no current-position/GPS column. Do not seed fictional fleet vehicles; an admin can register actual vehicles before assignment.
- Add `vehicle_requests(id, user_id, origin, destination, trip_type, departure_at, return_at, passenger_count, purpose, note, status, assigned_vehicle_id, rejection_reason, created_at, updated_at)`. Location and enum checks are enforced in DB as well as request validation. Initial status is `PENDING`; history is retained and no user-facing hard-delete operation exists.
- Use foreign keys to users/vehicles, indexes for user history/status/departure/vehicle assignment, and check constraints for valid directions, statuses, positive counts, and supported trip types. Service validation checks future departure and chronology.
- `ROUND_TRIP` requires `return_at` later than `departure_at`. `ONE_WAY` may include an expected service end; if staff wants to assign a vehicle to a one-way request, a bounded service window is required to prove non-overlap. A request may be approved without assignment; no vehicle is shown unless assigned.
- Approval/rejection and assignment run in `BEGIN IMMEDIATE`; assigning an active vehicle to an approved request checks overlap against other `APPROVED` assignments in the same transaction. Rejection requires a reason.
- Do not migrate arbitrary old bookings into vehicle requests: their purpose/passenger count/service window are unknown, and inventing those facts is unsafe. Do not touch the existing `source/api/data/campus.db`. Provide a documented explicit disposable reset command (`DB_FILE=/tmp/rmutl-shuttle-requests.db npm run db:reset --prefix api`) that runs the current explicit-reset backup path. Existing file reset remains opt-in and timestamp-backed-up; no startup auto-reset.

## 5. Proposed API contract

All payload field names/response shapes below are proposals; final docs must match the implemented routes.

Public/auth:

- `POST /api/auth/login` — preserve; only exact `@live.rmutl.ac.th` after case normalization.
- `GET /api/locations` — exactly Jed Yod and Doi Saket, with stable values and localized labels handled by UI.
- `GET /api/health` — preserve.

Authenticated user:

- `POST /api/vehicle-requests` — body includes `origin`, `destination`, `tripType`, `departureAt`, optional/required `returnAt` according to trip type, `passengerCount`, `purpose`, optional `note`; server always sets `PENDING` and ignores client-supplied approval/assignment/status fields.
- `GET /api/vehicle-requests/my` — only current user's history.
- `GET /api/vehicle-requests/:id` — only owner can view; other user's request is 404/403 without leaking contents.
- `PATCH /api/vehicle-requests/:id/cancel` — owner may transition only an eligible request (initial policy: `PENDING`) to `CANCELLED`; no delete.

Admin (server-side `authenticate` + `requireRole('admin')`):

- `GET /api/admin/vehicle-requests?status=PENDING` — review queue (optionally all statuses for history).
- `POST /api/admin/vehicles` — register an actual fleet vehicle; defaults its home to Jed Yod, validates capacity/code, does not store live location.
- `GET /api/admin/vehicles` — list actual vehicles for assignment.
- `PATCH /api/admin/vehicle-requests/:id/approve` — PENDING only, optionally assign an active vehicle; validate service interval and overlapping approved assignments transactionally.
- `PATCH /api/admin/vehicle-requests/:id/reject` — PENDING only and requires a non-empty rejection reason.

Use stable error codes/statuses (400 validation, 401 missing/invalid auth, 403/404 ownership policy, 404 missing record, 409 invalid transition or vehicle overlap, 201 create, 200 read/update). No admin role may be trusted from JSON input.

## 6. Proposed frontend routes and user flow

- `/login` stays.
- `/` Dashboard summarizes request actions/status and links to new request/My Requests; never fabricates trips, seats, assignments, or approval.
- `/requests/new` creates a request using trip type, origin/destination, local date/time controls, passenger count, purpose, optional note, round-trip return or expected service end where required, a review step, and explicit submit.
- `/requests` lists only the signed-in user's requests with status, actual times, trip type, passengers, purpose, actual assigned vehicle only when returned, actual rejection reason only when present, and cancel action only for eligible status.
- `/requests/:requestId` shows actual request fields and status.
- `/guide` remains optional/user-opened and describes only request workflow.
- Admin route such as `/admin/requests` appears only to a session whose signed-in user has admin role; backend remains the security boundary. It lists pending requests, collects rejection reason, chooses from vehicles returned by admin API, and displays overlap/transition errors. Also provide a minimal way for authorized staff to register actual vehicles if none exist.
- Main user flow: login → enter request → review → submit → API returns PENDING → view My Requests/detail → cancel while PENDING, or wait for staff review.
- Keep `ไทย | EN`, Thai default, responsive brown design, accessible focus/dialog, reduced motion, loading/empty/error feedback.

## 7. Proposed test migration

Backend: preserve login exact-domain/JWT/password/config tests; replace schedule/booking tests with locations, request validation, one-way/round-trip creation, pending default regardless of submitted status, owner-only list/detail, cross-user denial, cancellation history/transition, unauthenticated denial, error cases for dates/route/count/purpose/trip type/return chronology. Add admin non-admin rejection, pending review, reason-required rejection, assignment only to active vehicles, and transactional overlap conflict tests. Verify no destructive delete route exists.

Frontend: preserve translation fallback/default/switch, email validator, API wrapper and reusable state coverage. Replace shuttle-service/search/booking assertions with request API client/form/list/detail/admin service behavior, one-way/round-trip fields, validation/review, submission only after explicit confirmation, PENDING result copy, loading/error/empty, owner history/cancel visibility, optional guide behavior, localization, and production build. Add route structure checks for user/admin routes and ensure no active schedule/seat/waitlist terminology.

Integration/HTTP smoke on a fresh disposable DB: two allowed locations, live-domain login and rejection, user create/list/detail ownership, one-way and round-trip PENDING, invalid inputs, PENDING cancellation retained in history, admin approve/reject behavior, active vehicle assignment and overlap if implemented.

## 8. Documentation that must be corrected

- `AGENT_HANDOFF.md`: replace schedule/booking/waitlist Sprint scope/status with vehicle request and approval boundary; record phases, commands, results, DB handling, and limitation.
- `FINAL_AUDIT_REPORT.md`: replace API/features/schema/demo/test/limitations with actual request model.
- `SOFTWARE_WORKING_GUIDE_TH.md`: recreate/update only after all code and verification; cover four technical roles using actual final source.
- `source/README.md`, `source/frontend/README.md`, API contract/docs if present: exact reset/setup/start/test commands and actual endpoints.
- `PRESENTATION_SCRIPT_TH.md`, if present, plus demo instructions: two locations, request submission PENDING, no automatic approval, no recurring departures/waitlist.
- User-guide dictionary content and any old request examples/fixtures; no registration claims.
- Root package description / deployment health wording if it misstates the domain.

## 9. Expected file changes

### Modify

- `source/api/data/schema.sql`, `source/api/scripts/setup-db.mjs` (request/vehicle schema checks and reset reporting).
- `source/api/src/app.js`, `routes/` (remove schedule/booking mounts, add locations/request/admin routes), `services/` (replace schedule/booking with request/vehicle-review logic), `validators/`, `shuttleDb.js`, and `scripts/check-project.mjs`.
- `source/api/tests/integration/*.test.js`, `tests/unit/*.test.js` as domain test cases change; keep auth/config/password tests.
- `source/frontend/src/App.jsx`, `AppHeader.jsx`, active pages, request form/card/list/detail components, `shuttleService.js`, translation dictionary/tests, static checker, README and shared styles only where needed.
- Root `AGENT_HANDOFF.md`, `FINAL_AUDIT_REPORT.md`, `source/README.md`, `source/frontend/README.md`, and existing presentation docs if present.

### Create

- `REQUEST_WORKFLOW_MIGRATION.md` (this plan).
- API request/vehicle services/routes/validators and request-focused backend tests as appropriate.
- Frontend `NewVehicleRequestPage`, `MyRequestsPage`, and minimal authorized admin review page if the existing role boundary remains valid.
- Vehicle request-specific test files only when useful; use existing repo conventions.

### Remove only after dependency review

- Schedule and booking API files/services/components/tests once replacement paths compile and tests exist.
- Stale frontend `requestService.js`/`requestStorage.js`, old JSON request fixtures, inactive Campus Service UI components, schedule/booking components, and obsolete request summary utility only if `rg` confirms no active imports/tests/references and replacement tests cover intended behavior.
- Do not delete user database files, secrets, or unrelated history.

## 10. Risks and compatibility concerns

- The developer database may contain user data; the old setup script backs up before explicit reset, but reset still replaces content. Use a distinct `/tmp` DB for all verification and leave the existing `campus.db` untouched.
- Old confirmed/waitlisted bookings cannot safely become vehicle requests because the user never supplied purpose, requested passenger count, or service interval. Preserve old DB backup; do not fabricate those fields.
- `users.role` and signed JWT role already provide a server-side admin boundary, but seed/demo admin credentials are not production credentials. Admin mutations must still use `requireRole` and validate ownership/state in services.
- Vehicle assignment overlap is only meaningful when both requests have bounded intervals. Do not assign a vehicle to an unbounded one-way request; allow approval without assignment, and document the requirement for service end when assignment is requested.
- Timezone interpretation needs consistency between local date/time form controls and API ISO datetime; backend validates timestamps and future time against the configured server convention.
- Existing tests and static checkers explicitly assert the retired domain and must be replaced, not weakened. Frontend has no browser E2E dependency; do not claim visual interaction tests unless run.
- Historical documents/Git commits may still mention the old model. Current docs and active flow must be corrected; do not rewrite Git history.
- Production persistence, actual fleet registry, and staff operating procedure remain outside local implementation unless configured; do not claim live dispatch/GPS or real vehicle availability.

## Progress log

- **Phase 0 — Analysis and plan: complete.** Inspected the existing docs, active API/UI, schema/seed, tests, scripts, clean Git state, and recent history; this plan was created before implementation edits.
- **Phases 1–3 — Domain, database, authentication: implemented.** Preserved login/JWT/scrypt and exact live-domain rules; replaced active schedule/bookings schema with `vehicles` and `vehicle_requests`; uses explicit disposable DB reset and left the existing local database untouched.
- **Phases 4–6 — Retired schedule flow and admin boundary: implemented.** Removed schedule/booking routes/services; owner-scoped request create/list/detail/cancel routes; existing signed JWT admin role protects vehicle registration and request approval/rejection. Assignment checks active state, capacity, bounded interval, and overlap in an immediate transaction.
- **Phases 7–11 — Frontend, feedback, localization, theme, guide: implemented.** Added reviewed submission form, PENDING result, My Requests/detail/cancellation, admin review, translated 12-step guide; retained Thai-first switch and approved responsive brown theme.
- **Phase 12 — Tests: migrated and expanded.** Replaced schedule/booking tests with request/domain tests, ownership/history/admin/overlap and form/API tests. Current passing counts are recorded in the final verification section after final rerun.
- **Phase 13 — Documentation: complete.** Updated setup/frontend READMEs, API contract, presentation script, handoff, and final audit. Statements describe request submission as PENDING and no longer claim recurring schedules, passenger booking, waitlists, or FIFO as active behavior.
- **Phase 14 — Verification: complete.** From `source/`, ran `npm test` (backend 52/52 across 7 files; frontend 19/19 across 5 files), `npm run check` (API 4/4; frontend 7/7), and `npm run build` (Vite production build passed). Reset a named disposable DB twice; verified only `users`, `vehicles`, and `vehicle_requests`, with 10 users and empty fleet/request tables; the repeat reset created a timestamped backup. HTTP smoke verified exact locations, domain accept/reject, authentication, legacy schedule/booking 404s, PENDING one-way/round-trip requests, ownership isolation, cancellation/history, admin authorization, vehicle registration, approval, overlap rejection, rejection, and completion. `git diff --check` is run after documentation and final guide creation. No browser E2E or production deployment was performed.
- **Phase 15 — Team software guide: pending and intentionally last.** Create/update `SOFTWARE_WORKING_GUIDE_TH.md` only after implementation, all other documentation, and verification are complete; then only perform read-only review/status checks.
