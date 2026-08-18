# GOLDVORTEX V3 — GO-LIVE CHECKLIST (EA v5.15)

## Application

- [ ] Landing Page
- [ ] Activation Form
- [ ] License Assignment
- [ ] Resend Email
- [ ] Customer Login
- [ ] Session Token
- [ ] Customer Dashboard
- [ ] MT5 Monitor
- [ ] Position Monitor
- [ ] Admin Login
- [ ] Admin Dashboard
- [ ] Customer Management
- [ ] License Management
- [ ] Cloudflare D1
- [ ] Cloudflare Worker
- [ ] Cloudflare Pages

## Existing MT5 integration

- [ ] Keep the currently active `GOLDVORTEX Monitor v5.15` EA
- [ ] Do NOT install a second monitor EA
- [ ] Add the Worker URL to MT5 WebRequest allowed URLs
- [ ] Confirm `/api/verify` returns `valid:true` / `status:LICENSE_VALID`
- [ ] Confirm `/api/monitor` returns `monitor_saved:true`
- [ ] Confirm `position_details` appear in customer dashboard
- [ ] Confirm admin can load the same monitor

## Final flow

```text
Activate
   ↓
Email License
   ↓
Customer Login
   ↓
Session Token
   ↓
Customer Dashboard
   ↓
Existing MT5 Monitor v5.15
   ↓
/api/verify + /api/monitor
   ↓
Cloudflare Worker
   ↓
Cloudflare D1
   ↓
Customer Dashboard + Admin Monitoring
```

## Important

The uploaded v5.15 EA uses `license_key + mt5_account` and sends position details inside `/api/monitor`. The revised Worker keeps monitor-token support optional for future clients, so no EA replacement is required for this integration.
