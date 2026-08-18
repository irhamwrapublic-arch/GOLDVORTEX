/**
 * GOLDVORTEX™ FINAL WORKER
 * API version: 2.0.0
 *
 * Designed for the existing GOLDVORTEX D1 schema:
 * - licenses
 * - users
 * - user_licenses
 * - user_sessions
 * - mt5_credentials
 * - mt5_monitor
 * - position_details
 * - mt5_positions
 * - monitor_accounts
 *
 * Customer login:
 *   POST /api/login
 *   { "email": "...", "license_key": "..." }
 *
 * Admin login:
 *   POST /api/login
 *   { "email": "...", "password": "..." }
 *
 * Customer dashboard:
 *   GET /api/dashboard?license_key=...
 *   Authorization: Bearer <session>
 *
 * MT5 EA:
 *   POST /api/monitor
 *   POST /api/monitor/positions
 *
 * Required Worker bindings/secrets:
 *   DB                 D1 database binding
 *   RESEND_API_KEY     Resend API key
 *   ADMIN_BOOTSTRAP_SECRET  only needed for /api/admin/bootstrap
 *
 * Resend sender:
 *   noreply@goldvortex.web.id
 */

const VERSION = "2.0.0";
const APP_NAME = "GOLDVORTEX";
const SESSION_DAYS = 7;
const ACTIVATION_GRACE_MESSAGE =
  "GOLDVORTEX will be fully active within a maximum of 1x24 hours.";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: corsHeaders()
        });
      }

      // -------------------------------------------------
      // HOME / HEALTH
      // -------------------------------------------------
      if (url.pathname === "/" && request.method === "GET") {
        return json({
          success: true,
          service: "GOLDVORTEX License API",
          version: VERSION,
          status: "online"
        });
      }

      // -------------------------------------------------
      // TEST
      // -------------------------------------------------
      if (url.pathname === "/api/test" && request.method === "GET") {
        return await testDatabase(env);
      }

      if (url.pathname === "/api/activate-test" && request.method === "GET") {
        return await activateTest(env);
      }

      if (url.pathname === "/api/lock-test" && request.method === "GET") {
        return await lockTest(env);
      }

      // -------------------------------------------------
      // AUTH
      // -------------------------------------------------
      if (url.pathname === "/api/login" && request.method === "POST") {
        return await loginUser(request, env);
      }

      if (url.pathname === "/api/me" &&
          (request.method === "GET" || request.method === "POST")) {
        return await currentUser(request, env);
      }

      if (url.pathname === "/api/logout" && request.method === "POST") {
        return await logoutUser(request, env);
      }

      // -------------------------------------------------
      // CUSTOMER / LICENSE
      // -------------------------------------------------
      if (url.pathname === "/api/my-license" && request.method === "GET") {
        return await myLicense(request, env);
      }

      if (url.pathname === "/api/my-monitor-token" && request.method === "GET") {
        return await myMonitorToken(request, env);
      }

      if (url.pathname === "/api/resend-license" && request.method === "POST") {
        return await resendLicenseEmail(request, env);
      }

      if (url.pathname === "/api/activate" && request.method === "POST") {
        return await activateLicense(request, env);
      }

      if (url.pathname === "/api/activate-account" &&
          request.method === "POST") {
        return await activateAccount(request, env);
      }

      if (url.pathname === "/api/verify" && request.method === "POST") {
        return await verifyLicense(request, env);
      }

      if (url.pathname === "/api/status" && request.method === "POST") {
        return await licenseStatus(request, env);
      }

      // -------------------------------------------------
      // MT5 MONITOR
      // -------------------------------------------------
      if (url.pathname === "/api/monitor" && request.method === "POST") {
        return await monitorData(request, env);
      }

      if (url.pathname === "/api/monitor/positions" &&
          request.method === "POST") {
        return await monitorPositions(request, env);
      }

      // -------------------------------------------------
      // CUSTOMER DASHBOARD
      // -------------------------------------------------
      if (url.pathname === "/api/dashboard" && request.method === "GET") {
        return await dashboardData(request, env);
      }

      // -------------------------------------------------
      // ADMIN
      // -------------------------------------------------
      if (url.pathname === "/api/admin/bootstrap" &&
          request.method === "POST") {
        return await adminBootstrap(request, env);
      }

      if (url.pathname === "/api/admin/users" &&
          request.method === "GET") {
        return await adminUsers(request, env);
      }

      if (url.pathname === "/api/admin/create-user" &&
          request.method === "POST") {
        return await adminCreateUser(request, env);
      }

      if (url.pathname === "/api/admin/assign-license" &&
          request.method === "POST") {
        return await adminAssignLicense(request, env);
      }

      if (url.pathname === "/api/admin/licenses" && request.method === "GET") {
        return await adminLicenses(request, env);
      }

      if (url.pathname === "/api/admin/create-license" && request.method === "POST") {
        return await adminCreateLicense(request, env);
      }

      if (url.pathname === "/api/admin/update-license" && request.method === "POST") {
        return await adminUpdateLicense(request, env);
      }

      if (url.pathname === "/api/admin/stats" && request.method === "GET") {
        return await adminStats(request, env);
      }

      if (url.pathname === "/api/admin/activation-queue" && request.method === "GET") {
        return await adminActivationQueue(request, env);
      }

      return json({
        success: false,
        error: "ENDPOINT_NOT_FOUND"
      }, 404);

    } catch (error) {
      console.error("GOLDVORTEX ERROR:", error);

      return json({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: error?.message || String(error)
      }, 500);
    }
  }
};


// =====================================================
// DATABASE TEST
// =====================================================

async function testDatabase(env) {
  const license = await env.DB.prepare(`
    SELECT *
    FROM licenses
    WHERE license_key = ?
    LIMIT 1
  `).bind("GVX-ACTIVATE-TEST").first();

  return json({
    success: true,
    database: "CONNECTED",
    license_found: !!license,
    license: license || null
  });
}


// =====================================================
// ACTIVATION TEST
// =====================================================

