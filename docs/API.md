# GOLDVORTEX V3 API

Base URL: the same origin as the website when `/api/*` is routed to the Worker.

## Public

- `GET /api/test`
- `POST /api/activate-account`
- `POST /api/login`

### Activate

```json
{
  "name": "Customer Name",
  "email": "customer@example.com",
  "mt5_account": "12345678",
  "broker": "Broker-Server",
  "mt5_password": "broker-password",
  "trading_days": 30,
  "risk_management": "LOW RISK"
}
```

The Worker creates/reuses the customer, generates a license, assigns `user_licenses`, creates a `monitor_accounts` record, and sends the license email. The monitor token is retained for future EA versions but is not required by the active v5.15 EA.

## Customer authenticated

Header:

```text
Authorization: Bearer <session_token>
```

Endpoints:

- `GET /api/me`
- `POST /api/logout`
- `GET /api/my-license`
- `GET /api/my-monitor-token`
- `POST /api/resend-license`
- `GET /api/dashboard?license_key=GVX-...`

## MT5 Monitor

The EA does not need a customer session. The active GOLDVORTEX Monitor v5.15 authenticates with `license_key + mt5_account`. The monitor token is optional and is validated only when a future EA/client sends it.

Endpoints:

- `POST /api/monitor`
- `POST /api/monitor/positions` (optional for v5.15; v5.15 sends positions inside `/api/monitor`)

## Admin

Admin uses the same `/api/login` endpoint with email + password. The resulting session must belong to a user whose role is `ADMIN`.

Endpoints:

- `POST /api/admin/bootstrap`
- `GET /api/admin/users`
- `GET /api/admin/licenses`
- `POST /api/admin/create-license`
- `POST /api/admin/update-license`
- `POST /api/admin/create-user`
- `POST /api/admin/assign-license`
- `GET /api/admin/stats`
- `GET /api/admin/activation-queue`

All admin endpoints require:

```text
Authorization: Bearer <admin_session_token>
```
