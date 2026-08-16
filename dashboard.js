// ============================================================
// GOLDVORTEX™ DASHBOARD.JS
// FINAL VERSION
// READ-ONLY MT5 MONITOR
// ============================================================

"use strict";

// ============================================================
// CONFIGURATION
// ============================================================

const API_BASE =
    "https://goldvortex-api.irhamwrapublic.workers.dev";

const REFRESH_INTERVAL =
    5000;


// ============================================================
// GET LICENSE KEY
// ============================================================
// Bisa diambil dari:
// 1. URL ?license_key=...
// 2. localStorage
// 3. fallback demo account
// ============================================================

function getLicenseKey() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const urlLicense =
        params.get("license_key");

    if (urlLicense) {

        localStorage.setItem(
            "goldvortex_license_key",
            urlLicense
        );

        return urlLicense;
    }


    const savedLicense =
        localStorage.getItem(
            "goldvortex_license_key"
        );

    if (savedLicense) {

        return savedLicense;
    }


    // ========================================================
    // DEMO / TEST ACCOUNT
    // ========================================================

    return "GVX-MT5-193891875";
}


// ============================================================
// GLOBAL DATA
// ============================================================

let dashboardDataCache =
    null;


// ============================================================
// DOM READY
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadDashboard();

        setInterval(
            loadDashboard,
            REFRESH_INTERVAL
        );

    }
);


// ============================================================
// LOAD DASHBOARD
// ============================================================

async function loadDashboard() {

    const licenseKey =
        getLicenseKey();


    if (!licenseKey) {

        showSystemMessage(
            "License key belum ditemukan."
        );

        return;
    }


    try {

        const response =
            await fetch(
                API_BASE +
                "/api/dashboard?license_key=" +
                encodeURIComponent(
                    licenseKey
                ),
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "HTTP " +
                response.status
            );

        }


        const data =
            await response.json();


        if (!data.success) {

            throw new Error(
                data.error ||
                "Dashboard API Error"
            );

        }


        dashboardDataCache =
            data;


        renderDashboard(
            data
        );


    } catch (error) {

        console.error(
            "GOLDVORTEX Dashboard Error:",
            error
        );


        setOfflineState();


        showSystemMessage(
            "Tidak dapat mengambil data dari Monitor EA."
        );

    }

}


// ============================================================
// RENDER DASHBOARD
// ============================================================

function renderDashboard(
    data
) {

    const license =
        data.license || {};

    const monitor =
        data.monitor || {};

    const positions =
        Array.isArray(
            data.positions
        )
            ? data.positions
            : [];


    // ========================================================
    // LICENSE
    // ========================================================

    renderLicense(
        license
    );


    // ========================================================
    // MONITOR
    // ========================================================

    renderMonitor(
        monitor
    );


    // ========================================================
    // POSITIONS
    // ========================================================

    renderPositions(
        positions,
        monitor
    );


    // ========================================================
    // SYSTEM MESSAGE
    // ========================================================

    if (
        monitor.ea_status ===
        "MONITOR_ONLINE"
    ) {

        showSystemMessage(
            "GOLDVORTEX Monitor EA aktif dan mengirim data MT5 secara real-time."
        );

    } else {

        showSystemMessage(
            "Monitor EA tidak terdeteksi aktif."
        );

    }

}


// ============================================================
// RENDER LICENSE
// ============================================================

function renderLicense(
    license
) {

    const status =
        String(
            license.status ||
            "UNKNOWN"
        ).toUpperCase();


    setText(
        "licenseKey",
        license.license_key || "—"
    );


    setText(
        "expiresAt",
        formatDate(
            license.expires_at
        )
    );


    setText(
        "licenseStatus",
        status === "ACTIVE"
            ? "VALID"
            : status
    );


    setText(
        "licenseBadge",
        status
    );


    setText(
        "remaining",
        calculateRemaining(
            license.expires_at
        )
    );


    // ========================================================
    // LICENSE COLOR / STATE
    // ========================================================

    const badge =
        document.getElementById(
            "licenseBadge"
        );


    if (badge) {

        badge.classList.remove(
            "active",
            "expired",
            "warning"
        );


        if (
            status === "ACTIVE"
        ) {

            badge.classList.add(
                "active"
            );

        }


        if (
            status === "EXPIRED"
        ) {

            badge.classList.add(
                "expired"
            );

        }


        if (
            isExpiringSoon(
                license.expires_at
            )
        ) {

            badge.classList.add(
                "warning"
            );

        }

    }

}


// ============================================================
// RENDER MONITOR
// ============================================================

