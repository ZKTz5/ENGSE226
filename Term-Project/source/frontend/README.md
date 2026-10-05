# RMUTL Shuttle Booking frontend

React and Vite single-page app for exploring shuttle schedules between Jed Yod
and Doi Saket in both directions. The app uses the Express API for login, campus options,
schedule searches, and schedule details.

## Run locally

```bash
npm ci
npm run dev
```

The API defaults to `http://localhost:3001`. Set `VITE_API_BASE_URL` when the API
runs at another URL. In production, the empty `VITE_API_BASE_URL` uses same-origin
`/api` requests.

## Verify

```bash
npm test
npm run build
```

The JWT stays in app memory and is sent as a bearer token. Reloading the page ends
the current login session. Public schedule browsing does not require login.
