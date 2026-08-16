document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("activationForm");
  const tradingDays = document.getElementById("tradingDays");
  const activationDate = document.getElementById("activationDate");
  const expiryDate = document.getElementById("expiryDate");
  const message = document.getElementById("activationMessage");

  function formatDate(date) {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(date);
  }

  function updateLicensePreview() {

    const days =
      Math.max(
        1,
        parseInt(tradingDays?.value || "30", 10)
      );

    const start = new Date();

    const expiry = new Date(start);

    expiry.setDate(
      expiry.getDate() + days
    );

    if (activationDate) {
      activationDate.textContent =
        formatDate(start);
    }

    if (expiryDate) {
      expiryDate.textContent =
        formatDate(expiry);
    }

  }

  tradingDays?.addEventListener(
    "input",
    updateLicensePreview
  );

  updateLicensePreview();

  // =========================================
  // ACTIVATE ACCOUNT
  // =========================================

  form?.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      const payload = {

        name:
          document.getElementById("name")?.value || "",

        email:
          document.getElementById("email")?.value || "",

        mt5_account:
          document.getElementById("mt5")?.value || "",

        broker:
          document.getElementById("server")?.value || "",

        mt5_password:
          document.getElementById("password")?.value || "",

        trading_days:
          parseInt(
            document.getElementById("tradingDays")?.value || "30",
            10
          )

      };

      try {

        if (message) {

          message.textContent =
            "Activating GOLDVORTEX...";

          message.style.color =
            "#ffd36a";

        }

        const response =
          await fetch(
            "https://goldvortex-api.irhamwrapublic.workers.dev/api/activate-account",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify(payload)
            }
          );

        const result =
          await response.json();

        console.log(result);

        if (result.success) {

          const licenseKey =
            result.license?.license_key || "";

          localStorage.setItem(
            "gv_license_key",
            licenseKey
          );

          if (message) {

            message.textContent =
              "Activation successful. Redirecting...";

            message.style.color =
              "#55d5a0";

          }

          setTimeout(() => {

            window.location.href =
              "/dashboard.html?license_key=" +
              encodeURIComponent(
                licenseKey
              );

          }, 1500);

        }

        else {

          if (message) {

            message.textContent =
              result.error ||
              "Activation failed";

            message.style.color =
              "#ff6b6b";

          }

        }

      }

      catch (error) {

        console.error(error);

        if (message) {

          message.textContent =
            "Connection error";

          message.style.color =
            "#ff6b6b";

        }

      }

    }
  );

  // =========================================
  // ANIMATION
  // =========================================

  const reveal =
    document.querySelectorAll(
      ".step-card,.broker-card,.activation-card,.monitor-card"
    );

  const observer =
    new IntersectionObserver(
      (entries) => {

        entries.forEach(
          (entry) => {

            if (!entry.isIntersecting) {
              return;
            }

            entry.target.classList.add(
              "gv-visible"
            );

            observer.unobserve(
              entry.target
            );

          }
        );

      },
      {
        threshold: 0.08
      }
    );

  reveal.forEach(
    (el) => observer.observe(el)
  );

});
