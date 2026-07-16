/* Sanctify.biz — shared front-end behaviour */
(function () {
  "use strict";
  document.documentElement.classList.add("has-js");

  // ---- Mobile nav toggle ----
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", nav.classList.contains("open") ? "true" : "false");
    });
  }

  // ---- Scroll progress bar + shrinking header ----
  var prog = document.getElementById("progress");
  var hdr = document.querySelector(".site-header");
  if (prog || hdr) {
    window.addEventListener("scroll", function () {
      var h = document.documentElement, st = h.scrollTop, sh = h.scrollHeight - h.clientHeight;
      if (prog) prog.style.width = (sh > 0 ? (st / sh * 100) : 0) + "%";
      if (hdr) hdr.classList.toggle("scrolled", st > 20);
    }, { passive: true });
  }

  // ---- Scroll reveal (auto-applied) + count-up ----
  var revealSel = ".section-head,.card,.painbox,.step,.pricecard,.tcard,.client,.b,.stat,.split>div,.split>img,.leadform,.logo-item";
  document.querySelectorAll(revealSel).forEach(function (el) { el.classList.add("reveal"); });

  function countUp(el) {
    if (el._done) return; el._done = 1;
    var target = parseFloat(el.getAttribute("data-count"));
    var dec = parseInt(el.getAttribute("data-dec") || "0", 10);
    var suf = el.getAttribute("data-suffix") || "";
    var dur = 1400, t0 = null;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1), eased = 1 - Math.pow(1 - p, 3), val = target * eased;
      el.textContent = (dec ? val.toFixed(dec) : Math.round(val)) + suf;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          if (e.target.hasAttribute("data-count")) countUp(e.target);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.14 });
    document.querySelectorAll(".reveal,[data-count]").forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
    document.querySelectorAll("[data-count]").forEach(countUp);
  }

  // ---- Rotating hero word (home only) ----
  var rw = document.getElementById("rw");
  if (rw) {
    var words = (rw.getAttribute("data-words") || "Online").split("|"), i = 0;
    setInterval(function () {
      rw.classList.add("out");
      setTimeout(function () { i = (i + 1) % words.length; rw.textContent = words[i]; rw.classList.remove("out"); }, 400);
    }, 2600);
  }

  // ---- Testimonial carousel (home only) ----
  var sl = document.getElementById("tslider");
  if (sl) {
    var cardW = function () { var c = sl.querySelector(".tcard"); return c ? c.offsetWidth + 24 : 320; };
    var next = document.getElementById("tnext"), prev = document.getElementById("tprev");
    if (next) next.addEventListener("click", function () { sl.scrollBy({ left: cardW(), behavior: "smooth" }); });
    if (prev) prev.addEventListener("click", function () { sl.scrollBy({ left: -cardW(), behavior: "smooth" }); });
    var auto = setInterval(function () {
      if (sl.scrollLeft + sl.clientWidth >= sl.scrollWidth - 5) sl.scrollTo({ left: 0, behavior: "smooth" });
      else sl.scrollBy({ left: cardW(), behavior: "smooth" });
    }, 4500);
    sl.addEventListener("pointerdown", function () { clearInterval(auto); });
  }

  // ---- Card 3D tilt + cursor glow ----
  document.querySelectorAll(".tilt").forEach(function (card) {
    card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.transform = "translateY(-6px) rotateX(" + ((0.5 - y) * 8) + "deg) rotateY(" + ((x - 0.5) * 8) + "deg)";
      card.style.setProperty("--mx", (x * 100) + "%");
      card.style.setProperty("--my", (y * 100) + "%");
    });
    card.addEventListener("pointerleave", function () { card.style.transform = ""; });
  });

  // ---- Lead form (POST endpoint with mailto fallback) ----
  var form = document.querySelector("#lead-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = form.querySelector(".form-status");
      var endpoint = (form.getAttribute("data-endpoint") || "").trim();
      var accessKey = (form.getAttribute("data-access-key") || "").trim();
      var page = form.getAttribute("data-page") || document.title;
      var phone = form.getAttribute("data-phone") || "";
      if (typeof window.gtag === "function") window.gtag("event", "generate_lead", { source_page: page });

      if (endpoint) {
        var fd = new FormData(form);
        fd.append("source_page", window.location.href);
        fd.append("subject", "New enquiry from Sanctify.biz — " + page);
        if (accessKey) fd.append("access_key", accessKey);
        if (status) status.textContent = "Sending…";
        var submitBtn = form.querySelector("button[type=submit]");
        if (submitBtn) submitBtn.disabled = true;
        fetch(endpoint, { method: "POST", body: fd, headers: { Accept: "application/json" } })
          .then(function (r) { return r.ok ? r : Promise.reject(r); })
          .then(function () { form.reset(); if (status) status.textContent = "✅ Thank you! We'll get back to you within one working day."; })
          .catch(function () { if (status) status.textContent = "Something went wrong. Please call us at " + phone + " or WhatsApp us."; })
          .finally(function () { if (submitBtn) submitBtn.disabled = false; });
        return;
      }

      var data = new FormData(form);
      var to = form.getAttribute("data-email") || "business@sanctify.biz";
      var subject = "New enquiry from Sanctify.biz — " + page;
      var lines = [
        "Name: " + (data.get("name") || ""),
        "Phone: " + (data.get("phone") || ""),
        "Email: " + (data.get("email") || ""),
        "Service: " + (data.get("service") || ""),
        "Message: " + (data.get("message") || ""),
        "", "Source page: " + window.location.href
      ];
      window.location.href = "mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(lines.join("\n"));
      if (status) status.textContent = "Opening your email app… if nothing happens, call us at " + phone;
    });
  }

  // ---- Footer year ----
  var y = document.querySelector("#year");
  if (y) y.textContent = new Date().getFullYear();
})();
