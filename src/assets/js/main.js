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

  // Lead form: capture and route via mailto (works on static hosting with no backend).
  // Replace with a POST to your CRM/endpoint when available.
  var form = document.querySelector("#lead-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var to = form.getAttribute("data-email") || "help@sanctify.in";
      var page = form.getAttribute("data-page") || document.title;
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
      var href = "mailto:" + to +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(lines.join("\n"));
      window.location.href = href;
      var note = form.querySelector(".form-status");
      if (note) { note.textContent = "Opening your email app… if nothing happens, call us at " + (form.getAttribute("data-phone") || ""); }
    });
  }

  // Current year in footer
  var y = document.querySelector("#year");
  if (y) { y.textContent = new Date().getFullYear(); }
})();
