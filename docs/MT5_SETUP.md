# GOLDVORTEX V3 — MT5 SETUP

## Existing EA is retained

Use the existing active EA:

`GOLDVORTEX_Monitor_v5.15_LicenseLock_PositionDetails`

**Do not install a second monitor EA.** The V3 Worker was revised to accept the v5.15 protocol directly.

### v5.15 → Worker endpoints

1. `POST /api/verify`
2. `POST /api/monitor`

The v5.15 EA sends `license_key` + `mt5_account` and includes `position_details` inside `/api/monitor`.

### MT5 WebRequest permission

In MT5:

`Tools → Options → Expert Advisors → Allow WebRequest for listed URL`

Add the Worker base URL, for example:

`https://goldvortex-api.irhamwrapublic.workers.dev`

### Important

The existing v5.15 EA does **not** send a monitor token. The revised Worker therefore treats the monitor token as optional for backward compatibility. If a future EA sends a token, the Worker validates it.

### Position monitoring

No second EA endpoint is required. v5.15 already sends `position_details` with the main `/api/monitor` heartbeat.
