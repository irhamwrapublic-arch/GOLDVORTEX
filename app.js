const API_BASE = "https://goldvortex-api.irhamwrapublic.workers.dev";
const SESSION_KEY = "gvx_admin_session_v102";

let session = localStorage.getItem(SESSION_KEY) || "";
let currentUsers = [];

const $ = id => document.getElementById(id);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function headers() {
  const h = {"Content-Type":"application/json"};
  if (session) h.Authorization = `Bearer ${session}`;
  return h;
}

async function api(path, options={}) {
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {...headers(), ...(options.headers || {})}
  });
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok || data.success === false) {
    throw new Error(data.error || `HTTP_${res.status}`);
  }
  return data;
}

function showLogin() {
  $("loginView").classList.remove("hidden");
  $("dashboardView").classList.add("hidden");
}
function showDashboard() {
  $("loginView").classList.add("hidden");
  $("dashboardView").classList.remove("hidden");
}

function get(obj, keys, fallback="—") {
  for (const k of keys) if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  return fallback;
}

function statusClass(status) {
  const s = String(status || "").toUpperCase();
  if (s.includes("EXPIRE")) return "expired";
  if (s.includes("PENDING")) return "pending";
  if (s.includes("ACTIVE")) return "active";
  return "";
}

function statusHtml(status) {
  const s = status || "UNKNOWN";
  return `<span class="status ${statusClass(s)}"><span class="dot"></span>${esc(s)}</span>`;
}

function normalizeUser(u) {
  const license = u.license || u.licenses?.[0] || {};
  const credential = u.mt5_credentials || u.credentials || {};
  return {
    raw:u,
    id:get(u,["id"]),
    name:get(u,["name","full_name","customer_name"]),
    email:get(u,["email"]),
    account:get(u,["mt5_account","mt5_account_id","account"], get(license,["mt5_account"])),
    broker:get(u,["broker","server"], get(license,["broker"])),
    server:get(u,["server"], get(license,["broker"])),
    password:get(u,["mt5_password"], get(credential,["mt5_password","password"], "")),
    tradingDays:get(u,["trading_days","maximum_trading_days","max_trading_days"], "—"),
    activationDate:get(u,["activated_at","activation_date","created_at"], get(license,["activated_at","created_at"])),
    expiryDate:get(u,["expires_at","expiry_date"], get(license,["expires_at"])),
    licenseKey:get(u,["license_key","licenseKey"], get(license,["license_key","licenseKey"])),
    licenseStatus:get(u,["license_status","status"], get(license,["status"])),
    createdAt:get(u,["created_at"]),
    updatedAt:get(u,["updated_at"])
  };
}

function formatDate(v) {
  if (!v || v === "—") return "—";
  const raw = String(v);
  // Existing API values without timezone are treated as UTC.
  const iso = raw.includes("T") ? raw : raw.replace(" ","T") + "Z";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return raw;
  return new Intl.DateTimeFormat("id-ID", {
    timeZone:"Asia/Jakarta", dateStyle:"medium", timeStyle:"medium"
  }).format(d);
}

function renderStats(items) {
  const active = items.filter(x => String(x.licenseStatus).toUpperCase().includes("ACTIVE")).length;
  const expired = items.filter(x => String(x.licenseStatus).toUpperCase().includes("EXPIRE")).length;
  const withLicense = items.filter(x => x.licenseKey !== "—").length;
  $("stats").innerHTML = `
    <div class="stat"><div class="label">TOTAL RECORDS</div><div class="value">${items.length}</div></div>
    <div class="stat"><div class="label">ACTIVE</div><div class="value">${active}</div></div>
    <div class="stat"><div class="label">EXPIRED</div><div class="value">${expired}</div></div>
    <div class="stat"><div class="label">WITH LICENSE</div><div class="value">${withLicense}</div></div>`;
}

function renderTable(items) {
  if (!items.length) {
    $("tableWrap").innerHTML = `<div class="empty">No activation records found.</div>`;
    return;
  }
  $("tableWrap").innerHTML = `
    <table class="table">
      <thead><tr>
        <th>CUSTOMER</th><th>MT5 ACCOUNT</th><th>SERVER</th><th>LICENSE</th><th>ACTIVATED</th><th>EXPIRES</th><th>STATUS</th><th></th>
      </tr></thead>
      <tbody>
        ${items.map((x,i)=>`<tr>
          <td><strong>${esc(x.name)}</strong><br><span class="muted small">${esc(x.email)}</span></td>
          <td>${esc(x.account)}</td>
          <td>${esc(x.server)}</td>
          <td>${esc(x.licenseKey)}</td>
          <td>${esc(formatDate(x.activationDate))}</td>
          <td>${esc(formatDate(x.expiryDate))}</td>
          <td>${statusHtml(x.licenseStatus)}</td>
          <td><button class="viewbtn" data-index="${i}">VIEW</button></td>
        </tr>`).join("")}
      </tbody>
    </table>`;
  $("tableWrap").querySelectorAll(".viewbtn").forEach(b => {
    b.addEventListener("click", () => openDetail(items[Number(b.dataset.index)]));
  });
}

