/* Sanctify.biz — shared front-end behaviour */
(function () {
  "use strict";

  // Mobile nav toggle
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      nav.classList.toggle("open");
      var expanded = nav.classList.contains("open");
      toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    });
  }

  // Lead form.
  // If data-endpoint is set (e.g. Web3Forms / Formspree / your CRM URL) the form
  // POSTs there via fetch and captures the lead automatically. If it is empty,
  // it falls back to opening the visitor's email app (mailto) so the form always works.
  var form = document.querySelector("#lead-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = form.querySelector(".form-status");
      var endpoint = (form.getAttribute("data-endpoint") || "").trim();
      var accessKey = (form.getAttribute("data-access-key") || "").trim();
      var page = form.getAttribute("data-page") || document.title;
      var phone = form.getAttribute("data-phone") || "";

      // GA4 lead event (safe no-op if gtag isn't present)
      if (typeof window.gtag === "function") {
        window.gtag("event", "generate_lead", { source_page: page });
      }

      if (endpoint) {
        var fd = new FormData(form);
        fd.append("source_page", window.location.href);
        fd.append("subject", "New enquiry from Sanctify.biz — " + page);
        if (accessKey) { fd.append("access_key", accessKey); } // Web3Forms
        if (status) { status.textContent = "Sending…"; }
        var submitBtn = form.querySelector("button[type=submit]");
        if (submitBtn) { submitBtn.disabled = true; }
        fetch(endpoint, { method: "POST", body: fd, headers: { Accept: "application/json" } })
          .then(function (r) { return r.ok ? r : Promise.reject(r); })
          .then(function () {
            form.reset();
            if (status) { status.textContent = "✅ Thank you! We'll get back to you within one working day."; }
          })
          .catch(function () {
            if (status) { status.textContent = "Something went wrong. Please call us at " + phone + " or WhatsApp us."; }
          })
          .finally(function () { if (submitBtn) { submitBtn.disabled = false; } });
        return;
      }

      // Fallback: mailto
      var data = new FormData(form);
      var to = form.getAttribute("data-email") || "business@sanctify.biz";
      var subject = "New enquiry from Sanctify.biz — " + page;
      var lines = [
        "Name: " + (data.get("name") || ""),
        "Phone: " + (data.get("phone") || ""),
        "Email: " + (data.get("email") || ""),
        "Service: " + (data.get("service") || ""),
        "Message: " + (data.get("message") || ""),
        "",
        "Source page: " + window.location.href
      ];
      window.location.href = "mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(lines.join("\n"));
      if (status) { status.textContent = "Opening your email app… if nothing happens, call us at " + phone; }
    });
  }

  // Current year in footer
  var y = document.querySelector("#year");
  if (y) { y.textContent = new Date().getFullYear(); }
})();
