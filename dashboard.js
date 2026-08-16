// =========================================================
// GOLDVORTEX DASHBOARD
// STEP 10.2 - REAL API CONNECTION
// =========================================================

const CONFIG = {

  // =========================================
  // DEMO MODE
  // =========================================
  // false = menggunakan data MT5 REAL
  // =========================================

  DEMO_MODE: false,


  // =========================================
  // GOLDVORTEX API
  // =========================================

  API_URL:
    "https://goldvortex-api.irhamwrapublic.workers.dev/api/dashboard",


  // =========================================
  // LICENSE KEY
  // =========================================
  // Untuk sementara kita gunakan license
  // akun testing Anda.
  //
  // Nanti pada tahap LOGIN kita akan membuat
  // license key ini otomatis mengikuti user.
  // =========================================

  LICENSE_KEY:
    "GVX-MT5-193891875",


  // =========================================
  // REFRESH
  // =========================================

  REFRESH_MS:
    5000

};



// =========================================================
// DEMO DATA
// =========================================================
// Hanya digunakan jika DEMO_MODE = true
// =========================================================

const demo = {

  user: {

    name:
      "GOLDVORTEX User"

  },

  account: {

    login:
      "193891875",

    server:
      "DEMO-SERVER",

    status:
      "ONLINE",

    last_update:
      new Date().toISOString(),

    balance:
      10000,

    equity:
      10250,

    profit:
      250,

    swap:
      3.2,

    margin:
      500,

    free_margin:
      9750,

    margin_level:
      2050,

    license_key:
      "GVX-MT5-193891875",

    license_status:
      "VALID",

    expires_at:
      "2026-09-15T00:00:00Z"

  },

  positions: []

};



// =========================================================
// DOM HELPER
// =========================================================

const $ = id =>
  document.getElementById(id);



// =========================================================
// NUMBER FORMAT
// =========================================================

function num(value) {

  return Number(
    value || 0
  ).toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  );

}



// =========================================================
// MONEY FORMAT
// =========================================================

function money(
  value,
  currency = "IDR"
) {

  const amount =
    Number(value || 0);


  try {

    return new Intl.NumberFormat(
      "id-ID",
      {
        style:
          "currency",

        currency:
          currency,

        minimumFractionDigits:
          2,

        maximumFractionDigits:
          2
      }
    ).format(amount);

  } catch {

    return amount.toLocaleString(
      "id-ID",
      {
        minimumFractionDigits:
          2,

        maximumFractionDigits:
          2
      }
    );

  }

}



// =========================================================
// REMAINING LICENSE
// =========================================================

function remain(
  expiresAt
) {

  if (!expiresAt) {

    return "—";

  }


  const expiry =
    new Date(
      expiresAt
    );

  const diff =
    expiry.getTime() -
    Date.now();


  if (
    Number.isNaN(
      expiry.getTime()
    )
  ) {

    return "—";

  }


  if (
    diff <= 0
  ) {

    return "EXPIRED";

  }


  const days =
    Math.ceil(
      diff /
      86400000
    );


  if (
    days === 1
  ) {

    return "1 DAY";

  }


  return days + " DAYS";

}



// =========================================================
// DATE FORMAT
// =========================================================

function dateTime(
  value
) {

  if (!value) {

    return "—";

  }


  const date =
    new Date(
      value
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return value;

  }


  return date.toLocaleString(
    "id-ID"
  );

}



// =========================================================
// RENDER DASHBOARD
// =========================================================