function renderMonitor(
    monitor
) {

    const isOnline =
        monitor.ea_status ===
        "MONITOR_ONLINE";


    // ========================================================
    // MONITOR STATUS
    // ========================================================

    setText(
        "monitorStatus",
        isOnline
            ? "ONLINE"
            : "OFFLINE"
    );


    // ========================================================
    // LAST UPDATE
    // ========================================================

    setText(
        "lastUpdate",
        formatDate(
            monitor.last_update
        )
    );


    // ========================================================
    // ACCOUNT
    // ========================================================

    setText(
        "accountLogin",
        monitor.mt5_account ||
        "Waiting for MT5 data..."
    );


    setText(
        "accountId",
        monitor.mt5_account ||
        "—"
    );


    setText(
        "server",
        monitor.server ||
        "—"
    );


    // ========================================================
    // BALANCE
    // ========================================================

    setText(
        "balance",
        formatMoney(
            monitor.balance,
            monitor.currency
        )
    );


    // ========================================================
    // EQUITY
    // ========================================================

    setText(
        "equity",
        formatMoney(
            monitor.equity,
            monitor.currency
        )
    );


    // ========================================================
    // FLOATING PROFIT
    // ========================================================

    setText(
        "profit",
        formatMoney(
            monitor.floating_profit,
            monitor.currency
        )
    );


    // ========================================================
    // MARGIN
    // ========================================================

    setText(
        "margin",
        formatMoney(
            monitor.margin,
            monitor.currency
        )
    );


    // ========================================================
    // FREE MARGIN
    // ========================================================

    setText(
        "freeMargin",
        formatMoney(
            monitor.free_margin,
            monitor.currency
        )
    );


    // ========================================================
    // MARGIN LEVEL
    // ========================================================

    setText(
        "marginLevel",
        formatNumber(
            monitor.margin_level,
            2
        ) +
        "%"
    );


    // ========================================================
    // SWAP
    // ========================================================
    // Worker saat ini belum mengirim field swap.
    // Jangan membuat data palsu.
    // ========================================================

    setText(
        "swap",
        "—"
    );


    // ========================================================
    // ONLINE / OFFLINE CLASS
    // ========================================================

    const statusElement =
        document.getElementById(
            "monitorStatus"
        );


    if (statusElement) {

        statusElement.classList.toggle(
            "offline",
            !isOnline
        );

    }

}


// ============================================================
// RENDER POSITIONS
// ============================================================

function renderPositions(
    positions,
    monitor
) {

    const body =
        document.getElementById(
            "positionsBody"
        );


    const count =
        document.getElementById(
            "positionCount"
        );


    // ========================================================
    // POSITION COUNT
    // ========================================================

    if (count) {

        count.textContent =
            positions.length +
            (
                positions.length === 1
                    ? " POSITION"
                    : " POSITIONS"
            );

    }


    // ========================================================
    // EMPTY
    // ========================================================

    if (!body) {

        return;
    }


    if (
        positions.length === 0
    ) {

        body.innerHTML = `
            <tr>
                <td colspan="8">
                    No open positions
                </td>
            </tr>
        `;

        return;

    }


    // ========================================================
    // RENDER ALL POSITIONS
    // ========================================================

    body.innerHTML =
        positions
            .map(
                position =>
                    createPositionRow(
                        position,
                        monitor.currency
                    )
            )
            .join("");

}


// ============================================================
// CREATE POSITION ROW
// ============================================================

function createPositionRow(
    position,
    currency
) {

    const type =
        String(
            position.position_type ||
            ""
        ).toUpperCase();


    const typeClass =
        type === "BUY"
            ? "buy"
            : type === "SELL"
                ? "sell"
                : "";


    const profit =
        Number(
            position.profit || 0
        );


    const profitClass =
        profit > 0
            ? "profit-positive"
            : profit < 0
                ? "profit-negative"
                : "";


    return `
        <tr>

            <td>
                <strong>
                    ${escapeHTML(
                        position.symbol ||
                        "—"
                    )}
                </strong>
            </td>

            <td>
                <span class="position-type ${typeClass}">
                    ${escapeHTML(type || "—")}
                </span>
            </td>

            <td>
                ${formatNumber(
                    position.volume,
                    2
                )}
            </td>

            <td>
                ${formatPrice(
                    position.open_price
                )}
            </td>

            <td>
                ${formatPrice(
                    position.current_price
                )}
            </td>

            <td>
                ${
                    Number(
                        position.sl
                    ) > 0
                        ? formatPrice(
                            position.sl
                        )
                        : "—"
                }
            </td>

            <td>
                ${
                    Number(
                        position.tp
                    ) > 0
                        ? formatPrice(
                            position.tp
                        )
                        : "—"
                }
            </td>

            <td class="${profitClass}">
                ${formatMoney(
                    profit,
                    currency
                )}
            </td>

        </tr>
    `;

}


