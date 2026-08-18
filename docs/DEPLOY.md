# GOLDVORTEX V3 — Cloudflare Go-Live

## 1. Create D1

Create a Cloudflare D1 database named `goldvortex-db` and copy its database ID into `wrangler.toml`.

Apply the schema:

```bash
npx wrangler d1 execute goldvortex-db --remote --file=database/schema.sql
```

## 2. Configure Worker secrets

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put ADMIN_BOOTSTRAP_SECRET
```

Set `PUBLIC_APP_URL` in `wrangler.toml` to the real Cloudflare Pages/custom domain.

## 3. Deploy Worker

```bash
npx wrangler deploy
```

Recommended routing: expose the Worker under the same website origin at `/api/*`. The frontend uses relative `/api` URLs, so there is no hard-coded workers.dev hostname.

## 4. Deploy Pages

Upload the contents of `frontend/` to Cloudflare Pages as the static site. The `admin-panel/` folder can be published as a subfolder, for example `/admin-panel/`.

If your Pages project uses a build system, use the project root as the static output directory and keep the relative file structure intact.

## 5. Create the first admin

Call the bootstrap endpoint once:

```bash
curl -X POST https://YOUR-API-DOMAIN/api/admin/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"bootstrap_secret":"YOUR_SECRET","name":"GOLDVORTEX Admin","email":"admin@example.com","password":"CHANGE_THIS_TO_A_LONG_PASSWORD"}'
```

After a successful bootstrap, the same endpoint cannot create a second admin until the Worker/database is deliberately changed.

## 6. Resend

The Worker sends activation/active/expired messages through Resend. The sender is configured as `noreply@goldvortex.web.id` in the current Worker. Ensure the domain is verified in Resend before go-live.

## 7. Final smoke test

Check:

- `GET /` → online
- `GET /api/test` → D1 connected
- customer activation → user + license + user_license + monitor_account + email
- customer login → session token
- dashboard → `/api/me`, `/api/my-license`, `/api/dashboard`
- MT5 heartbeat → `/api/monitor`
- positions → included in `/api/monitor` by the active v5.15 EA; `/api/monitor/positions` remains available for future clients
- admin login → `/api/me` role ADMIN
- admin dashboard → users, licenses, stats, queue, monitor

## Important

The activation form accepts the MT5 password over HTTPS but the final Worker does **not store the plaintext password in D1**. Install/configure the EA on the VPS directly with the broker credentials.