function render(
  data
) {

  // =========================================
  // API DATA
  // =========================================

  const license =
    data.license || {};

  const monitor =
    data.monitor || {};


  // =========================================
  // USER
  // =========================================

  if ($("userName")) {

    $("userName").textContent =
      data.user?.name ||
      "GOLDVORTEX User";

  }


  // =========================================
  // ACCOUNT
  // =========================================

  if ($("accountLogin")) {

    $("accountLogin").textContent =
      monitor.mt5_account ||
      license.mt5_account ||
      "Waiting for MT5 data...";

  }


  if ($("server")) {

    $("server").textContent =
      monitor.server ||
      "—";

  }


  if ($("accountId")) {

    $("accountId").textContent =
      monitor.mt5_account ||
      license.mt5_account ||
      "—";

  }


  // =========================================
  // MONITOR STATUS
  // =========================================

  const monitorOnline =
    String(
      monitor.ea_status || ""
    ).toUpperCase() ===
    "MONITOR_ONLINE";


  if ($("monitorStatus")) {

    $("monitorStatus").textContent =
      monitorOnline
        ? "ONLINE"
        : "OFFLINE";

  }


  // =========================================
  // LAST UPDATE
  // =========================================

  if ($("lastUpdate")) {

    $("lastUpdate").textContent =
      dateTime(
        monitor.last_update
      );

  }


  // =========================================
  // CURRENCY
  // =========================================

  const currency =
    monitor.currency ||
    "IDR";


  // =========================================
  // BALANCE
  // =========================================

  if ($("balance")) {

    $("balance").textContent =
      money(
        monitor.balance,
        currency
      );

  }


  // =========================================
  // EQUITY
  // =========================================

  if ($("equity")) {

    $("equity").textContent =
      money(
        monitor.equity,
        currency
      );

  }


  // =========================================
  // FLOATING PROFIT
  // =========================================

  if ($("profit")) {

    $("profit").textContent =
      money(
        monitor.floating_profit,
        currency
      );

  }


  // =========================================
  // SWAP
  // =========================================
  // Monitor API saat ini belum mengirim
  // swap secara terpisah.
  //
  // Untuk sementara tampilkan 0.
  // Nanti bisa ditambahkan ke Monitor EA/API.
  // =========================================

  if ($("swap")) {

    $("swap").textContent =
      money(
        0,
        currency
      );

  }


  // =========================================
  // MARGIN
  // =========================================

  if ($("margin")) {

    $("margin").textContent =
      money(
        monitor.margin,
        currency
      );

  }


  // =========================================
  // FREE MARGIN
  // =========================================

  if ($("freeMargin")) {

    $("freeMargin").textContent =
      money(
        monitor.free_margin,
        currency
      );

  }


  // =========================================
  // MARGIN LEVEL
  // =========================================

  if ($("marginLevel")) {

    $("marginLevel").textContent =
      num(
        monitor.margin_level
      ) + "%";

  }


  // =========================================
  // LICENSE STATUS
  // =========================================

  const licenseStatus =
    String(
      license.status ||
      monitor.license_status ||
      "UNKNOWN"
    ).toUpperCase();


  const licenseValid =
    licenseStatus ===
    "ACTIVE";


  if ($("licenseStatus")) {

    $("licenseStatus").textContent =
      licenseStatus;

  }


  if ($("licenseBadge")) {

    $("licenseBadge").textContent =
      licenseValid
        ? "ACTIVE"
        : "LOCKED";

  }


  // =========================================
  // LICENSE KEY
  // =========================================

  if ($("licenseKey")) {

    $("licenseKey").textContent =
      license.license_key ||
      monitor.license_key ||
      "—";

  }


  // =========================================
  // EXPIRY
  // =========================================

  if ($("expiresAt")) {

    $("expiresAt").textContent =
      dateTime(
        license.expires_at
      );

  }


  // =========================================
  // REMAINING
  // =========================================

  if ($("remaining")) {

    $("remaining").textContent =
      remain(
        license.expires_at
      );

  }


  // =========================================
  // POSITIONS
  // =========================================

  const positionCount =
    Number(
      monitor.positions || 0
    );


  if ($("positionCount")) {

    $("positionCount").textContent =
      positionCount +
      " POSITION" +
      (
        positionCount === 1
          ? ""
          : "S"
      );

  }


  // =========================================
  // CURRENT API ONLY PROVIDES
  // POSITION COUNT
  // =========================================
  //
  // Detail position belum dikirim oleh
  // Monitor EA/API.
  //
  // Karena itu jangan membuat data posisi
  // palsu.
  // =========================================

  if ($("positionsBody")) {

    if (
      positionCount <= 0
    ) {

      $("positionsBody").innerHTML = `
        <tr>
          <td colspan="8">
            No open positions.
          </td>
        </tr>
      `;

    } else {

      $("positionsBody").innerHTML = `
        <tr>
          <td colspan="8">
            ${positionCount}
            open position(s) detected.
            Position details will be available
            in the next monitoring update.
          </td>
        </tr>
      `;

    }

  }


  // =========================================
  // SYSTEM MESSAGE
  // =========================================

  if ($("systemMessage")) {

    if (
      monitorOnline &&
      licenseValid
    ) {

      $("systemMessage").textContent =
        "Monitor EA connected. Dashboard is receiving the latest MT5 monitoring state.";

    }

    else if (
      licenseStatus ===
      "EXPIRED"
    ) {

      $("systemMessage").textContent =
        "LICENSE EXPIRED. GOLDVORTEX protection state is active.";

    }

    else if (
      !monitorOnline
    ) {

      $("systemMessage").textContent =
        "Monitor EA is offline or has not sent a recent monitoring update.";

    }

    else {

      $("systemMessage").textContent =
        "License is not valid. Dashboard is displaying the current protection state.";

    }

  }

}



// =========================================================
// LOAD DASHBOARD
// =========================================================

async function load() {

  // =========================================
  // DEMO MODE
  // =========================================

  if (
    CONFIG.DEMO_MODE
  ) {

    demo.account.last_update =
      new Date().toISOString();

    render(
      demo
    );

    return;

  }


  // =========================================
  // REAL API
  // =========================================

  try {

    const endpoint =
      CONFIG.API_URL +
      "?license_key=" +
      encodeURIComponent(
        CONFIG.LICENSE_KEY
      );


    const response =
      await fetch(
        endpoint,
        {
          method:
            "GET",

          headers: {

            Accept:
              "application/json"

          },

          cache:
            "no-store"

        }
      );


    if (
      !response.ok
    ) {

      throw new Error(
        "HTTP " +
        response.status
      );

    }


    const data =
      await response.json();


    // =========================================
    // API ERROR
    // =========================================

    if (
      !data.success
    ) {

      throw new Error(
        data.error ||
        "API_ERROR"
      );

    }


    // =========================================
    // RENDER
    // =========================================

    render(
      data
    );


  } catch (
    error
  ) {

    console.error(
      "GOLDVORTEX Dashboard API Error:",
      error
    );


    if (
      $("monitorStatus")
    ) {

      $("monitorStatus")
        .textContent =
        "OFFLINE";

    }


    if (
      $("systemMessage")
    ) {

      $("systemMessage")
        .textContent =
        "Dashboard API unavailable: " +
        error.message;

    }

  }

}



// =========================================================
// INITIAL LOAD
// =========================================================

load();



// =========================================================
// AUTO REFRESH
// =========================================================

setInterval(
  load,
  CONFIG.REFRESH_MS
);