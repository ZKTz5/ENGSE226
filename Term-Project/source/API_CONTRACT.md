# Vehicle Request API Contract

Base path: `/api`. JSON request/response bodies use camelCase API fields. Authentication is `Authorization: Bearer <JWT>`. The server derives the user and role from the verified JWT; request JSON cannot set a user's identity, status, approval, or vehicle assignment.

## Public/authenticated user operations

| Method | Path | Auth | Success |
|---|---|---|---|
| `GET` | `/api/health` | Public | `200` health and database connection. |
| `POST` | `/api/auth/login` | Public | `200 { token, user }`; only exact `@live.rmutl.ac.th` domain, case-insensitive. |
| `GET` | `/api/locations` | Public | `200 [{ value, name, isHomeBase }]`; only Jed Yod and Doi Saket; Jed Yod is home base. |
| `POST` | `/api/vehicle-requests` | Bearer JWT | `201` created request, always `PENDING`. |
| `GET` | `/api/vehicle-requests/my` | Bearer JWT | `200` current user's request history only. |
| `GET` | `/api/vehicle-requests/:id` | Bearer JWT + owner | `200` owned request; another user's record is returned as `404`. |
| `PATCH` | `/api/vehicle-requests/:id/cancel` | Bearer JWT + owner | `200` updated request (`CANCELLED`) when prior status was `PENDING`; history row remains. |

Create body:

```json
{
  "origin": "Jed Yod",
  "destination": "Doi Saket",
  "tripType": "ONE_WAY",
  "departureAt": "2026-10-07T03:00:00.000Z",
  "returnAt": null,
  "passengerCount": 2,
  "purpose": "Academic visit",
  "note": null
}
```

`tripType` is `ONE_WAY` or `ROUND_TRIP`. A round trip requires `returnAt` after departure. One-way may supply an expected service end; an assigned vehicle requires a bounded service window. Times must be future/valid ISO datetimes. `passengerCount` is a positive integer; purpose is required. API values for locations are stable English names; UI localizes their display labels.

Request responses contain `id`, `userId`, `origin`, `destination`, `tripType`, `departureAt`, `returnAt`, `passengerCount`, `purpose`, `note`, `status`, `createdAt`, `updatedAt`, and requester fields where appropriate. `assignedVehicleId`, `assignedVehicleCode`, `assignedVehicleCapacity` are included only when a real vehicle is assigned. `rejectionReason` is included only after rejection.

## Admin operations

All `/api/admin/*` routes require a verified JWT with the server-signed `admin` role. A regular user receives `403`; missing/invalid token receives `401`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/admin/vehicle-requests?status=PENDING` | Review request list; optional valid request-status filter. |
| `GET` | `/api/admin/vehicles` | List registered vehicles (active and inactive). |
| `POST` | `/api/admin/vehicles` | Register an actual vehicle: `{ code, capacity, homeLocation? }`; home defaults to Jed Yod. |
| `PATCH` | `/api/admin/vehicles/:id/active` | Set `{ active: true|false }`. |
| `PATCH` | `/api/admin/vehicle-requests/:id/approve` | Approve PENDING request; optional `{ assignedVehicleId }`. |
| `PATCH` | `/api/admin/vehicle-requests/:id/reject` | Reject PENDING request with required `{ rejectionReason }`. |
| `PATCH` | `/api/admin/vehicle-requests/:id/complete` | Record staff-confirmed completion of an APPROVED request. |

Assignment requires a registered active vehicle, capacity at least the request passenger count, and a bounded service window. `BEGIN IMMEDIATE` protects the status/overlap check. Existing APPROVED assignments on the same vehicle may not overlap. An approval without vehicle assignment is allowed and does not fabricate assignment details.

## Validation and errors

Errors have `{ code, error }`; validation responses may include `details`. Relevant HTTP statuses: `400` invalid fields/filter, `401` unauthenticated, `403` wrong role, `404` missing/not-owned record, `409` invalid state, inactive/insufficient vehicle, overlap, or duplicate vehicle code.

Common error codes include `invalid_email_domain`, `invalid_credentials`, `invalid_vehicle_request`, `request_not_found`, `request_not_pending`, `request_not_cancellable`, `vehicle_assignment_overlap`, `vehicle_capacity_insufficient`, `vehicle_inactive`, `service_window_required`, and `rejection_reason_required`.

There are no schedule, passenger booking, cancellation-of-seat, waitlist, or registration endpoints.
