# GOLDVORTEX V3 — Existing EA Integration

Production-oriented package for:

**Activate → Email License → Customer Login → Session Token → Dashboard → Existing MT5 Monitor v5.15 → Admin Monitoring**

## Important

This package is intentionally compatible with the already-active:

`GOLDVORTEX_Monitor_v5.15_LicenseLock_PositionDetails`

Do **not** install a second MT5 monitor EA.

## Included

- Frontend landing page
- Customer login
- Customer dashboard with Worker/D1 data
- Customer session token
- License generation + assignment
- Resend license email
- Admin login
- Admin dashboard
- Customer management
- License management
- Activation queue
- Existing EA v5.15 `/api/verify` compatibility
- Existing EA v5.15 `/api/monitor` compatibility
- Position details from the v5.15 monitor payload
- D1 schema
- Cloudflare Worker
- Wrangler config
- Deployment/API/MT5 documentation

## MT5 protocol

The active v5.15 EA sends:

- `POST /api/verify`
- `POST /api/monitor`

It authenticates the monitor using `license_key + mt5_account`. The Worker accepts that protocol without requiring a new token. Optional monitor tokens are supported for future EA versions.

## Cloudflare

D1 must be bound to the Worker as `env.DB`. Cloudflare recommends keeping the Wrangler configuration as the source of truth for bindings. See the deployment guide and current Cloudflare documentation.

Secrets such as the Resend API key and admin bootstrap secret must be stored as Worker secrets, not plaintext configuration.
