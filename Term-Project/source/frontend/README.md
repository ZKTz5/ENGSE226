# RMUTL Shuttle frontend

React and Vite single-page application for the two service locations, Jed Yod and Doi Saket, in both directions. Active routes cover login, dashboard, schedule search/list/detail, My Bookings, and the optional User Guide.

Thai is the first-visit default. The visible `ไทย | EN` switch changes the shared translation context without reloading; a local preference may be remembered. Active pages share components and translation dictionaries rather than duplicating pages. Missing translations fall back safely.

## Run locally

From `source/`:

```bash
npm install --prefix frontend
npm run dev --prefix frontend
```

The API defaults to `http://localhost:3001`. Set `VITE_API_BASE_URL` when the API runs at another URL. In production, an empty `VITE_API_BASE_URL` uses same-origin `/api` requests.

## Verify

```bash
npm test --prefix frontend
npm run check --prefix frontend
npm run build --prefix frontend
```

The JWT remains in application memory and is sent as a bearer token. Reloading ends the current login session. Public schedule browsing does not require login. The system is login-only and has no public registration flow.
