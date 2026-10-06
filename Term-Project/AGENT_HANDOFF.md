# Agent Handoff — RMUTL Shuttle

## Current product model

The active system accepts vehicle-use requests between exactly **Jed Yod** and **Doi Saket**. Vehicles normally have their home base at Jed Yod. Users choose a future travel date/time, enter trip and passenger details, review, and submit. Every new request starts as `PENDING`; submission does not approve transport. This is not a recurring schedule, passenger seat-booking, waitlist, or FIFO-promotion system. No GPS position is represented.

Authentication is login-only. Backend accepts only an email ending exactly in `@live.rmutl.ac.th`, case-insensitively. JWT and scrypt remain in use. Thai is the default language; users can switch to English. Brown responsive styling and the user-opened bilingual guide remain.

## Architecture and implementation

- React 19/Vite with HashRouter, shared auth/language contexts, API client, pages, and theme: `source/frontend/src/`.
- Express 5 routes call service modules and SQLite/libsql helpers directly: `source/api/src/`; there is no controller layer.
- SQLite schema in `source/api/data/schema.sql`: `users`, `vehicles`, `vehicle_requests`.
- Signed JWT role claims and server middleware protect `/api/admin/*`. Admin APIs support real vehicle registration/activation, pending request review, approval/rejection, and completion. Rejection requires a reason. Assignment checks active vehicle, capacity, bounded interval, and overlap in a transaction. Approval without assignment is allowed.
- User request ownership is checked server-side. Other users' request details return 404. Users may cancel only `PENDING`; history is retained.

## Active routes and endpoints

Frontend routes: `/login`, `/`, `/requests/new`, `/requests`, `/requests/:requestId`, `/admin/requests`, `/admin/requests/:requestId`, `/guide`. Explicit route matching gives exactly one page link `aria-current="page"`; logout and language controls are not active pages.

API endpoints are documented in `source/API_CONTRACT.md`. Main user endpoints are `POST /api/auth/login`, `GET /api/locations`, `POST /api/vehicle-requests`, `GET /api/vehicle-requests/my`, `GET /api/vehicle-requests/:id`, and `PATCH /api/vehicle-requests/:id/cancel`. Admin endpoints include request list/detail (list exposes requester id/name; detail adds email), vehicle registry/review actions, and the gated data-reset operation. There are no active schedule, passenger booking, or waitlist endpoints and no account self-registration.

Authentication is restored before protected routes render. `sessionStorage` keys are `rmutl-shuttle-access-token` and `rmutl-shuttle-user`; only JWT and minimal id/name/email/role are stored, never passwords or request records. Expired/malformed values are cleared locally; API 401 clears the token and returns the user to Login. Request list/detail pages fetch fresh API data after refresh.

## Database safety

Do not reset or modify `source/api/data/campus.db` unless explicitly required by a separate task. No migration of legacy booking rows is safe because purpose, requested passenger count, and service interval are unknown. For disposable development verification, from `source/` use:

```bash
DB_FILE=/tmp/rmutl-shuttle-requests.db npm run db:reset --prefix api
```

`db:reset` is an explicit shell operation and the setup script timestamp-backs up an existing target before replacing it. Normal API startup validates the configured schema and never executes destructive schema SQL; a new DB must be prepared with explicit `npm run db:setup --prefix api`. Default `DB_FILE` is `source/api/data/campus.db` when unset. The admin HTTP reset is separate: it deletes only `vehicle_requests` in a transaction and preserves users/password hashes/admin, vehicles, schema, and DB file. It requires server-side admin JWT plus `ENABLE_ADMIN_DATA_RESET=true` (false by default) and never calls setup scripts. This schema has no request child/history table. The disposable reset produced tables `users`, `vehicles`, `vehicle_requests`, with 10 seeded users and empty vehicles/requests. The fleet must be populated with actual vehicles before assignment; no fictional fleet is seeded.

## Verification performed

From `source/`:

- Final `npm test`: backend **53 passed** across 7 files; frontend **29 passed** across 7 files.
- `npm run check`: API **4/4**, frontend **7/7** checks passed after admin detail/reset UI changes.
- `npm run build`: production frontend build passed (Vite 8.1.5; 53 modules).
- File-backed startup preservation check: created a request in a disposable `/tmp` SQLite DB, ran the same `loadSeed()` used at API startup, and confirmed the request remained.
- `git diff --check`: passed after final documentation edits.
- Disposable DB HTTP smoke exercised exact locations, live-domain login/rejection, removed endpoint 404s, auth, one-way/round-trip PENDING, ownership, cancellation/history, admin authorization, vehicle registration, approval, overlap denial, rejection reason, and completion.

No browser click-through E2E or production deployment was performed. Do not represent those as verified.

## Known limits and next operational steps

- Staff approval exists only for accounts with the server-verified `admin` role; production provisioning/policies have not been established.
- No real fleet was seeded or production vehicle registry checked. Admin must register actual vehicles.
- No GPS, dispatch, email/push notification, or automatic status refresh service exists; users open My Requests to check.
- A one-way request needs a service-end time before it can be assigned a vehicle; without an interval, admin may approve it without assignment.
- Existing old booking data is not converted to requests. Back up data before any explicit reset.
- No production deployment or persistent production database was tested.
- `ENABLE_ADMIN_DATA_RESET` is false in the current environment, so the admin UI hides Reset Data until the operator explicitly enables the flag. API still enforces the flag and signed admin role.

## Local commands

From `source/`, in separate terminals:

```bash
npm run dev --prefix api
npm run dev --prefix frontend
```

Demo accounts (development only): `tan.khanit@live.rmutl.ac.th` and `admin@live.rmutl.ac.th`, password `rmutl1234`.

Detailed workflow plan: `REQUEST_WORKFLOW_MIGRATION.md`. Current checklist and limits: `FINAL_AUDIT_REPORT.md`.