function openDetail(x) {
  $("detailCard").classList.remove("hidden");
  $("detailTitle").textContent = x.name;
  const fields = [
    ["Full Name",x.name],["Email",x.email],["MT5 Account ID",x.account],["Server",x.server],
    ["Broker",x.broker],["Maximum Trading Days",x.tradingDays],["Activation Date (WIB)",formatDate(x.activationDate)],
    ["Expiry Date (WIB)",formatDate(x.expiryDate)],["License Key",x.licenseKey],["License Status",x.licenseStatus],
    ["Created At (WIB)",formatDate(x.createdAt)],["Updated At (WIB)",formatDate(x.updatedAt)]
  ];
  $("detailGrid").innerHTML = fields.map(([k,v])=>`<div class="detail-item"><div class="k">${esc(k)}</div><div class="v">${k==="License Status"?statusHtml(v):esc(v)}</div></div>`).join("");
  $("credentialNote").classList.remove("hidden");
  if (x.password) {
    $("credentialNote").innerHTML = `<strong>MT5 PASSWORD:</strong> <span id="pwMask">••••••••</span>
      <button id="revealPw" class="viewbtn">REVEAL</button>
      <button id="copyPw" class="viewbtn">COPY</button>
      <div class="small muted" style="margin-top:8px">Password is shown only if the existing Admin API explicitly returns it. v1.0.2 does not create or expose a new credential endpoint.</div>`;
    let revealed=false;
    $("revealPw").onclick=()=>{revealed=!revealed;$("pwMask").textContent=revealed?x.password:"••••••••";$("revealPw").textContent=revealed?"HIDE":"REVEAL";};
    $("copyPw").onclick=async()=>{try{await navigator.clipboard.writeText(x.password);$("copyPw").textContent="COPIED";setTimeout(()=>$("copyPw").textContent="COPY",1200)}catch{}};
  } else {
    $("credentialNote").innerHTML = `<strong>MT5 PASSWORD:</strong> not returned by the current API.
      <div class="small" style="margin-top:8px">This is intentional. Do not put a plaintext MT5 password into frontend code. Credential encryption/reveal will be added only after the secure Worker credential endpoint is deployed.</div>`;
  }
  $("detailCard").scrollIntoView({behavior:"smooth",block:"start"});
}

async function loadUsers() {
  $("tableWrap").innerHTML = `<div class="loading">Loading activation records...</div>`;
  try {
    const data = await api("/api/admin/users");
    const rows = data.users || data.customers || data.data || [];
    currentUsers = rows.map(normalizeUser);
    renderStats(currentUsers);
    renderTable(currentUsers);
  } catch (e) {
    $("tableWrap").innerHTML = `<div class="empty error">Unable to load activation records: ${esc(e.message)}</div>`;
  }
}


function monitorState(m) {
  const explicit = String(get(m,["ea_status","monitor_status","status"],"")).toUpperCase();
  const last = get(m,["last_update","updated_at"],"");
  let age = Infinity;
  if (last && last !== "—") {
    const iso = String(last).includes("T") ? String(last) : String(last).replace(" ","T") + "Z";
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) age = (Date.now() - d.getTime()) / 60000;
  }
  if (explicit.includes("OFFLINE")) return ["OFFLINE","monitor-offline"];
  if (explicit.includes("ONLINE") && age <= 3) return ["ONLINE","monitor-online"];
  if (age <= 3) return ["ONLINE","monitor-online"];
  if (age <= 10) return ["WARNING","monitor-warning"];
  return ["OFFLINE","monitor-offline"];
}

