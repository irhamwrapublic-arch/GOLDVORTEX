import apiWorker from "./worker.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/admin/credentials" && request.method === "GET") {
      try {
        const token = getBearerToken(request);
        if (!token) return json({ success: false, error: "ADMIN_ACCESS_REQUIRED" }, 403);

        const session = await env.DB.prepare(`
          SELECT u.id, u.role, u.status, us.expires_at
          FROM user_sessions us
          INNER JOIN users u ON u.id = us.user_id
          WHERE us.session_token = ?
          LIMIT 1
        `).bind(token).first();

        if (!session || session.status !== "ACTIVE" || session.role !== "ADMIN") {
          return json({ success: false, error: "ADMIN_ACCESS_REQUIRED" }, 403);
        }

        const expiry = new Date(session.expires_at);
        if (!Number.isFinite(expiry.getTime()) || expiry <= new Date()) {
          return json({ success: false, error: "SESSION_EXPIRED" }, 401);
        }

        const licenseKey = clean(url.searchParams.get("license_key"));
        const mt5Account = clean(url.searchParams.get("mt5_account"));
        const broker = clean(url.searchParams.get("broker"));

        if (!licenseKey && !mt5Account) {
          return json({ success: false, error: "LICENSE_KEY_OR_MT5_ACCOUNT_REQUIRED" }, 400);
        }

        let license = null;
        if (licenseKey) {
          license = await env.DB.prepare(`
            SELECT license_key, mt5_account, broker, symbol, status, activated_at, expires_at, created_at, updated_at
            FROM licenses
            WHERE license_key = ?
            LIMIT 1
          `).bind(licenseKey).first();
        } else {
          license = await env.DB.prepare(`
            SELECT license_key, mt5_account, broker, symbol, status, activated_at, expires_at, created_at, updated_at
            FROM licenses
            WHERE mt5_account = ?
            LIMIT 1
          `).bind(mt5Account).first();
        }

        if (!license) return json({ success: false, error: "LICENSE_NOT_FOUND" }, 404);

        const account = clean(license.mt5_account || mt5Account);
        const effectiveBroker = clean(license.broker || broker);

        const credential = await env.DB.prepare(`
          SELECT mt5_account, broker, mt5_password, created_at, updated_at
          FROM mt5_credentials
          WHERE mt5_account = ?
            AND broker = ?
          LIMIT 1
        `).bind(account, effectiveBroker).first();

        const monitor = await env.DB.prepare(`
          SELECT server, broker, symbol, last_update
          FROM mt5_monitor
          WHERE license_key = ?
          LIMIT 1
        `).bind(license.license_key).first();

        return json({
          success: true,
          activation: {
            license_key: license.license_key,
            mt5_account: license.mt5_account,
            broker: license.broker,
            symbol: license.symbol,
            status: license.status,
            activated_at: license.activated_at,
            expires_at: license.expires_at,
            created_at: license.created_at,
            updated_at: license.updated_at,
            server: monitor?.server || null
          },
          credentials: credential ? {
            mt5_account: credential.mt5_account,
            broker: credential.broker,
            mt5_password: credential.mt5_password,
            created_at: credential.created_at,
            updated_at: credential.updated_at
          } : null
        });
      } catch (error) {
        console.error("GOLDVORTEX ADMIN CREDENTIALS ERROR:", error);
        return json({ success: false, error: "INTERNAL_SERVER_ERROR", message: error?.message || String(error) }, 500);
      }
    }

    return apiWorker.fetch(request, env);
  }
};

function getBearerToken(request) {
  const value = request.headers.get("Authorization") || "";
  const parts = value.trim().split(/\s+/);
  return parts.length === 2 && parts[0].toLowerCase() === "bearer" ? clean(parts[1]) : "";
}

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}
