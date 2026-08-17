
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("activationForm");
  const tradingDays = document.getElementById("tradingDays");
  const activationDate = document.getElementById("activationDate");
  const expiryDate = document.getElementById("expiryDate");
  const message = document.getElementById("activationMessage");

  function formatDate(date) {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit", month: "short", year: "numeric"
    }).format(date);
  }

  function updateLicensePreview() {
    const days = Math.max(1, parseInt(tradingDays?.value || "30", 10));
    const start = new Date();
    const expiry = new Date(start);
    expiry.setDate(expiry.getDate() + days);

    if (activationDate) activationDate.textContent = formatDate(start);
    if (expiryDate) expiryDate.textContent = formatDate(expiry);
  }

  tradingDays?.addEventListener("input", updateLicensePreview);
  updateLicensePreview();

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    updateLicensePreview();

    if (message) {
      message.textContent = "✓ Demo activation request prepared. Backend/license API will be connected in the next stage.";
      message.style.color = "#55d5a0";
    }
  });

  // Keep the current page structure and add only subtle reveal motion.
  const reveal = document.querySelectorAll(".step-card,.broker-card,.activation-card,.monitor-card");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("gv-visible");
      observer.unobserve(entry.target);
    });
  }, {threshold:0.08});

  reveal.forEach((el) => observer.observe(el));
});