function renderMonitor(data, requestedLicense) {
  const m = data.monitor || data.data?.monitor || data;
  const positions = data.positions || data.data?.positions || [];
  const lic = data.license || data.data?.license || {};
  const [state, cls] = monitorState(m);
  const licenseKey = get(lic,["license_key"],requestedLicense);
  $("monitorCard").classList.remove("hidden");
  $("monitorTitle").textContent = licenseKey;
  $("monitorSubtitle").innerHTML = `<span class="monitor-status ${cls}">● ${state}</span> &nbsp; ${esc(get(m,["broker"],"—"))} · ${esc(get(m,["server"],"—"))}`;
  const fields = [
    ["MT5 Account",get(m,["mt5_account","account"],get(lic,["mt5_account"]))],
    ["Broker",get(m,["broker"])],
    ["Server",get(m,["server"])],
    ["Symbol",get(m,["symbol"])],
    ["Balance",`${Number(get(m,["balance"],0)).toLocaleString("id-ID")} ${esc(get(m,["currency"],""))}`],
    ["Equity",`${Number(get(m,["equity"],0)).toLocaleString("id-ID")} ${esc(get(m,["currency"],""))}`],
    ["Floating P/L",`${Number(get(m,["floating_profit","floating_pnl"],0)).toLocaleString("id-ID")} ${esc(get(m,["currency"],""))}`],
    ["Positions",get(m,["positions"],positions.length)],
    ["Buy Positions",get(m,["buy_positions"],"—")],
    ["Sell Positions",get(m,["sell_positions"],"—")],
    ["Total Lots",get(m,["total_lots"],"—")],
    ["Last Update (WIB)",formatDate(get(m,["last_update","updated_at"]))]
  ];
  $("monitorGrid").innerHTML = fields.map(([k,v])=>`<div class="detail-item"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`).join("");
  if (!positions.length) {
    $("monitorPositions").innerHTML = `<div class="pos-empty">No open positions.</div>`;
  } else {
    $("monitorPositions").innerHTML = `<table class="mini-table"><thead><tr>
      <th>TICKET</th><th>SYMBOL</th><th>TYPE</th><th>LOT</th><th>OPEN</th><th>CURRENT</th><th>P/L</th>
    </tr></thead><tbody>${positions.map(p=>`<tr>
      <td>${esc(get(p,["ticket","position_id"]))}</td>
      <td>${esc(get(p,["symbol"]))}</td>
      <td>${esc(get(p,["type","side"]))}</td>
      <td>${esc(get(p,["volume","lot","lots"]))}</td>
      <td>${esc(get(p,["open_price","price_open"]))}</td>
      <td>${esc(get(p,["current_price","price_current"]))}</td>
      <td>${esc(get(p,["profit","pnl"]))}</td>
    </tr>`).join("")}</tbody></table>`;
  }
  $("monitorCard").scrollIntoView({behavior:"smooth",block:"start"});
}

async function loadMonitor(licenseKey) {
  const key = String(licenseKey || "").trim();
  if (!key) return alert("Masukkan License Key terlebih dahulu.");
  $("monitorCard").classList.remove("hidden");
  $("monitorTitle").textContent = key;
  $("monitorSubtitle").textContent = "Loading monitor...";
  $("monitorGrid").innerHTML = `<div class="loading">Loading MT5 monitor...</div>`;
  $("monitorPositions").innerHTML = "";
  try {
    const data = await api(`/api/dashboard?license_key=${encodeURIComponent(key)}`);
    if (data.success === false) throw new Error(data.error || "MONITOR_LOAD_FAILED");
    renderMonitor(data,key);
  } catch(e) {
    $("monitorSubtitle").innerHTML = `<span class="error">${esc(e.message)}</span>`;
    $("monitorGrid").innerHTML = `<div class="empty error">Monitor tidak ditemukan / tidak dapat diakses untuk license ini.</div>`;
    $("monitorPositions").innerHTML = "";
  }
}

$("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  $("loginMsg").textContent = "Signing in...";
  try {
    const data = await api("/api/login", {
      method:"POST",
      body:JSON.stringify({email:$("loginEmail").value.trim(),password:$("loginPassword").value})
    });
    session = data.session_token || data.token || data.session || "";
    if (!session) throw new Error("SESSION_TOKEN_MISSING");
    localStorage.setItem(SESSION_KEY, session);
    $("adminName").textContent = data.user?.name || data.name || "Administrator";
    showDashboard();
    await loadUsers();
    $("loginMsg").textContent = "";
  } catch(e) {
    $("loginMsg").textContent = e.message;
  }
});

$("refreshBtn").onclick = loadUsers;
$("loadMonitorBtn").onclick = () => loadMonitor($("monitorLicense").value);
$("monitorLicense").addEventListener("keydown", e => { if (e.key === "Enter") loadMonitor($("monitorLicense").value); });
$("closeMonitor").onclick = () => $("monitorCard").classList.add("hidden");
$("closeDetail").onclick = () => $("detailCard").classList.add("hidden");
$("logoutBtn").onclick = () => {localStorage.removeItem(SESSION_KEY);session="";showLogin();};

$("searchBox").addEventListener("input", e => {
  const q = e.target.value.toLowerCase().trim();
  const filtered = !q ? currentUsers : currentUsers.filter(x => {
    const haystack = [x.name,x.email,x.account,x.server,x.broker,x.licenseKey,x.licenseStatus]
      .map(v=>String(v ?? "").toLowerCase());
    return haystack.some(v=>v.includes(q));
  });
  renderTable(filtered);
});

(async function init(){
  if (!session) {showLogin(); return;}
  try {
    const me = await api("/api/me");
    $("adminName").textContent = me.user?.name || me.name || "Administrator";
    showDashboard();
    await loadUsers();
  } catch {
    localStorage.removeItem(SESSION_KEY); session=""; showLogin();
  }
})();
