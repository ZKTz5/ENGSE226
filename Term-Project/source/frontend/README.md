# RMUTL Shuttle frontend

React/Vite request-based client for trips between Jed Yod and Doi Saket. Users enter their requested future date/time and trip details; submission creates a `PENDING` vehicle request, not an automatic approval. Active pages cover Login, Dashboard, New Vehicle Request, My Requests, Request Detail, optional User Guide, and admin request review for admin sessions.

Thai is the first-visit default. `ไทย | EN` switches the shared translation context without reloading and may remember the preference locally. The JWT stays in application memory and is sent as a bearer token. Reloading ends the login session. The server remains authoritative for request ownership and admin operations.

## Run

From `source/`:

```bash
npm install --prefix frontend
npm run dev --prefix frontend
```

The API defaults to `http://localhost:3001`; set `VITE_API_BASE_URL` when needed.

## Verify

```bash
npm test --prefix frontend
npm run check --prefix frontend
npm run build --prefix frontend
```

The app has no public registration. See `../README.md` (relative to this folder: `../README.md` from `frontend/`) for database and API setup.
