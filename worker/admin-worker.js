import apiWorker from "./worker.js";

const CREDENTIAL_KEY_SECRET = "MT5_CREDENTIALS_ENCRYPTION_KEY";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Secure admin credential detail endpoint.
    if (url.pathname === "/api/admin/credentials" && request.method === "GET") {
      return await adminCredentials(request, env);
    }

    if (url.pathname === "/api/admin/mt5-credential" && request.method === "GET") {
      return await adminCredentials(request, env);
    }

    // Admin-only Resend diagnostic. Never exposes the API key.
    if (url.pathname === "/api/admin/test-email" && request.method === "POST") {
      return await adminTestEmail(request, env);
    }

    // Keep the existing activation endpoint and EA-compatible Worker intact.
    // After successful website activation, securely save the submitted MT5
    // password in the existing mt5_credentials.mt5_password_enc column.
    if (url.pathname === "/api/activate-account" && request.method === "POST") {
      const raw = await request.clone().text();
      let body = {};
      try { body = raw ? JSON.parse(raw) : {}; } catch (_) {}

      const response = await apiWorker.fetch(request, env, ctx);
      const responseText = await response.clone().text();
      let data = null;
      try { data = responseText ? JSON.parse(responseText) : null; } catch (_) {}

      if (response.ok && data?.success && body.mt5_account && body.mt5_password) {
        try {
          await upsertCredential(env, {
            mt5Account: String(body.mt5_account).trim(),
            broker: String(body.broker || "").trim(),
            password: String(body.mt5_password)
          });
        } catch (error) {
          console.error("MT5 CREDENTIAL STORE FAILED:", error);
        }
      }

      return response;
    }

    return await apiWorker.fetch(request, env, ctx);
  }
};

async function requireAdmin(request, env) {
  const checkUrl = new URL("/api/me", request.url);
  const checkRequest = new Request(checkUrl.toString(), {
    method: "GET",
    headers: request.headers
  });

  const response = await apiWorker.fetch(checkRequest, env);
  if (!response.ok) return null;

  const data = await response.json().catch(() => null);
  if (!data?.success || data?.user?.role !== "ADMIN") return null;
  return data.user;
}

async function adminCredentials(request, env) {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ success:false, error:"ADMIN_ACCESS_REQUIRED" }, 403);

  const url = new URL(request.url);
  const licenseKey = clean(url.searchParams.get("license_key"));
  const mt5AccountParam = clean(url.searchParams.get("mt5_account"));

  if (!licenseKey && !mt5AccountParam) {
    return json({ success:false, error:"LICENSE_KEY_OR_MT5_ACCOUNT_REQUIRED" }, 400);
  }

  let license;
  if (licenseKey) {
    license = await env.DB.prepare(`
      SELECT l.*, u.name AS customer_name, u.email AS customer_email
      FROM licenses l
      LEFT JOIN user_licenses ul ON ul.license_key=l.license_key
      LEFT JOIN users u ON u.id=ul.user_id
      WHERE l.license_key=? LIMIT 1
    `).bind(licenseKey).first();
  } else {
    license = await env.DB.prepare(`
      SELECT l.*, u.name AS customer_name, u.email AS customer_email
      FROM licenses l
      LEFT JOIN user_licenses ul ON ul.license_key=l.license_key
      LEFT JOIN users u ON u.id=ul.user_id
      WHERE l.mt5_account=? LIMIT 1
    `).bind(mt5AccountParam).first();
  }

  if (!license) return json({ success:false, error:"LICENSE_NOT_FOUND" }, 404);

  const credential = await env.DB.prepare(`
    SELECT mt5_account, broker, mt5_password_enc, updated_at
    FROM mt5_credentials
    WHERE mt5_account=? LIMIT 1
  `).bind(license.mt5_account).first();

  if (!credential) {
    return json({
      success:true,
      activation: publicActivation(license),
      credentials:null,
      credential_available:false,
      message:"MT5_CREDENTIAL_NOT_FOUND"
    });
  }

  let password = "";
  try {
    password = await decryptPassword(env, credential.mt5_password_enc);
  } catch (error) {
    console.error("MT5 CREDENTIAL DECRYPT FAILED:", error);
    return json({
      success:true,
      activation: publicActivation(license),
      credentials:null,
      credential_available:false,
      error:"MT5_CREDENTIAL_DECRYPT_FAILED"
    });
  }

  return json({
    success:true,
    activation: publicActivation(license),
    credentials:{
      mt5_account:credential.mt5_account,
      broker:credential.broker,
      mt5_password:password,
      created_at:null,
      updated_at:credential.updated_at
    },
    credential_available:true
  });
}

