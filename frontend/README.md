# TuneTribe Frontend

Vite + React client for TuneTribe.

## Run

```bash
npm ci
npm run dev
```

Set `VITE_API_BASE_URL` if you do not want to use the local Vite proxy.

## Telemetry

The frontend can capture pageviews and click events when `VITE_TELEMETRY_ENABLED=true`.

Optional Umami bridge:

```bash
VITE_UMAMI_SCRIPT_URL=https://analytics.example.com/script.js
VITE_UMAMI_WEBSITE_ID=replace-with-your-website-id
VITE_UMAMI_HOST_URL=https://analytics.example.com
VITE_UMAMI_DOMAINS=app.example.com
```

Privacy controls:

- `VITE_TELEMETRY_CAPTURE_TEXT=false` keeps visible labels out of analytics by default.
- `VITE_TELEMETRY_SKIP_PATHS=/auth*` avoids auth screens.
- `data-telemetry-skip="true"` excludes any element subtree.
