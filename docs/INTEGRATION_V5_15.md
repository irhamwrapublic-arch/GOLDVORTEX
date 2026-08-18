# GOLDVORTEX V3 — EA v5.15 Integration

This package is specifically aligned with the uploaded active EA:

`GOLDVORTEX_Monitor_v5.15_LicenseLock_PositionDetails`

## Compatibility matrix

| EA v5.15 behavior | V3 backend |
|---|---|
| `POST /api/verify` | Supported |
| `{license_key, mt5_account}` | Supported |
| `valid: true` response | Supported |
| `error: LICENSE_EXPIRED` | Supported |
| `error: ACCOUNT_MISMATCH` | Supported |
| `error: LICENSE_NOT_FOUND` | Supported |
| `POST /api/monitor` | Supported |
| Account/broker/server | Stored |
| Balance/equity/margin | Stored |
| Buy/sell/lot statistics | Stored |
| `position_details[]` | Stored in `position_details` |
| `monitor_saved: true` | Returned |
| Monitor token absent | Accepted for v5.15 |
| Optional monitor token | Validated if supplied |

## License binding

The monitor is accepted only when both values match the same license record:

`license_key + mt5_account`

The database also keeps the customer relationship through `user_licenses`.

## Customer dashboard

The dashboard reads the latest record from `mt5_monitor` and open positions from `position_details`. Customer access is restricted to licenses assigned to the authenticated customer.

## Admin dashboard

Admin users can list customers, licenses, activation queue, statistics, and load a selected license's MT5 monitor and positions.

## No EA replacement

Do not install the example EA from an older package. The current V3 package is designed around the already-active v5.15 EA.