async function activateTest(env) {
  const licenseKey = "GVX-ACTIVATE-TEST";
  const mt5Account = "12345678";
  const broker = "TEST-BROKER";

  const license = await env.DB.prepare(`
    SELECT *
    FROM licenses
    WHERE license_key = ?
    LIMIT 1
  `).bind(licenseKey).first();

  if (!license) {
    return json({
      success: false,
      activated: false,
      error: "LICENSE_NOT_FOUND"
    }, 404);
  }

  if (license.status !== "ACTIVE") {
    return json({
      success: false,
      activated: false,
      error: "LICENSE_" + license.status
    });
  }

  if (isExpired(license)) {
    await expireLicense(env, license.id);
    return json({
      success: false,
      activated: false,
      error: "LICENSE_EXPIRED",
      expires_at: license.expires_at
    });
  }

  if (license.mt5_account &&
      String(license.mt5_account) !== String(mt5Account)) {
    return json({
      success: false,
      activated: false,
      error: "LICENSE_ALREADY_ASSIGNED",
      assigned_to: license.mt5_account
    }, 409);
  }

  await env.DB.prepare(`
    UPDATE licenses
    SET
      mt5_account = ?,
      broker = ?,
      activated_at = COALESCE(activated_at, CURRENT_TIMESTAMP),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    mt5Account,
    broker,
    license.id
  ).run();

  const updated = await getLicenseById(env, license.id);

  return json({
    success: true,
    activated: true,
    first_activation: !license.activated_at,
    message: "LICENSE_ACTIVATED_SUCCESSFULLY",
    license: updated
  });
}


// =====================================================
// LICENSE LOCK TEST
// =====================================================

async function lockTest(env) {
  const licenseKey = "GVX-ACTIVATE-TEST";
  const testAccount = "99999999";

  const license = await env.DB.prepare(`
    SELECT *
    FROM licenses
    WHERE license_key = ?
    LIMIT 1
  `).bind(licenseKey).first();

  if (!license) {
    return json({
      success: false,
      activated: false,
      error: "LICENSE_NOT_FOUND"
    }, 404);
  }

  if (license.mt5_account &&
      String(license.mt5_account) !== String(testAccount)) {
    return json({
      success: false,
      activated: false,
      error: "LICENSE_ALREADY_ASSIGNED",
      assigned_to: license.mt5_account,
      attempted_account: testAccount
    });
  }

  if (!license.mt5_account) {
    return json({
      success: false,
      activated: false,
      error: "LICENSE_NOT_ACTIVATED_YET"
    });
  }

  return json({
    success: true,
    activated: true,
    message: "ACCOUNT_ALREADY_ASSIGNED_TO_LICENSE",
    mt5_account: license.mt5_account
  });
}


// =====================================================
// CUSTOMER / ADMIN LOGIN
// =====================================================
//
// Customer:
//   email + license_key
//
// Admin:
//   email + password
//
// This keeps the requested customer login simple while
// retaining secure password login for the admin panel.
// =====================================================

async function loginUser(request, env) {
  const body = await readJson(request);

  if (!body) {
    return json({
      success: false,
      logged_in: false,
      error: "INVALID_JSON"
    }, 400);
  }

  const email = clean(body.email).toLowerCase();
  const licenseKey = clean(body.license_key);
  const password = clean(body.password);

  if (!email) {
    return json({
      success: false,
      logged_in: false,
      error: "EMAIL_REQUIRED"
    }, 400);
  }

  const user = await env.DB.prepare(`
    SELECT
      id,
      name,
      email,
      password_hash,
      status,
      role,
      created_at,
      updated_at
    FROM users
    WHERE email = ?
    LIMIT 1
  `).bind(email).first();

  if (!user) {
    return json({
      success: false,
      logged_in: false,
      error: "INVALID_EMAIL_OR_LICENSE"
    }, 401);
  }

  if (user.status !== "ACTIVE") {
    return json({
      success: false,
      logged_in: false,
      error: "USER_ACCOUNT_" + user.status
    }, 403);
  }

  // ---------------------------------------------------
  // ADMIN LOGIN
  // ---------------------------------------------------
  if (user.role === "ADMIN") {
    if (!password) {
      return json({
        success: false,
        logged_in: false,
        error: "ADMIN_PASSWORD_REQUIRED"
      }, 400);
    }

    const passwordHash = await hashPassword(password);

    if (passwordHash !== user.password_hash) {
      return json({
        success: false,
        logged_in: false,
        error: "INVALID_EMAIL_OR_PASSWORD"
      }, 401);
    }

    return await createSession(env, user);
  }

  // ---------------------------------------------------
  // CUSTOMER LOGIN
  // ---------------------------------------------------
  if (!licenseKey) {
    return json({
      success: false,
      logged_in: false,
      error: "LICENSE_KEY_REQUIRED"
    }, 400);
  }

  const ownership = await env.DB.prepare(`
    SELECT
      ul.id,
      ul.user_id,
      ul.license_key,
      l.status,
      l.expires_at
    FROM user_licenses ul
    INNER JOIN licenses l
      ON l.license_key = ul.license_key
    WHERE ul.user_id = ?
      AND ul.license_key = ?
    LIMIT 1
  `).bind(user.id, licenseKey).first();

  if (!ownership) {
    return json({
      success: false,
      logged_in: false,
      error: "EMAIL_LICENSE_MISMATCH"
    }, 401);
  }

  const license = await env.DB.prepare(`
    SELECT *
    FROM licenses
    WHERE license_key = ?
    LIMIT 1
  `).bind(licenseKey).first();

  if (!license) {
    return json({
      success: false,
      logged_in: false,
      error: "LICENSE_NOT_FOUND"
    }, 404);
  }

  if (license.status === "ACTIVE" && isExpired(license)) {
    await expireLicense(env, license.id);

    return json({
      success: false,
      logged_in: false,
      error: "LICENSE_EXPIRED",
      expires_at: license.expires_at
    }, 403);
  }

  if (license.status !== "ACTIVE") {
    return json({
      success: false,
      logged_in: false,
      error: "LICENSE_" + license.status
    }, 403);
  }

  return await createSession(env, user, licenseKey);
}


// =====================================================
// CREATE SESSION
// =====================================================

async function createSession(env, user, licenseKey = "") {
  const sessionToken =
    crypto.randomUUID() + "-" + crypto.randomUUID();

  const expiresAt = new Date(
    Date.now() +
    SESSION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  await env.DB.prepare(`
    INSERT INTO user_sessions (
      user_id,
      session_token,
      expires_at,
      created_at,
      last_seen_at
    )
    VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(
    user.id,
    sessionToken,
    expiresAt
  ).run();

  return json({
    success: true,
    logged_in: true,
    message: "LOGIN_SUCCESSFUL",
    token: sessionToken,
    expires_at: expiresAt,
    license_key: licenseKey || null,
    user: publicUser(user)
  });
}


// =====================================================
// CURRENT USER
// =====================================================

async function currentUser(request, env) {
  const session = await getSession(request, env);

  if (!session) {
    return json({
      success: false,
      authenticated: false,
      error: "UNAUTHORIZED"
    }, 401);
  }

  return json({
    success: true,
    authenticated: true,
    user: session.user
  });
}


// =====================================================
// LOGOUT
// =====================================================

async function logoutUser(request, env) {
  const token = getBearerToken(request);

  if (token) {
    await env.DB.prepare(`
      DELETE FROM user_sessions
      WHERE session_token = ?
    `).bind(token).run();
  }

  return json({
    success: true,
    logged_out: true,
    message: "LOGOUT_SUCCESSFUL"
  });
}


// =====================================================
// SESSION
// =====================================================

async function getSession(request, env) {
  const token = getBearerToken(request);

  if (!token) {
    return null;
  }

  const row = await env.DB.prepare(`
    SELECT
      us.id AS session_id,
      us.user_id,
      us.session_token,
      us.expires_at,
      us.last_seen_at,
      u.id,
      u.name,
      u.email,
      u.status,
      u.role,
      u.created_at,
      u.updated_at
    FROM user_sessions us
    INNER JOIN users u
      ON u.id = us.user_id
    WHERE us.session_token = ?
    LIMIT 1
  `).bind(token).first();

  if (!row) {
    return null;
  }

  const expiry = new Date(row.expires_at);

  if (!Number.isFinite(expiry.getTime()) ||
      expiry <= new Date()) {
    await env.DB.prepare(`
      DELETE FROM user_sessions
      WHERE session_token = ?
    `).bind(token).run();

    return null;
  }

  if (row.status !== "ACTIVE") {
    return null;
  }

  await env.DB.prepare(`
    UPDATE user_sessions
    SET last_seen_at = CURRENT_TIMESTAMP
    WHERE session_token = ?
  `).bind(token).run();

  return {
    token,
    user: {
      id: row.id,
      name: row.name,
      email: row.email,
      status: row.status,
      role: row.role,
      created_at: row.created_at,
      updated_at: row.updated_at
    }
  };
}


// =====================================================
// WEBSITE ACCOUNT ACTIVATION
// =====================================================
//
// Expected frontend payload:
//
// {
//   name,
//   email,
//   mt5_account,
//   broker,
//   mt5_password,
//   trading_days
// }
//
// Existing database requires a license to already be
// associated with the MT5 account. The function does not
// generate a new license key.
// =====================================================

async function activateAccount(request, env) {
  const body = await readJson(request);

  if (!body) {
    return json({
      success: false,
      activated: false,
      error: "INVALID_JSON"
    }, 400);
  }

  const name = clean(body.name);
  const email = clean(body.email).toLowerCase();
  const mt5Account = clean(body.mt5_account);
  const broker = clean(body.broker);
  const mt5Password = clean(body.mt5_password);
  const tradingDays = Number(body.trading_days);

  if (!name) {
    return json({
      success: false,
      activated: false,
      error: "FULL_NAME_REQUIRED"
    }, 400);
  }

  if (!isValidEmail(email)) {
    return json({
      success: false,
      activated: false,
      error: "VALID_EMAIL_REQUIRED"
    }, 400);
  }

  if (!mt5Account) {
    return json({
      success: false,
      activated: false,
      error: "MT5_ACCOUNT_REQUIRED"
    }, 400);
  }

  if (!broker) {
    return json({
      success: false,
      activated: false,
      error: "BROKER_REQUIRED"
    }, 400);
  }

  if (!mt5Password) {
    return json({
      success: false,
      activated: false,
      error: "MT5_PASSWORD_REQUIRED"
    }, 400);
  }

  if (!Number.isInteger(tradingDays) ||
      tradingDays < 1 ||
      tradingDays > 3650) {
    return json({
      success: false,
      activated: false,
      error: "INVALID_TRADING_DAYS"
    }, 400);
  }

  // ---------------------------------------------------
  // Create or reuse a license for this MT5 account.
  // Activation is idempotent for the same customer + MT5 account.
  // ---------------------------------------------------
  let license = await env.DB.prepare(`
    SELECT * FROM licenses WHERE mt5_account = ? LIMIT 1
  `).bind(mt5Account).first();

  if (license) {
    const owner = await env.DB.prepare(`
      SELECT u.id, u.email FROM user_licenses ul
      INNER JOIN users u ON u.id = ul.user_id
      WHERE ul.license_key = ? LIMIT 1
    `).bind(license.license_key).first();

    if (owner && owner.email !== email) {
      return json({ success:false, activated:false, error:"MT5_ACCOUNT_ALREADY_REGISTERED" }, 409);
    }
    if (license.status === "ACTIVE" && isExpired(license)) {
      await expireLicense(env, license.id);
      license.status = "EXPIRED";
    }
    if (license.status === "EXPIRED") {
      return json({ success:false, activated:false, error:"MT5_ACCOUNT_LICENSE_EXPIRED" }, 409);
    }
    if (license.broker && String(license.broker).trim() !== String(broker).trim()) {
      return json({ success:false, activated:false, error:"BROKER_MISMATCH", expected_broker:license.broker, received_broker:broker }, 409);
    }
  } else {
    const licenseKey = await generateLicenseKey(env);
    const activationDate = new Date();
    const expiryDate = new Date(activationDate.getTime() + tradingDays * 86400000);
    const result = await env.DB.prepare(`
      INSERT INTO licenses (license_key, mt5_account, broker, symbol, status, activated_at, expires_at, created_at, updated_at)
      VALUES (?, ?, ?, 'XAUUSD', 'ACTIVE', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(licenseKey, mt5Account, broker, activationDate.toISOString(), expiryDate.toISOString()).run();
    license = await env.DB.prepare(`SELECT * FROM licenses WHERE id = ? LIMIT 1`).bind(result.meta.last_row_id).first();
  }

  // ---------------------------------------------------
  // Preserve the original activation window on retries.
  // ---------------------------------------------------
  const activatedAt = license.activated_at || new Date().toISOString();
  const expiresAt = license.expires_at || new Date(Date.now() + tradingDays * 86400000).toISOString();
  if (!license.activated_at || !license.expires_at) {
    await env.DB.prepare(`UPDATE licenses SET activated_at=?, expires_at=?, status='ACTIVE', broker=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .bind(activatedAt, expiresAt, broker, license.id).run();
    license = await getLicenseById(env, license.id);
  }

  // MT5 password is accepted over HTTPS for provisioning context but is NOT stored in D1.
  // The Monitor EA should be installed on the VPS using broker credentials directly.

  await env.DB.prepare(`UPDATE licenses SET broker=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(broker, license.id).run();
  license = await getLicenseById(env, license.id);

  // ---------------------------------------------------
  // Create/update website customer account
  //
  // password_hash is required by the existing schema.
  // Customer authentication does NOT use this password.
  // A deterministic SHA-256 placeholder is stored only
  // to satisfy the existing NOT NULL schema.
  // ---------------------------------------------------
  let user = await env.DB.prepare(`
    SELECT
      id,
      name,
      email,
      password_hash,
      status,
      role,
      created_at,
      updated_at
    FROM users
    WHERE email = ?
    LIMIT 1
  `).bind(email).first();

  if (!user) {
    const placeholderPasswordHash =
      await hashPassword(
        "GVX-ACCOUNT-" + license.license_key
      );

    const result = await env.DB.prepare(`
      INSERT INTO users (
        name,
        email,
        password_hash,
        status,
        role,
        created_at,
        updated_at
      )
      VALUES (
        ?, ?, ?, 'ACTIVE', 'CUSTOMER',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `).bind(
      name,
      email,
      placeholderPasswordHash
    ).run();

    user = await env.DB.prepare(`
      SELECT
        id,
        name,
        email,
        password_hash,
        status,
        role,
        created_at,
        updated_at
      FROM users
      WHERE id = ?
      LIMIT 1
    `).bind(result.meta.last_row_id).first();
  } else {
    if (user.role !== "CUSTOMER") {
      return json({
        success: false,
        activated: false,
        error: "EMAIL_BELONGS_TO_ADMIN_ACCOUNT"
      }, 409);
    }

    await env.DB.prepare(`
      UPDATE users
      SET
        name = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(name, user.id).run();
  }

  // ---------------------------------------------------
  // Assign license to customer
  // ---------------------------------------------------
  const customerLicense = await env.DB.prepare(`
    SELECT
      id,
      user_id,
      license_key
    FROM user_licenses
    WHERE license_key = ?
    LIMIT 1
  `).bind(license.license_key).first();

  if (!customerLicense) {
    await env.DB.prepare(`
      INSERT INTO user_licenses (
        user_id,
        license_key,
        created_at
      )
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `).bind(
      user.id,
      license.license_key
    ).run();
  } else if (Number(customerLicense.user_id) !== Number(user.id)) {
    return json({
      success: false,
      activated: false,
      error: "LICENSE_ALREADY_ASSIGNED_TO_ANOTHER_USER"
    }, 409);
  }

  const monitorToken = await ensureMonitorAccount(env, license, mt5Account);

  const updatedLicense = await getLicenseById(
    env,
    license.id
  );

  // ---------------------------------------------------
  // Send activation email
  // ---------------------------------------------------
  const emailResult = await sendActivationEmail({
    env,
    to: email,
    name,
    licenseKey: updatedLicense.license_key,
    mt5Account: updatedLicense.mt5_account,
    broker: updatedLicense.broker,
    activationDate: updatedLicense.activated_at,
    expiryDate: updatedLicense.expires_at,
    monitorToken
  });

  return json({
    success: true,
    activated: true,
    message: "LICENSE_ACTIVATION_SUCCESSFUL",
    email_sent: emailResult.sent,
    email_error: emailResult.error || null,
    customer: {
      id: user.id,
      name,
      email
    },
    mt5_account: mt5Account,
    broker,
    trading_days: tradingDays,
    activation_date: activatedAt,
    expiry_date: updatedLicense.expires_at,
    monitor_token: monitorToken,
    activation_notice: ACTIVATION_GRACE_MESSAGE,
    license: publicLicense(updatedLicense)
  });
}


// =====================================================
// REAL LICENSE ACTIVATION
// =====================================================
//
// Used by an EA or an existing integration that already
// has a license key + MT5 account.
// =====================================================

async function activateLicense(request, env) {
  const body = await readJson(request);

  if (!body) {
    return json({
      success: false,
      activated: false,
      error: "INVALID_JSON"
    }, 400);
  }

  const licenseKey = clean(body.license_key);
  const mt5Account = clean(body.mt5_account);
  const broker = clean(body.broker);

  if (!licenseKey || !mt5Account) {
    return json({
      success: false,
      activated: false,
      error: "LICENSE_KEY_AND_MT5_ACCOUNT_REQUIRED"
    }, 400);
  }

  const license = await env.DB.prepare(`
    SELECT *
    FROM licenses
    WHERE license_key = ?
    LIMIT 1
  `).bind(licenseKey).first();

  if (!license) {
    return json({
      success: false,
      activated: false,
      error: "LICENSE_NOT_FOUND"
    }, 404);
  }

  if (license.status !== "ACTIVE") {
    return json({
      success: false,
      activated: false,
      error: "LICENSE_" + license.status
    }, 403);
  }

  if (isExpired(license)) {
    await expireLicense(env, license.id);

    return json({
      success: false,
      activated: false,
      error: "LICENSE_EXPIRED",
      expires_at: license.expires_at
    }, 403);
  }

  if (license.mt5_account &&
      String(license.mt5_account) !== String(mt5Account)) {
    return json({
      success: false,
      activated: false,
      error: "LICENSE_ALREADY_ASSIGNED",
      assigned_to: license.mt5_account
    }, 409);
  }

  await env.DB.prepare(`
    UPDATE licenses
    SET
      mt5_account = ?,
      broker = ?,
      activated_at = COALESCE(activated_at, CURRENT_TIMESTAMP),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    mt5Account,
    broker,
    license.id
  ).run();

  const updated = await getLicenseById(env, license.id);

  return json({
    success: true,
    activated: true,
    first_activation: !license.activated_at,
    message: "LICENSE_ACTIVATED_SUCCESSFULLY",
    license: publicLicense(updated)
  });
}


// =====================================================
// MY LICENSE
// =====================================================

async function myLicense(request, env) {
  const session = await getSession(request, env);

  if (!session) {
    return json({
      success: false,
      authenticated: false,
      error: "UNAUTHORIZED"
    }, 401);
  }

  if (session.user.role === "ADMIN") {
    const result = await env.DB.prepare(`
      SELECT
        id,
        license_key,
        mt5_account,
        broker,
        symbol,
        status,
        activated_at,
        expires_at,
        created_at,
        updated_at
      FROM licenses
      ORDER BY id ASC
    `).all();

    return json({
      success: true,
      authenticated: true,
      role: "ADMIN",
      has_license: (result.results || []).length > 0,
      licenses: (result.results || []).map(publicLicense)
    });
  }

  const result = await env.DB.prepare(`
    SELECT
      l.id,
      l.license_key,
      l.mt5_account,
      l.broker,
      l.symbol,
      l.status,
      l.activated_at,
      l.expires_at,
      l.created_at,
      l.updated_at
    FROM user_licenses ul
    INNER JOIN licenses l
      ON l.license_key = ul.license_key
    WHERE ul.user_id = ?
    ORDER BY l.id ASC
  `).bind(session.user.id).all();

  const licenses = result.results || [];

  for (const license of licenses) {
    if (license.status === "ACTIVE" && isExpired(license)) {
      await expireLicense(env, license.id);
      license.status = "EXPIRED";
    }
  }

  return json({
    success: true,
    authenticated: true,
    role: "CUSTOMER",
    has_license: licenses.length > 0,
    license: licenses.length === 1 ? publicLicense(licenses[0]) : null,
    licenses: licenses.map(publicLicense)
  });
}


// =====================================================
// RESEND LICENSE EMAIL
// =====================================================

async function resendLicenseEmail(request, env) {
  const session = await getSession(request, env);
  if (!session) return json({success:false,error:"UNAUTHORIZED"},401);
  const body = await readJson(request);
  const requested = clean(body?.license_key);
  const row = await env.DB.prepare(`
    SELECT l.*, u.id AS user_id, u.name, u.email
    FROM licenses l
    INNER JOIN user_licenses ul ON ul.license_key=l.license_key
    INNER JOIN users u ON u.id=ul.user_id
    WHERE l.license_key=? LIMIT 1
  `).bind(requested).first();
  if (!row) return json({success:false,error:"LICENSE_NOT_FOUND"},404);
  if (session.user.role !== "ADMIN" && Number(row.user_id) !== Number(session.user.id)) return json({success:false,error:"LICENSE_ACCESS_DENIED"},403);
  const tokenRow = await env.DB.prepare(`SELECT monitor_token FROM monitor_accounts WHERE license_key=? LIMIT 1`).bind(row.license_key).first();
  const result = await sendActivationEmail({env,to:row.email,name:row.name,licenseKey:row.license_key,mt5Account:row.mt5_account,broker:row.broker,activationDate:row.activated_at,expiryDate:row.expires_at,monitorToken:tokenRow?.monitor_token||"Available in dashboard"});
  return json({success:result.sent,email_sent:result.sent,email_error:result.error||null});
}

// =====================================================
// CUSTOMER MONITOR TOKEN
// =====================================================

async function myMonitorToken(request, env) {
  const session = await getSession(request, env);
  if (!session) return json({ success:false, error:"UNAUTHORIZED" }, 401);
  if (session.user.role === "ADMIN") return json({ success:false, error:"CUSTOMER_ENDPOINT_ONLY" }, 403);
  const row = await env.DB.prepare(`
    SELECT ma.license_key, ma.mt5_account, ma.monitor_token, ma.status, l.status AS license_status, l.expires_at
    FROM monitor_accounts ma
    INNER JOIN user_licenses ul ON ul.license_key = ma.license_key
    INNER JOIN licenses l ON l.license_key = ma.license_key
    WHERE ul.user_id = ? ORDER BY ma.id DESC LIMIT 1
  `).bind(session.user.id).first();
  if (!row) return json({ success:false, error:"MONITOR_ACCOUNT_NOT_FOUND" }, 404);
  return json({ success:true, monitor:row });
}

// =====================================================
// VERIFY LICENSE
// =====================================================

async function verifyLicense(request, env) {
  const body = await readJson(request);

  if (!body) {
    return json({
      success: false,
      valid: false,
      error: "INVALID_JSON"
    }, 400);
  }

  const licenseKey = clean(body.license_key);
  const mt5Account = clean(body.mt5_account);

  if (!licenseKey || !mt5Account) {
    return json({
      success: false,
      valid: false,
      error: "LICENSE_KEY_AND_MT5_ACCOUNT_REQUIRED"
    }, 400);
  }

  const license = await env.DB.prepare(`
    SELECT *
    FROM licenses
    WHERE license_key = ?
    LIMIT 1
  `).bind(licenseKey).first();

  if (!license) {
    return json({
      success: true,
      valid: false,
      status: "LICENSE_NOT_FOUND",
      error: "LICENSE_NOT_FOUND"
    });
  }

  if (String(license.mt5_account) !== String(mt5Account)) {
    return json({
      success: true,
      valid: false,
      status: "ACCOUNT_MISMATCH",
      error: "ACCOUNT_MISMATCH"
    });
  }

  if (license.status !== "ACTIVE") {
    const status = "LICENSE_" + license.status;
    return json({
      success: true,
      valid: false,
      status,
      error: status
    });
  }

  if (isExpired(license)) {
    await expireLicense(env, license.id);

    return json({
      success: true,
      valid: false,
      status: "LICENSE_EXPIRED",
      error: "LICENSE_EXPIRED",
      expires_at: license.expires_at
    });
  }

  return json({
    success: true,
    valid: true,
    status: "LICENSE_VALID",
    message: "LICENSE_VALID",
    license: publicLicense(license)
  });
}


// =====================================================
// LICENSE STATUS
// =====================================================

async function licenseStatus(request, env) {
  const body = await readJson(request);

  if (!body) {
    return json({
      success: false,
      error: "INVALID_JSON"
    }, 400);
  }

  const licenseKey = clean(body.license_key);

  if (!licenseKey) {
    return json({
      success: false,
      error: "LICENSE_KEY_REQUIRED"
    }, 400);
  }

  const license = await env.DB.prepare(`
    SELECT
      id,
      license_key,
      mt5_account,
      broker,
      symbol,
      status,
      activated_at,
      expires_at,
      created_at,
      updated_at
    FROM licenses
    WHERE license_key = ?
    LIMIT 1
  `).bind(licenseKey).first();

  if (!license) {
    return json({
      success: false,
      error: "LICENSE_NOT_FOUND"
    }, 404);
  }

  if (license.status === "ACTIVE" && isExpired(license)) {
    await expireLicense(env, license.id);
    license.status = "EXPIRED";
  }

  return json({
    success: true,
    license: publicLicense(license)
  });
}


// =====================================================
// MT5 MONITOR
// =====================================================
//
// Existing EA-compatible endpoint.
// No customer login is required.
// =====================================================

async function monitorData(request, env) {
  const body = await readJson(request);

  if (!body) {
    return json({
      success: false,
      monitor_saved: false,
      error: "INVALID_JSON"
    }, 400);
  }

  const licenseKey = clean(body.license_key);
  const mt5Account = clean(body.mt5_account);
  const broker = clean(body.broker);
  const server = clean(body.server);
  const balance = number(body.balance);
  const equity = number(body.equity);
  const margin = number(body.margin);
  const freeMargin = number(body.free_margin);
  const marginLevel = number(body.margin_level);
  const currency = clean(body.currency);
  const symbol = clean(body.symbol);
  const positions = integer(body.positions);
  const buyPositions = integer(body.buy_positions);
  const sellPositions = integer(body.sell_positions);
  const totalLots = number(body.total_lots);
  const floatingProfit = number(body.floating_profit);
  const swap = number(body.swap);
  const eaStatus = clean(body.ea_status);
  const licenseStatus = clean(body.license_status);

  if (!licenseKey || !mt5Account) {
    return json({
      success: false,
      monitor_saved: false,
      error: "LICENSE_KEY_AND_MT5_ACCOUNT_REQUIRED"
    }, 400);
  }

  const license = await env.DB.prepare(`
    SELECT *
    FROM licenses
    WHERE license_key = ?
    LIMIT 1
  `).bind(licenseKey).first();

  if (!license) {
    return json({
      success: false,
      monitor_saved: false,
      error: "LICENSE_NOT_FOUND"
    }, 404);
  }

  if (String(license.mt5_account) !== String(mt5Account)) {
    return json({
      success: false,
      monitor_saved: false,
      error: "ACCOUNT_MISMATCH"
    }, 403);
  }

  if (license.status !== "ACTIVE") {
    return json({
      success: false,
      monitor_saved: false,
      error: "LICENSE_" + license.status
    }, 403);
  }

  if (isExpired(license)) {
    await expireLicense(env, license.id);

    await maybeSendExpiredEmail(env, license);

    return json({
      success: false,
      monitor_saved: false,
      error: "LICENSE_EXPIRED",
      expires_at: license.expires_at
    }, 403);
  }

  // GOLDVORTEX Monitor v5.15 authenticates with license_key + mt5_account
  // and does not send a monitor token. Keep that legacy protocol compatible.
  // A token is accepted when supplied by newer EA clients, but it is optional
  // for v5.15 so the existing active EA does not need to be reinstalled.
  let monitorAccount = await env.DB.prepare(`
    SELECT id, monitor_token, status
    FROM monitor_accounts
    WHERE license_key=? AND mt5_account=?
    LIMIT 1
  `).bind(licenseKey, mt5Account).first();

  if (!monitorAccount) {
    await ensureMonitorAccount(env, license, mt5Account);
    monitorAccount = await env.DB.prepare(`
      SELECT id, monitor_token, status
      FROM monitor_accounts
      WHERE license_key=? AND mt5_account=?
      LIMIT 1
    `).bind(licenseKey, mt5Account).first();
  }

  const monitorToken = clean(
    body.monitor_token ||
    request.headers.get("X-GOLDVORTEX-MONITOR-TOKEN")
  );

  if (monitorToken) {
    if (!(await validateMonitorToken(env, licenseKey, mt5Account, monitorToken))) {
      return json({
        success:false,
        monitor_saved:false,
        error:"MONITOR_TOKEN_INVALID"
      }, 403);
    }
  }

  await env.DB.prepare(`
    UPDATE monitor_accounts
    SET last_seen_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
    WHERE license_key=? AND mt5_account=?
  `).bind(licenseKey, mt5Account).run();

  const previousMonitor = await env.DB.prepare(`
    SELECT
      license_key,
      ea_status,
      license_status,
      last_update
    FROM mt5_monitor
    WHERE license_key = ?
    LIMIT 1
  `).bind(licenseKey).first();

  await env.DB.prepare(`
    INSERT INTO mt5_monitor (
      license_key,
      mt5_account,
      broker,
      server,
      balance,
      equity,
      margin,
      free_margin,
      margin_level,
      currency,
      symbol,
      positions,
      buy_positions,
      sell_positions,
      total_lots,
      floating_profit,
      swap,
      ea_status,
      license_status,
      last_update
    )
    VALUES (
      ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP
    )
    ON CONFLICT(license_key)
    DO UPDATE SET
      mt5_account = excluded.mt5_account,
      broker = excluded.broker,
      server = excluded.server,
      balance = excluded.balance,
      equity = excluded.equity,
      margin = excluded.margin,
      free_margin = excluded.free_margin,
      margin_level = excluded.margin_level,
      currency = excluded.currency,
      symbol = excluded.symbol,
      positions = excluded.positions,
      buy_positions = excluded.buy_positions,
      sell_positions = excluded.sell_positions,
      total_lots = excluded.total_lots,
      floating_profit = excluded.floating_profit,
      swap = excluded.swap,
      ea_status = excluded.ea_status,
      license_status = excluded.license_status,
      last_update = CURRENT_TIMESTAMP
  `).bind(
    licenseKey,
    mt5Account,
    broker,
    server,
    balance,
    equity,
    margin,
    freeMargin,
    marginLevel,
    currency,
    symbol,
    positions,
    buyPositions,
    sellPositions,
    totalLots,
    floatingProfit,
    swap,
    eaStatus,
    licenseStatus
  ).run();

  // Keep the existing position_details table as the
  // dashboard source. Do not touch mt5_positions.
  if (positions === 0) {
    await env.DB.prepare(`
      DELETE FROM position_details
      WHERE license_key = ?
    `).bind(licenseKey).run();
  } else if (Array.isArray(body.position_details)) {
    await syncPositionDetails(
      env,
      licenseKey,
      mt5Account,
      body.position_details
    );
  }

  // First valid monitor heartbeat after activation.
  if (!previousMonitor &&
      isMonitorOnline(eaStatus, licenseStatus)) {
    await maybeSendActiveEmail(env, license);
  }

  return json({
    success: true,
    monitor_saved: true,
    message: "MT5_MONITOR_DATA_SAVED",
    mt5_account: mt5Account,
    license_key: licenseKey,
    last_update: new Date().toISOString()
  });
}


// =====================================================
// POSITION DETAILS
// =====================================================

async function syncPositionDetails(
  env,
  licenseKey,
  mt5Account,
  rawPositions
) {
  const positions = Array.isArray(rawPositions)
    ? rawPositions
    : [];

  await env.DB.prepare(`
    DELETE FROM position_details
    WHERE license_key = ?
  `).bind(licenseKey).run();

  for (const item of positions) {
    const ticket = clean(item.ticket);

    if (!ticket) continue;

    await env.DB.prepare(`
      INSERT INTO position_details (
        ticket,
        license_key,
        mt5_account,
        symbol,
        position_type,
        volume,
        open_price,
        current_price,
        sl,
        tp,
        profit,
        updated_at
      )
      VALUES (
        ?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP
      )
    `).bind(
      ticket,
      licenseKey,
      mt5Account,
      clean(item.symbol),
      clean(item.position_type),
      number(item.volume),
      number(item.open_price),
      number(item.current_price),
      number(item.sl),
      number(item.tp),
      number(item.profit)
    ).run();
  }

  return positions.length;
}


// =====================================================
// POSITION DETAILS ENDPOINT
// =====================================================

async function monitorPositions(request, env) {
  const body = await readJson(request);

  if (!body) {
    return json({
      success: false,
      positions_saved: false,
      error: "INVALID_JSON"
    }, 400);
  }

  const licenseKey = clean(body.license_key);
  const mt5Account = clean(body.mt5_account);

  if (!licenseKey || !mt5Account) {
    return json({
      success: false,
      positions_saved: false,
      error: "LICENSE_KEY_AND_MT5_ACCOUNT_REQUIRED"
    }, 400);
  }

  const license = await env.DB.prepare(`
    SELECT *
    FROM licenses
    WHERE license_key = ?
    LIMIT 1
  `).bind(licenseKey).first();

  if (!license) {
    return json({
      success: false,
      positions_saved: false,
      error: "LICENSE_NOT_FOUND"
    }, 404);
  }

  if (String(license.mt5_account) !== String(mt5Account)) {
    return json({
      success: false,
      positions_saved: false,
      error: "ACCOUNT_MISMATCH"
    }, 403);
  }

  if (license.status !== "ACTIVE") {
    return json({
      success: false,
      positions_saved: false,
      error: "LICENSE_" + license.status
    }, 403);
  }

  if (isExpired(license)) {
    await expireLicense(env, license.id);
    await maybeSendExpiredEmail(env, license);

    return json({
      success: false,
      positions_saved: false,
      error: "LICENSE_EXPIRED",
      expires_at: license.expires_at
    }, 403);
  }

  // Position endpoint is also backward-compatible with the existing v5.15 EA.
  // v5.15 sends position_details inside /api/monitor, so this endpoint is optional.
  const monitorToken = clean(
    body.monitor_token ||
    request.headers.get("X-GOLDVORTEX-MONITOR-TOKEN")
  );
  if (monitorToken && !(await validateMonitorToken(env, licenseKey, mt5Account, monitorToken))) {
    return json({
      success:false,
      positions_saved:false,
      error:"MONITOR_TOKEN_INVALID"
    }, 403);
  }

  if (!Array.isArray(body.position_details)) {
    return json({
      success: false,
      positions_saved: false,
      error: "POSITION_DETAILS_ARRAY_REQUIRED"
    }, 400);
  }

  const count = await syncPositionDetails(
    env,
    licenseKey,
    mt5Account,
    body.position_details
  );

  return json({
    success: true,
    positions_saved: true,
    count,
    license_key: licenseKey,
    mt5_account: mt5Account,
    last_update: new Date().toISOString()
  });
}


// =====================================================
// CUSTOMER DASHBOARD
// =====================================================

async function dashboardData(request, env) {
  const session = await getSession(request, env);

  if (!session) {
    return json({
      success: false,
      authenticated: false,
      error: "UNAUTHORIZED"
    }, 401);
  }

  const url = new URL(request.url);
  const requestedLicense = clean(
    url.searchParams.get("license_key")
  );

  // Customer dashboard must specify the license.
  // Admin may also use this endpoint for a selected license.
  if (!requestedLicense) {
    return json({
      success: false,
      error: "LICENSE_KEY_REQUIRED"
    }, 400);
  }

  const license = await env.DB.prepare(`
    SELECT
      id,
      license_key,
      mt5_account,
      broker,
      symbol,
      status,
      activated_at,
      expires_at,
      created_at,
      updated_at
    FROM licenses
    WHERE license_key = ?
    LIMIT 1
  `).bind(requestedLicense).first();

  if (!license) {
    return json({
      success: false,
      error: "LICENSE_NOT_FOUND"
    }, 404);
  }

  // Customer isolation.
  if (session.user.role !== "ADMIN") {
    const ownership = await env.DB.prepare(`
      SELECT
        id,
        user_id,
        license_key
      FROM user_licenses
      WHERE user_id = ?
        AND license_key = ?
      LIMIT 1
    `).bind(
      session.user.id,
      requestedLicense
    ).first();

    if (!ownership) {
      return json({
        success: false,
        error: "LICENSE_ACCESS_DENIED"
      }, 403);
    }
  }

  if (license.status === "ACTIVE" &&
      isExpired(license)) {
    await expireLicense(env, license.id);
    license.status = "EXPIRED";
    await maybeSendExpiredEmail(env, license);
  }

  const monitor = await env.DB.prepare(`
    SELECT
      id,
      license_key,
      mt5_account,
      broker,
      server,
      balance,
      equity,
      margin,
      free_margin,
      margin_level,
      currency,
      symbol,
      positions,
      buy_positions,
      sell_positions,
      total_lots,
      floating_profit,
      swap,
      ea_status,
      license_status,
      last_update
    FROM mt5_monitor
    WHERE license_key = ?
    LIMIT 1
  `).bind(requestedLicense).first();

  const positions = await env.DB.prepare(`
    SELECT
      ticket,
      license_key,
      mt5_account,
      symbol,
      position_type,
      volume,
      open_price,
      current_price,
      sl,
      tp,
      profit,
      updated_at
    FROM position_details
    WHERE license_key = ?
    ORDER BY updated_at DESC
  `).bind(requestedLicense).all();

  return json({
    success: true,
    dashboard: "GOLDVORTEX",
    mode: "READ_ONLY",
    authenticated: true,
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role
    },
    license: publicLicense(license),
    monitor: monitor || null,
    positions: positions.results || []
  });
}


// =====================================================
// ADMIN BOOTSTRAP
// =====================================================

async function adminBootstrap(request, env) {
  if (!env.ADMIN_BOOTSTRAP_SECRET) {
    return json({
      success: false,
      created: false,
      error: "ADMIN_BOOTSTRAP_SECRET_NOT_CONFIGURED"
    }, 500);
  }

  const body = await readJson(request);

  if (!body) {
    return json({
      success: false,
      created: false,
      error: "INVALID_JSON"
    }, 400);
  }

  const bootstrapSecret = clean(body.bootstrap_secret);
  const name = clean(body.name);
  const email = clean(body.email).toLowerCase();
  const password = clean(body.password);

  if (!bootstrapSecret) {
    return json({
      success: false,
      created: false,
      error: "BOOTSTRAP_SECRET_REQUIRED"
    }, 400);
  }

  if (bootstrapSecret !== env.ADMIN_BOOTSTRAP_SECRET) {
    return json({
      success: false,
      created: false,
      error: "INVALID_BOOTSTRAP_SECRET"
    }, 403);
  }

  if (!name) {
    return json({
      success: false,
      created: false,
      error: "ADMIN_NAME_REQUIRED"
    }, 400);
  }

  if (!isValidEmail(email)) {
    return json({
      success: false,
      created: false,
      error: "VALID_ADMIN_EMAIL_REQUIRED"
    }, 400);
  }

  if (!password) {
    return json({
      success: false,
      created: false,
      error: "ADMIN_PASSWORD_REQUIRED"
    }, 400);
  }

  if (password.length < 8) {
    return json({
      success: false,
      created: false,
      error: "ADMIN_PASSWORD_MINIMUM_8_CHARACTERS"
    }, 400);
  }

  const existingAdmin = await env.DB.prepare(`
    SELECT id, name, email, role, status
    FROM users
    WHERE role = 'ADMIN'
    LIMIT 1
  `).first();

  if (existingAdmin) {
    return json({
      success: false,
      created: false,
      error: "ADMIN_ALREADY_EXISTS",
      admin: existingAdmin
    }, 409);
  }

  const existingUser = await env.DB.prepare(`
    SELECT id, email, role, status
    FROM users
    WHERE email = ?
    LIMIT 1
  `).bind(email).first();

  if (existingUser) {
    return json({
      success: false,
      created: false,
      error: "EMAIL_ALREADY_REGISTERED"
    }, 409);
  }

  const passwordHash = await hashPassword(password);

  const result = await env.DB.prepare(`
    INSERT INTO users (
      name,
      email,
      password_hash,
      status,
      role,
      created_at,
      updated_at
    )
    VALUES (
      ?, ?, ?, 'ACTIVE', 'ADMIN',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
  `).bind(
    name,
    email,
    passwordHash
  ).run();

  const admin = await env.DB.prepare(`
    SELECT
      id,
      name,
      email,
      status,
      role,
      created_at,
      updated_at
    FROM users
    WHERE id = ?
    LIMIT 1
  `).bind(result.meta.last_row_id).first();

  return json({
    success: true,
    created: true,
    message: "ADMIN_ACCOUNT_CREATED_SUCCESSFULLY",
    admin
  });
}


// =====================================================
// ADMIN USERS
// =====================================================

async function adminUsers(request, env) {
  const session = await requireAdmin(request, env);

  if (!session) {
    return json({
      success: false,
      error: "ADMIN_ACCESS_REQUIRED"
    }, 403);
  }

  const users = await env.DB.prepare(`
    SELECT
      u.id, u.name, u.email, u.status, u.role, u.created_at, u.updated_at,
      l.license_key, l.mt5_account, l.broker, l.symbol, l.status AS license_status,
      l.activated_at, l.expires_at
    FROM users u
    LEFT JOIN user_licenses ul ON ul.user_id = u.id
    LEFT JOIN licenses l ON l.license_key = ul.license_key
    ORDER BY u.id ASC, l.id ASC
  `).all();

  return json({ success:true, users: users.results || [] });
}


// =====================================================
// ADMIN CREATE CUSTOMER
// =====================================================

async function adminCreateUser(request, env) {
  const session = await requireAdmin(request, env);

  if (!session) {
    return json({
      success: false,
      created: false,
      error: "ADMIN_ACCESS_REQUIRED"
    }, 403);
  }

  const body = await readJson(request);

  if (!body) {
    return json({
      success: false,
      created: false,
      error: "INVALID_JSON"
    }, 400);
  }

  const name = clean(body.name);
  const email = clean(body.email).toLowerCase();

  // Optional because customer login uses email + license.
  const password = clean(body.password);

  if (!name) {
    return json({
      success: false,
      created: false,
      error: "CUSTOMER_NAME_REQUIRED"
    }, 400);
  }

  if (!isValidEmail(email)) {
    return json({
      success: false,
      created: false,
      error: "VALID_CUSTOMER_EMAIL_REQUIRED"
    }, 400);
  }

  const existingUser = await env.DB.prepare(`
    SELECT id, name, email, status, role
    FROM users
    WHERE email = ?
    LIMIT 1
  `).bind(email).first();

  if (existingUser) {
    return json({
      success: false,
      created: false,
      error: "EMAIL_ALREADY_REGISTERED"
    }, 409);
  }

  const passwordHash = await hashPassword(
    password || "GVX-ADMIN-CREATED-" + crypto.randomUUID()
  );

  const result = await env.DB.prepare(`
    INSERT INTO users (
      name,
      email,
      password_hash,
      status,
      role,
      created_at,
      updated_at
    )
    VALUES (
      ?, ?, ?, 'ACTIVE', 'CUSTOMER',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
  `).bind(
    name,
    email,
    passwordHash
  ).run();

  const customer = await env.DB.prepare(`
    SELECT
      id,
      name,
      email,
      status,
      role,
      created_at,
      updated_at
    FROM users
    WHERE id = ?
    LIMIT 1
  `).bind(result.meta.last_row_id).first();

  return json({
    success: true,
    created: true,
    message: "CUSTOMER_ACCOUNT_CREATED_SUCCESSFULLY",
    customer
  });
}


// =====================================================
// ADMIN ASSIGN LICENSE
// =====================================================

async function adminAssignLicense(request, env) {
  const session = await requireAdmin(request, env);

  if (!session) {
    return json({
      success: false,
      error: "ADMIN_ACCESS_REQUIRED"
    }, 403);
  }

  const body = await readJson(request);

  if (!body) {
    return json({
      success: false,
      error: "INVALID_JSON"
    }, 400);
  }

  const userId = Number(body.user_id);
  const licenseKey = clean(body.license_key);

  if (!Number.isInteger(userId) || userId < 1) {
    return json({
      success: false,
      error: "USER_ID_REQUIRED"
    }, 400);
  }

  if (!licenseKey) {
    return json({
      success: false,
      error: "LICENSE_KEY_REQUIRED"
    }, 400);
  }

  const user = await env.DB.prepare(`
    SELECT
      id,
      name,
      email,
      status,
      role
    FROM users
    WHERE id = ?
    LIMIT 1
  `).bind(userId).first();

  if (!user) {
    return json({
      success: false,
      error: "USER_NOT_FOUND"
    }, 404);
  }

  if (user.role !== "CUSTOMER") {
    return json({
      success: false,
      error: "LICENSE_CAN_ONLY_BE_ASSIGNED_TO_CUSTOMER"
    }, 400);
  }

  const license = await env.DB.prepare(`
    SELECT
      id,
      license_key,
      mt5_account,
      broker,
      status,
      expires_at
    FROM licenses
    WHERE license_key = ?
    LIMIT 1
  `).bind(licenseKey).first();

  if (!license) {
    return json({
      success: false,
      error: "LICENSE_NOT_FOUND"
    }, 404);
  }

  const existing = await env.DB.prepare(`
    SELECT
      id,
      user_id,
      license_key
    FROM user_licenses
    WHERE license_key = ?
    LIMIT 1
  `).bind(licenseKey).first();

  if (existing) {
    if (Number(existing.user_id) === Number(userId)) {
      return json({
        success: true,
        assigned: true,
        already_assigned: true,
        message: "LICENSE_ALREADY_ASSIGNED_TO_THIS_USER",
        user,
        license: publicLicense(license)
      });
    }

    return json({
      success: false,
      assigned: false,
      error: "LICENSE_ALREADY_ASSIGNED_TO_ANOTHER_USER"
    }, 409);
  }

  await env.DB.prepare(`
    INSERT INTO user_licenses (
      user_id,
      license_key,
      created_at
    )
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `).bind(
    userId,
    licenseKey
  ).run();

  return json({
    success: true,
    assigned: true,
    message: "LICENSE_ASSIGNED_SUCCESSFULLY",
    user,
    license: publicLicense(license)
  });
}


// =====================================================
// ADMIN LICENSE MANAGEMENT / STATS / QUEUE
// =====================================================

async function adminLicenses(request, env) {
  if (!(await requireAdmin(request, env))) return json({success:false,error:"ADMIN_ACCESS_REQUIRED"},403);
  const rows=await env.DB.prepare(`SELECT l.*,u.name AS customer_name,u.email AS customer_email FROM licenses l LEFT JOIN user_licenses ul ON ul.license_key=l.license_key LEFT JOIN users u ON u.id=ul.user_id ORDER BY l.id DESC`).all();
  return json({success:true,licenses:rows.results||[]});
}

async function adminCreateLicense(request, env) {
  if (!(await requireAdmin(request, env))) return json({success:false,error:"ADMIN_ACCESS_REQUIRED"},403);
  const body=await readJson(request); if(!body) return json({success:false,error:"INVALID_JSON"},400);
  const mt5Account=clean(body.mt5_account), broker=clean(body.broker), symbol=clean(body.symbol)||"XAUUSD", days=Number(body.trading_days||30);
  if(!Number.isInteger(days)||days<1||days>3650) return json({success:false,error:"INVALID_TRADING_DAYS"},400);
  if(mt5Account){const exists=await env.DB.prepare(`SELECT id FROM licenses WHERE mt5_account=? LIMIT 1`).bind(mt5Account).first(); if(exists)return json({success:false,error:"MT5_ACCOUNT_ALREADY_REGISTERED"},409);}
  const key=await generateLicenseKey(env), now=new Date(), expires=new Date(now.getTime()+days*86400000);
  await env.DB.prepare(`INSERT INTO licenses (license_key,mt5_account,broker,symbol,status,activated_at,expires_at,created_at,updated_at) VALUES (?,?,?,?, 'ACTIVE',?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).bind(key,mt5Account||null,broker||null,symbol,now.toISOString(),expires.toISOString()).run();
  return json({success:true,license:publicLicense(await env.DB.prepare(`SELECT * FROM licenses WHERE license_key=?`).bind(key).first())});
}

async function adminUpdateLicense(request, env) {
  if (!(await requireAdmin(request, env))) return json({success:false,error:"ADMIN_ACCESS_REQUIRED"},403);
  const body=await readJson(request); const key=clean(body?.license_key), status=clean(body?.status).toUpperCase();
  if(!key||!["ACTIVE","EXPIRED","SUSPENDED","PENDING"].includes(status)) return json({success:false,error:"INVALID_LICENSE_UPDATE"},400);
  const license=await env.DB.prepare(`SELECT * FROM licenses WHERE license_key=? LIMIT 1`).bind(key).first(); if(!license)return json({success:false,error:"LICENSE_NOT_FOUND"},404);
  await env.DB.prepare(`UPDATE licenses SET status=?,updated_at=CURRENT_TIMESTAMP WHERE license_key=?`).bind(status,key).run();
  return json({success:true,license:publicLicense(await env.DB.prepare(`SELECT * FROM licenses WHERE license_key=?`).bind(key).first())});
}

async function adminStats(request, env) {
  if (!(await requireAdmin(request, env))) return json({success:false,error:"ADMIN_ACCESS_REQUIRED"},403);
  const [users,active,expired,monitors,positions]=await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS count FROM users WHERE role='CUSTOMER'`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM licenses WHERE status='ACTIVE'`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM licenses WHERE status='EXPIRED'`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM mt5_monitor WHERE last_update >= datetime('now','-10 minutes')`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM position_details`).first()
  ]);
  return json({success:true,stats:{customers:Number(users?.count||0),active_licenses:Number(active?.count||0),expired_licenses:Number(expired?.count||0),online_monitors:Number(monitors?.count||0),open_positions:Number(positions?.count||0)}});
}

async function adminActivationQueue(request, env) {
  if (!(await requireAdmin(request, env))) return json({success:false,error:"ADMIN_ACCESS_REQUIRED"},403);
  const rows=await env.DB.prepare(`SELECT u.id AS user_id,u.name,u.email,l.license_key,l.mt5_account,l.broker,l.status,l.activated_at,l.expires_at,l.created_at FROM user_licenses ul INNER JOIN users u ON u.id=ul.user_id INNER JOIN licenses l ON l.license_key=ul.license_key ORDER BY l.created_at DESC LIMIT 500`).all();
  return json({success:true,queue:rows.results||[]});
}

// =====================================================
// ADMIN AUTH HELPER
// =====================================================

async function requireAdmin(request, env) {
  const session = await getSession(request, env);

  if (!session || session.user.role !== "ADMIN") {
    return null;
  }

  return session;
}


// =====================================================
// MONITOR TOKEN / LICENSE GENERATION
// =====================================================

async function generateLicenseKey(env) {
  for (let i=0;i<5;i++) {
    const raw=crypto.randomUUID().replaceAll("-","").toUpperCase();
    const key=`GVX-${raw.slice(0,6)}-${raw.slice(6,14)}`;
    const exists=await env.DB.prepare(`SELECT id FROM licenses WHERE license_key=? LIMIT 1`).bind(key).first();
    if (!exists) return key;
  }
  throw new Error("LICENSE_KEY_GENERATION_FAILED");
}

async function ensureMonitorAccount(env, license, mt5Account) {
  const existing=await env.DB.prepare(`SELECT monitor_token FROM monitor_accounts WHERE license_key=? LIMIT 1`).bind(license.license_key).first();
  if (existing?.monitor_token) return existing.monitor_token;
  const token="gvxmon_"+crypto.randomUUID().replaceAll("-","");
  await env.DB.prepare(`
    INSERT INTO monitor_accounts (license_key, mt5_account, monitor_token, status, created_at, updated_at)
    VALUES (?, ?, ?, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(license_key) DO UPDATE SET mt5_account=excluded.mt5_account, monitor_token=excluded.monitor_token, status='ACTIVE', updated_at=CURRENT_TIMESTAMP
  `).bind(license.license_key,mt5Account,token).run();
  return token;
}

async function validateMonitorToken(env, licenseKey, mt5Account, token) {
  if (!token) return false;
  const row=await env.DB.prepare(`SELECT monitor_token,status FROM monitor_accounts WHERE license_key=? AND mt5_account=? LIMIT 1`).bind(licenseKey,mt5Account).first();
  return !!row && row.status==='ACTIVE' && row.monitor_token===token;
}

// =====================================================
// LICENSE HELPERS
// =====================================================

async function getLicenseById(env, id) {
  return await env.DB.prepare(`
    SELECT *
    FROM licenses
    WHERE id = ?
    LIMIT 1
  `).bind(id).first();
}


async function expireLicense(env, id) {
  await env.DB.prepare(`
    UPDATE licenses
    SET
      status = 'EXPIRED',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(id).run();
}


function isExpired(license) {
  if (!license?.expires_at) {
    return true;
  }

  const expiry = new Date(license.expires_at);

  if (!Number.isFinite(expiry.getTime())) {
    return true;
  }

  return expiry <= new Date();
}


function publicLicense(license) {
  if (!license) return null;

  return {
    id: license.id,
    license_key: license.license_key,
    mt5_account: license.mt5_account,
    broker: license.broker,
    symbol: license.symbol,
    status: license.status,
    activated_at: license.activated_at,
    expires_at: license.expires_at,
    created_at: license.created_at,
    updated_at: license.updated_at
  };
}


function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status,
    role: user.role,
    created_at: user.created_at,
    updated_at: user.updated_at
  };
}


// =====================================================
// EMAIL NOTIFICATIONS
// =====================================================
//
// No new D1 columns are required.
//
// Activation email is sent immediately after website
// activation.
//
// "Active" email is sent on the first valid monitor
// heartbeat when no monitor row existed yet.
//
// "Expired" email is sent when the Worker detects expiry.
// =====================================================

async function sendActivationEmail({
  env,
  to,
  name,
  licenseKey,
  mt5Account,
  broker,
  activationDate,
  expiryDate,
  monitorToken
}) {
  if (!env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not configured");
    return {
      sent: false,
      error: "RESEND_API_KEY_NOT_CONFIGURED"
    };
  }

  const loginUrl = `${String(env.PUBLIC_APP_URL || "").replace(/\/$/, "")}/customer_login.html`;

  const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>GOLDVORTEX Activation</title>
</head>
<body style="margin:0;background:#0b0f14;color:#e8edf3;font-family:Arial,sans-serif">
  <div style="max-width:680px;margin:40px auto;background:#111821;border:1px solid #273241;padding:32px">
    <h1 style="margin-top:0;letter-spacing:2px">GOLDVORTEX™</h1>

    <p>Hello ${escapeHtml(name)},</p>

    <p>
      Thank you for activating GOLDVORTEX.
      Your activation request has been successfully received.
    </p>

    <div style="background:#0b1118;border:1px solid #2b3948;padding:20px;margin:24px 0">
      <h2 style="margin-top:0">Your License Information</h2>

      <p><strong>License Key</strong><br>
      ${escapeHtml(licenseKey)}</p>

      <p><strong>MT5 Account</strong><br>
      ${escapeHtml(mt5Account)}</p>

      <p><strong>Broker</strong><br>
      ${escapeHtml(broker)}</p>

      <p><strong>Activation Date</strong><br>
      ${escapeHtml(activationDate)}</p>

      <p><strong>Expiry Date</strong><br>
      ${escapeHtml(expiryDate)}</p>

      <p><strong>MT5 Monitor Token</strong><br>
      ${escapeHtml(monitorToken || "Available in your dashboard")}</p>
    </div>

    <div style="border-left:4px solid #d8a83e;padding:12px 16px;background:#17140e">
      <strong>Important</strong><br>
      ${ACTIVATION_GRACE_MESSAGE}
    </div>

    <p>
      You will receive another email notification once your
      GOLDVORTEX system becomes active and starts sending
      MT5 monitoring data.
    </p>

    <p>
      Please keep this email safe. Your GOLDVORTEX license key
      is included above.
    </p>

    <p><a href="${escapeHtml(loginUrl)}" style="display:inline-block;padding:12px 18px;background:#d8a83e;color:#111;text-decoration:none;font-weight:bold;border-radius:6px">OPEN CUSTOMER LOGIN</a></p>

    <p>
      Best regards,<br>
      <strong>GOLDVORTEX™</strong>
    </p>
  </div>
</body>
</html>`;

  return await sendResendEmail(
    env,
    to,
    "Your GOLDVORTEX License",
    html
  );
}


async function maybeSendActiveEmail(env, license) {
  if (!env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not configured");
    return {
      sent: false,
      error: "RESEND_API_KEY_NOT_CONFIGURED"
    };
  }

  const customer = await getCustomerByLicense(env, license.license_key);

  if (!customer) {
    console.warn(
      "ACTIVE EMAIL SKIPPED: no customer linked to license",
      license.license_key
    );
    return {
      sent: false,
      error: "CUSTOMER_NOT_LINKED"
    };
  }

  const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>GOLDVORTEX Active</title>
</head>
<body style="margin:0;background:#0b0f14;color:#e8edf3;font-family:Arial,sans-serif">
  <div style="max-width:680px;margin:40px auto;background:#111821;border:1px solid #273241;padding:32px">
    <h1>GOLDVORTEX™</h1>

    <p>Hello ${escapeHtml(customer.name)},</p>

    <p>
      Your GOLDVORTEX system is now <strong>ACTIVE</strong>.
    </p>

    <div style="background:#0b1118;border:1px solid #2b3948;padding:20px">
      <p><strong>License Key</strong><br>
      ${escapeHtml(license.license_key)}</p>

      <p><strong>MT5 Account</strong><br>
      ${escapeHtml(license.mt5_account)}</p>

      <p><strong>Broker</strong><br>
      ${escapeHtml(license.broker)}</p>

      <p><strong>Expiry Date</strong><br>
      ${escapeHtml(license.expires_at)}</p>
    </div>

    <p>
      Your MT5 Monitor EA has successfully started sending
      monitoring data to GOLDVORTEX.
    </p>

    <p>
      You can now access the GOLDVORTEX Monitor Dashboard
      using your email address and license key.
    </p>

    <p>
      Best regards,<br>
      <strong>GOLDVORTEX™</strong>
    </p>
  </div>
</body>
</html>`;

  return await sendResendEmail(
    env,
    customer.email,
    "GOLDVORTEX Is Now Active",
    html
  );
}


async function maybeSendExpiredEmail(env, license) {
  if (!env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not configured");
    return {
      sent: false,
      error: "RESEND_API_KEY_NOT_CONFIGURED"
    };
  }

  const customer = await getCustomerByLicense(env, license.license_key);

  if (!customer) {
    return {
      sent: false,
      error: "CUSTOMER_NOT_LINKED"
    };
  }

  const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>GOLDVORTEX License Expired</title>
</head>
<body style="margin:0;background:#0b0f14;color:#e8edf3;font-family:Arial,sans-serif">
  <div style="max-width:680px;margin:40px auto;background:#111821;border:1px solid #273241;padding:32px">
    <h1>GOLDVORTEX™</h1>

    <p>Hello ${escapeHtml(customer.name)},</p>

    <p>
      Your GOLDVORTEX license has expired.
    </p>

    <div style="background:#0b1118;border:1px solid #2b3948;padding:20px">
      <p><strong>License Key</strong><br>
      ${escapeHtml(license.license_key)}</p>

      <p><strong>MT5 Account</strong><br>
      ${escapeHtml(license.mt5_account)}</p>

      <p><strong>Expiry Date</strong><br>
      ${escapeHtml(license.expires_at)}</p>

      <p><strong>Status</strong><br>
      EXPIRED</p>
    </div>

    <p>
      Please contact GOLDVORTEX support if you would like
      to renew your license.
    </p>

    <p>
      Best regards,<br>
      <strong>GOLDVORTEX™</strong>
    </p>
  </div>
</body>
</html>`;

  return await sendResendEmail(
    env,
    customer.email,
    "GOLDVORTEX License Expired",
    html
  );
}


async function getCustomerByLicense(env, licenseKey) {
  return await env.DB.prepare(`
    SELECT
      u.id,
      u.name,
      u.email,
      u.status,
      u.role
    FROM user_licenses ul
    INNER JOIN users u
      ON u.id = ul.user_id
    WHERE ul.license_key = ?
    LIMIT 1
  `).bind(licenseKey).first();
}


async function sendResendEmail(env, to, subject, html) {
  try {
    const response = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "GOLDVORTEX <noreply@goldvortex.web.id>",
          to: [to],
          subject,
          html
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "RESEND_EMAIL_ERROR:",
        errorText
      );

      return {
        sent: false,
        error: "RESEND_EMAIL_FAILED"
      };
    }

    const result = await response.json();

    console.log(
      "GOLDVORTEX EMAIL SENT:",
      result
    );

    return {
      sent: true,
      id: result.id || null
    };

  } catch (error) {
    console.error(
      "RESEND_EMAIL_REQUEST_FAILED:",
      error
    );

    return {
      sent: false,
      error: "RESEND_REQUEST_FAILED"
    };
  }
}


// =====================================================
// MONITOR STATE HELPERS
// =====================================================

function isMonitorOnline(eaStatus, licenseStatus) {
  const ea = String(eaStatus || "").toUpperCase();
  const license = String(licenseStatus || "").toUpperCase();

  return (
    (ea === "MONITOR_ONLINE" ||
     ea === "ONLINE" ||
     ea === "ACTIVE") &&
    (license === "VALID" ||
     license === "ACTIVE" ||
     license === "")
  );
}


// =====================================================
// PASSWORD HASH
// =====================================================

async function hashPassword(password) {
  const data = new TextEncoder().encode(password);

  const hash = await crypto.subtle.digest(
    "SHA-256",
    data
  );

  const bytes = new Uint8Array(hash);

  return Array.from(bytes)
    .map(
      byte =>
        byte.toString(16).padStart(2, "0")
    )
    .join("");
}


// =====================================================
// INPUT HELPERS
// =====================================================

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}


function clean(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}


function number(value) {
  if (value === undefined ||
      value === null ||
      value === "") {
    return 0;
  }

  const result = Number(value);

  return Number.isFinite(result)
    ? result
    : 0;
}


function integer(value) {
  if (value === undefined ||
      value === null ||
      value === "") {
    return 0;
  }

  const result = parseInt(value, 10);

  return Number.isFinite(result)
    ? result
    : 0;
}


function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// =====================================================
// BEARER TOKEN
// =====================================================

function getBearerToken(request) {
  const authorization =
    request.headers.get("Authorization");

  if (!authorization) {
    return "";
  }

  const parts =
    authorization.trim().split(/\s+/);

  if (parts.length !== 2) {
    return "";
  }

  if (parts[0].toLowerCase() !== "bearer") {
    return "";
  }

  return clean(parts[1]);
}


// =====================================================
// CORS
// =====================================================

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400"
  };
}


// =====================================================
// JSON RESPONSE
// =====================================================

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        ...corsHeaders()
      }
    }
  );
}