// ============================================================
// FORMAT MONEY
// ============================================================

function formatMoney(
    value,
    currency
) {

    const numberValue =
        Number(
            value || 0
        );


    if (
        !Number.isFinite(
            numberValue
        )
    ) {

        return "—";

    }


    const curr =
        String(
            currency ||
            "USD"
        ).toUpperCase();


    try {

        return new Intl.NumberFormat(
            "id-ID",
            {
                style: "currency",
                currency: curr,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        ).format(
            numberValue
        );

    } catch {

        return (
            numberValue
                .toLocaleString(
                    "id-ID",
                    {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    }
                )
            +
            " " +
            curr
        );

    }

}


// ============================================================
// FORMAT NUMBER
// ============================================================

function formatNumber(
    value,
    decimals = 2
) {

    const numberValue =
        Number(
            value
        );


    if (
        !Number.isFinite(
            numberValue
        )
    ) {

        return "0.00";

    }


    return numberValue.toLocaleString(
        "en-US",
        {
            minimumFractionDigits:
                decimals,

            maximumFractionDigits:
                decimals
        }
    );

}


// ============================================================
// FORMAT PRICE
// ============================================================

function formatPrice(
    value
) {

    const numberValue =
        Number(
            value
        );


    if (
        !Number.isFinite(
            numberValue
        ) ||
        numberValue === 0
    ) {

        return "—";

    }


    return numberValue.toLocaleString(
        "en-US",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );

}


// ============================================================
// FORMAT DATE
// ============================================================

function formatDate(
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
        isNaN(
            date.getTime()
        )
    ) {

        return String(
            value
        );

    }


    return date.toLocaleString(
        "id-ID",
        {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }
    );

}


// ============================================================
// CALCULATE REMAINING
// ============================================================

function calculateRemaining(
    expiresAt
) {

    if (!expiresAt) {

        return "—";

    }


    const expiry =
        new Date(
            expiresAt
        );


    if (
        isNaN(
            expiry.getTime()
        )
    ) {

        return "—";

    }


    const now =
        new Date();


    const difference =
        expiry.getTime() -
        now.getTime();


    if (
        difference <= 0
    ) {

        return "EXPIRED";

    }


    const totalSeconds =
        Math.floor(
            difference / 1000
        );


    const days =
        Math.floor(
            totalSeconds /
            86400
        );


    const hours =
        Math.floor(
            (
                totalSeconds %
                86400
            ) /
            3600
        );


    const minutes =
        Math.floor(
            (
                totalSeconds %
                3600
            ) /
            60
        );


    if (days > 0) {

        return (
            days +
            "d " +
            hours +
            "h"
        );

    }


    if (hours > 0) {

        return (
            hours +
            "h " +
            minutes +
            "m"
        );

    }


    return (
        minutes +
        "m"
    );

}


// ============================================================
// EXPIRING SOON
// ============================================================

function isExpiringSoon(
    expiresAt
) {

    if (!expiresAt) {

        return false;

    }


    const expiry =
        new Date(
            expiresAt
        );


    if (
        isNaN(
            expiry.getTime()
        )
    ) {

        return false;

    }


    const now =
        new Date();


    const difference =
        expiry.getTime() -
        now.getTime();


    const sevenDays =
        7 *
        24 *
        60 *
        60 *
        1000;


    return (
        difference > 0 &&
        difference <= sevenDays
    );

}


// ============================================================
// OFFLINE STATE
// ============================================================

function setOfflineState() {

    setText(
        "monitorStatus",
        "OFFLINE"
    );


    setText(
        "lastUpdate",
        "Connection lost"
    );

}


// ============================================================
// SYSTEM MESSAGE
// ============================================================

function showSystemMessage(
    message
) {

    setText(
        "systemMessage",
        message
    );

}


// ============================================================
// SET TEXT
// ============================================================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {

        return;

    }


    element.textContent =
        value === undefined ||
        value === null
            ? "—"
            : value;

}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(
    value
) {

    return String(
        value
    )
    .replace(
        /&/g,
        "&amp;"
    )
    .replace(
        /</g,
        "&lt;"
    )
    .replace(
        />/g,
        "&gt;"
    )
    .replace(
        /"/g,
        "&quot;"
    )
    .replace(
        /'/g,
        "&#039;"
    );

}


// ============================================================
// OPTIONAL DEBUG ACCESS
// ============================================================

window.GOLDVORTEX =
    {

        getData: function() {

            return dashboardDataCache;

        },

        refresh: function() {

            return loadDashboard();

        },

        getLicenseKey: function() {

            return getLicenseKey();

        }

    };