async function adminTestEmail(request, env) {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({success:false,error:"ADMIN_ACCESS_REQUIRED"},403);
  if (!env.RESEND_API_KEY) return json({success:false,error:"RESEND_API_KEY_NOT_CONFIGURED"},500);

  const body = await request.json().catch(() => ({}));
  const to = clean(body.to).toLowerCase();
  if (!to || !/^\S+@\S+\.\S+$/.test(to)) return json({success:false,error:"VALID_EMAIL_REQUIRED"},400);

  const response = await fetch("https://api.resend.com/emails", {
    method:"POST",
    headers:{"Authorization":`Bearer ${env.RESEND_API_KEY}`,"Content-Type":"application/json"},
    body:JSON.stringify({
      from:"GOLDVORTEX <noreply@goldvortex.web.id>",
      to:[to],
      subject:"GOLDVORTEX Email Test",
      html:`<div style="font-family:Arial,sans-serif"><h2>GOLDVORTEX™</h2><p>This is a Resend delivery test from the GOLDVORTEX Admin Panel.</p><p>If you received this email, Resend is configured correctly.</p></div>`
    })
  });

  const text = await response.text();
  let result = null;
  try { result = text ? JSON.parse(text) : null; } catch (_) {}

  if (!response.ok) {
    console.error("RESEND TEST FAILED:", text);
    return json({success:false,error:"RESEND_EMAIL_FAILED",resend_status:response.status,resend_message:result?.message||text||"Unknown Resend error"},502);
  }

  return json({success:true,email_sent:true,id:result?.id||null});
}

async function upsertCredential(env, {mt5Account, broker, password}) {
  const encrypted = await encryptPassword(env, password);
  await env.DB.prepare(`
    INSERT INTO mt5_credentials (mt5_account, broker, mt5_password_enc, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(mt5_account)
    DO UPDATE SET broker=excluded.broker, mt5_password_enc=excluded.mt5_password_enc, updated_at=CURRENT_TIMESTAMP
  `).bind(mt5Account, broker, encrypted).run();
}

async function getEncryptionKey(env) {
  const secret = env[CREDENTIAL_KEY_SECRET] || env.ADMIN_BOOTSTRAP_SECRET;
  if (!secret) throw new Error("MT5_CREDENTIALS_ENCRYPTION_KEY_NOT_CONFIGURED");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(secret)));
  return crypto.subtle.importKey("raw", digest, {name:"AES-GCM"}, false, ["encrypt","decrypt"]);
}

async function encryptPassword(env, password) {
  const key = await getEncryptionKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({name:"AES-GCM",iv}, key, new TextEncoder().encode(password));
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv,0);
  combined.set(new Uint8Array(encrypted),iv.length);
  return toBase64(combined);
}

async function decryptPassword(env, value) {
  if (!value) throw new Error("EMPTY_ENCRYPTED_PASSWORD");
  const combined = fromBase64(value);
  if (combined.length <= 12) throw new Error("INVALID_ENCRYPTED_PASSWORD");
  const iv = combined.slice(0,12);
  const ciphertext = combined.slice(12);
  const key = await getEncryptionKey(env);
  const plaintext = await crypto.subtle.decrypt({name:"AES-GCM",iv}, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}

function publicActivation(row) {
  return {
    license_key:row.license_key,
    mt5_account:row.mt5_account,
    server:row.server || row.broker || "",
    broker:row.broker,
    symbol:row.symbol,
    status:row.status,
    activated_at:row.activated_at,
    expires_at:row.expires_at,
    created_at:row.created_at,
    updated_at:row.updated_at,
    customer_name:row.customer_name || null,
    customer_email:row.customer_email || null
  };
}

function clean(value) { return value === undefined || value === null ? "" : String(value).trim(); }

function toBase64(bytes) {
  let binary="";
  const chunk=0x8000;
  for(let i=0;i<bytes.length;i+=chunk) binary+=String.fromCharCode(...bytes.subarray(i,i+chunk));
  return btoa(binary);
}

function fromBase64(value) {
  const binary=atob(value);
  const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
  return bytes;
}

function json(data,status=200){
  return new Response(JSON.stringify(data,null,2),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET, POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type, Authorization"}});
}
