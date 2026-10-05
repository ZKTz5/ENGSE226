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

Frontend routes: `/login`, `/`, `/requests/new`, `/requests`, `/requests/:requestId`, `/admin/requests`, `/guide`.

API endpoints are documented in `source/API_CONTRACT.md`. Main user endpoints are `POST /api/auth/login`, `GET /api/locations`, `POST /api/vehicle-requests`, `GET /api/vehicle-requests/my`, `GET /api/vehicle-requests/:id`, and `PATCH /api/vehicle-requests/:id/cancel`. Admin endpoints are under `/api/admin/vehicle-requests` and `/api/admin/vehicles`, and include request listing, vehicle listing/register/activation, approve, reject, and complete. There are no active schedule, booking, waitlist, or registration endpoints.

## Database safety

Do not reset or modify `source/api/data/campus.db` unless explicitly required by a separate task. No migration of legacy booking rows is safe because purpose, requested passenger count, and service interval are unknown. For disposable development verification, from `source/` use:

```bash
DB_FILE=/tmp/rmutl-shuttle-requests.db npm run db:reset --prefix api
```

`db:reset` is explicit and the setup script timestamp-backs up an existing target before replacing it. The disposable reset produced tables `users`, `vehicles`, `vehicle_requests`, with 10 seeded users and empty vehicles/requests. The fleet must be populated with actual vehicles before assignment; no fictional fleet is seeded.

## Verification performed

From `source/`:

- `npm test`: backend **52 passed** across 7 files; frontend **19 passed** across 5 files.
- `npm run check`: API **4/4**, frontend **7/7** checks passed.
- `npm run build`: production frontend build passed (Vite 8.1.5).
- `git diff --check`: run after final documentation and guide changes; see final audit for final result.
- Disposable DB HTTP smoke exercised exact locations, live-domain login/rejection, removed endpoint 404s, auth, one-way/round-trip PENDING, ownership, cancellation/history, admin authorization, vehicle registration, approval, overlap denial, rejection reason, and completion.

No browser click-through E2E or production deployment was performed. Do not represent those as verified.

## Known limits and next operational steps

- Staff approval exists only for accounts with the server-verified `admin` role; production provisioning/policies have not been established.
- No real fleet was seeded or production vehicle registry checked. Admin must register actual vehicles.
- No GPS, dispatch, email/push notification, or automatic status refresh service exists; users open My Requests to check.
- A one-way request needs a service-end time before it can be assigned a vehicle; without an interval, admin may approve it without assignment.
- Existing old booking data is not converted to requests. Back up data before any explicit reset.
- No production deployment or persistent production database was tested.

## Local commands

From `source/`, in separate terminals:

```bash
npm run dev --prefix api
npm run dev --prefix frontend
```

Demo accounts (development only): `tan.khanit@live.rmutl.ac.th` and `admin@live.rmutl.ac.th`, password `rmutl1234`.

Detailed workflow plan: `REQUEST_WORKFLOW_MIGRATION.md`. Current checklist and limits: `FINAL_AUDIT_REPORT.md`.
