#!/usr/bin/env node
/* Sanctify.biz — Programmatic Local-SEO Landing Engine
 * Generates static HTML from data + templates, organised into upload waves.
 * Usage: node scripts/build.js
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const DATA = path.join(ROOT, "data");

const site = load("site.json");
const services = load("services.json");
const industries = load("industries.json");
const locations = load("locations.json");
const images = load("images.json");
const matrix = load("matrix.json");
const clients = load("clients.json");

function load(f) { return JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8")); }
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function write(rel, html) {
  const full = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, html);
}
const waveFiles = { 1: new Set(), 2: new Set(), 3: new Set() };
function record(wave, rel) { waveFiles[wave].add(rel); }

/* ---------- SEO helpers ---------- */
// Absolutise a root-relative URL for og:image / schema (must be a full URL).
function abs(u) { if (!u) return site.baseUrl + "/assets/img/goa-hero-1.jpg"; return /^https?:\/\//.test(u) ? u : site.baseUrl + u; }
// Keep meta descriptions within the ~158-char sweet spot, trimming on a word boundary.
function clampDesc(s, max = 158) {
  s = String(s).replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  let cut = s.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  if (sp > 80) cut = cut.slice(0, sp);
  return cut.replace(/[\s,;:.\-–—]+$/, "") + "…";
}
// Rotate the closing call-to-action so thousands of pages don't share an identical tail.
const CTAS = ["Get a free quote today.", "Free quote, no obligation.", "Request your free quote.", "Talk to our Goa team today.", "Start with a free consultation."];
function cta(seed) { let h = 0; const str = String(seed); for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return CTAS[h % CTAS.length]; }

/* ---------- lookups & helpers ---------- */
const svcBy = Object.fromEntries(services.map(s => [s.slug, s]));
const indBy = Object.fromEntries(industries.map(i => [i.slug, i]));
const locBy = Object.fromEntries(locations.map(l => [l.slug, l]));

function img(key, w) {
  const rec = images.services[key] || images.industries[key] || images.heroes[key];
  if (!rec) return { url: "", alt: "", credit: "", creditUrl: "" };
  return { url: rec.file, alt: rec.alt, credit: rec.credit, creditUrl: rec.creditUrl };
}
function serviceImg(s, w) { return img(s.image, w); }
function industryImg(i, w) { return img(i.image, w); }

// URL builders (root-relative, deployed at domain root)
const U = {
  home: () => `/`,
  pillar: s => `/${s.slug}-in-goa.html`,
  svcLoc: (s, l) => `/${s.slug}/${l.slug}.html`,
  svcInd: (s, i) => `/${s.slug}/for-${i.slug}.html`,
  triple: (s, i, l) => `/${s.slug}/for-${i.slug}/${l.slug}.html`,
  locHub: l => `/locations/${l.slug}.html`,
  indHub: i => `/industries/${i.slug}.html`,
  credits: () => `/image-credits.html`,
};

/* ---------- inline SVG icons ---------- */
function svcIcon(slug) {
  const ic = {
    "web-design": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 9h18M7 6.5h.01M9.5 6.5h.01"/></svg>',
    "seo": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M8 11h6M11 8v6"/></svg>',
    "google-ads": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3l7 17 2.5-6.5L19 11 3 3z"/></svg>',
    "social-media-marketing": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z"/></svg>',
    "graphic-design": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 19l7-7-4-4-7 7v4h4zM14 6l4 4"/></svg>',
    "content-marketing": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5h16v11H8l-4 4V5z"/><path d="M8 9h8M8 12h5"/></svg>',
    "email-sms-marketing": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    "local-listings": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>'
  };
  return ic[slug] || ic["web-design"];
}
function clientIcon(key) {
  const ic = {
    entertainment: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z"/></svg>',
    automotive: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 11l1.5-4A2 2 0 018.4 6h7.2a2 2 0 011.9 1l1.5 4h1a1 1 0 011 1v4a1 1 0 01-1 1h-1a2 2 0 11-4 0H9a2 2 0 11-4 0H4a1 1 0 01-1-1v-4a1 1 0 011-1h1z"/></svg>',
    corporate: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 4h6a2 2 0 012 2v1h3a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1h3V6a2 2 0 012-2zm0 3h6V6H9v1z"/></svg>',
    political: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 3a1 1 0 011 1v1h10l-2 3.5L17 12H7v9H5V4a1 1 0 011-1z"/></svg>',
    hospitality: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 8a1 1 0 012 0v3h6V9a2 2 0 012-2h6a3 3 0 013 3v8h-2v-2H4v2H2V8zm4 3a2 2 0 110-4 2 2 0 010 4z"/></svg>',
    healthcare: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 3h4v5h5v4h-5v9h-4v-9H5V8h5z"/></svg>',
    travel: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 15.5v-2l-8-4.5V4a1.5 1.5 0 00-3 0v5L2 13.5v2l8-2.3V18l-2 1.4V21l3.5-1 3.5 1v-1.6L13 18v-2.8z"/></svg>',
    retail: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h2l2.2 11.2A2 2 0 009.16 16H18a2 2 0 001.94-1.5L21.5 8H6.2M9 20a1 1 0 100-2 1 1 0 000 2zm9 0a1 1 0 100-2 1 1 0 000 2z"/></svg>',
    education: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L1 8l11 5 9-4.1V15h2V8zM5 13.2V17c0 1.7 3.1 3 7 3s7-1.3 7-3v-3.8l-7 3.2z"/></svg>',
    local: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 4h6a2 2 0 012 2v1h3a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1h3V6a2 2 0 012-2zm0 3h6V6H9v1z"/></svg>'
  };
  return ic[key] || ic.corporate;
}

/* ---------- shared chrome ---------- */
function ga4Snippet() {
  if (!site.ga4Id) return `<!-- GA4 not configured. Add your Measurement ID as "ga4Id":"G-XXXXXXXXXX" in data/site.json and rebuild to enable cross-domain analytics. -->`;
  const domains = ["sanctify.biz", "www.sanctify.biz", "sanctify.in", "www.sanctify.in"];
  return `<!-- Google Analytics 4 (cross-domain) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${site.ga4Id}"></script>
<script>
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());
gtag('config','${site.ga4Id}',{linker:{domains:${JSON.stringify(domains)}}});
</script>`;
}

function head(o) {
  const canonical = site.baseUrl + o.pathname;
  const ogImg = abs(o.image || img("goa-hero-1", 1200).url);
  const schema = (o.schema || []).map(s => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join("\n");
  return `<!DOCTYPE html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${site.gscVerification ? `<meta name="google-site-verification" content="${esc(site.gscVerification)}">` : ""}
${ga4Snippet()}
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="robots" content="${o.robots || "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"}">
<meta name="theme-color" content="#0b6b53">
<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
<link rel="apple-touch-icon" href="/assets/favicon.svg">
<meta property="og:type" content="website">
<meta property="og:locale" content="en_IN">
<meta property="og:title" content="${esc(o.title)}">
<meta property="og:description" content="${esc(o.description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(ogImg)}">
<meta property="og:image:alt" content="${esc(site.brand)} — ${esc(site.tagline)}">
<meta property="og:site_name" content="${esc(site.brand)} — ${esc(site.tagline)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(o.title)}">
<meta name="twitter:description" content="${esc(o.description)}">
<meta name="twitter:image" content="${esc(ogImg)}">
<meta name="geo.region" content="IN-GA">
<meta name="geo.placename" content="Goa">
<meta name="geo.position" content="${site.geo.lat};${site.geo.lng}">
<meta name="ICBM" content="${site.geo.lat}, ${site.geo.lng}">
<meta name="author" content="${esc(site.legalName)}">
<meta name="publisher" content="${esc(site.legalName)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700;800;900&display=swap">
<link rel="stylesheet" href="/assets/css/styles.css">
${schema}
</head>`;
}

function header() {
  return `<body>
<div class="progress" id="progress"></div>
<header class="site-header">
  <div class="container">
    <nav class="nav" aria-label="Primary">
      <a class="brand-logo" href="/">
        <span class="dot"></span>${esc(site.brand)}<small>.biz</small>
      </a>
      <ul class="nav-links">
        <li><a href="/#services">Services</a></li>
        <li><a href="#included">What's Included</a></li>
        <li><a href="#pricing">Pricing</a></li>
        <li><a href="#faqs">FAQs</a></li>
        <li><a href="${site.mainSite}" rel="noopener">Main Site ↗</a></li>
      </ul>
      <div class="nav-cta">
        <a class="nav-phone" href="tel:${site.phoneRaw}">${esc(site.phone)}</a>
        <a class="btn btn-primary" href="#contact">Get Free Quote</a>
      </div>
      <button class="nav-toggle" aria-label="Toggle menu" aria-expanded="false">☰</button>
    </nav>
  </div>
</header>`;
}

function ratingBar() {
  return `<div class="ratingbar">
    <span><span class="stars">★★★★★</span> <strong>${site.rating.value}/5</strong> from ${site.rating.count} reviews</span>
    <span>🏆 Award-winning agency since ${site.foundedYear}</span>
    <span>📍 Based in ${esc(site.addressLocality)}, Goa</span>
  </div>`;
}

function floaties() {
  return `<div class="floaties">
    <a class="floatie wa" href="https://wa.me/${site.whatsapp}" target="_blank" rel="noopener" aria-label="WhatsApp us">🟢</a>
    <a class="floatie call" href="tel:${site.phoneRaw}" aria-label="Call us">📞</a>
  </div>`;
}

function footer() {
  const pillarLinks = services.map(s => `<li><a href="${U.pillar(s)}">${esc(s.short)} in Goa</a></li>`).join("");
  const locLinks = locations.slice(0, 8).map(l => `<li><a href="${U.locHub(l)}">${esc(l.name)}</a></li>`).join("");
  return `<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div>
        <div class="brand-logo" style="color:#fff"><span class="dot"></span>${esc(site.brand)}<small style="color:var(--accent)">.biz</small></div>
        <p style="margin-top:12px;max-width:32ch">${esc(site.tagline)}. Helping Goa businesses grow online since ${site.foundedYear}.</p>
        <p><a href="tel:${site.phoneRaw}">${esc(site.phone)}</a><br><a href="mailto:${site.email}">${esc(site.email)}</a></p>
      </div>
      <div><h4>Services</h4><ul>${pillarLinks}</ul></div>
      <div><h4>Locations</h4><ul>${locLinks}</ul></div>
      <div><h4>Sanctify Network</h4><ul>
        <li><a href="${site.mainSite}" rel="noopener">Sanctify Agency ↗</a></li>
        <li><a href="${site.hostingSite}" rel="noopener">Sanctify Hostings ↗</a></li>
        <li><a href="${U.credits()}">Image Credits</a></li>
      </ul></div>
    </div>
    <div class="footer-bottom">
      <span>© <span id="year">2026</span> ${esc(site.legalName)}. All rights reserved.</span>
      <span>${esc(site.addressLocality)}, ${esc(site.addressRegion)}, India</span>
    </div>
  </div>
</footer>
<script src="/assets/js/main.js"></script>
</body>
</html>`;
}

function leadForm(pageLabel, presetService) {
  const opts = services.map(s => `<option${presetService === s.name ? " selected" : ""}>${esc(s.name)}</option>`).join("");
  return `<div class="leadform" id="contact">
    <h3>Get a Free Quote</h3>
    <p class="mb-0" style="color:var(--muted);font-size:.95rem">Tell us about your business — we'll respond within one working day.</p>
    <form id="lead-form" data-email="${site.email}" data-phone="${esc(site.phone)}" data-page="${esc(pageLabel)}" data-endpoint="${esc(site.formEndpoint || "")}" data-access-key="${esc(site.formAccessKey || "")}" style="margin-top:16px">
      <div class="field"><label>Name</label><input name="name" required placeholder="Your name"></div>
      <div class="field"><label>Phone / WhatsApp</label><input name="phone" required placeholder="e.g. 98xxxxxxxx"></div>
      <div class="field"><label>Email</label><input type="email" name="email" placeholder="you@example.com"></div>
      <div class="field"><label>Service needed</label><select name="service">${opts}</select></div>
      <div class="field"><label>Message</label><textarea name="message" rows="3" placeholder="A few words about what you need"></textarea></div>
      <button class="btn btn-primary btn-block btn-lg" type="submit">Request My Free Quote →</button>
      <p class="form-status form-note"></p>
      <p class="form-note">Prefer to talk? Call <a href="tel:${site.phoneRaw}">${esc(site.phone)}</a> or <a href="https://wa.me/${site.whatsapp}" rel="noopener">WhatsApp us</a>.</p>
    </form>
  </div>`;
}

/* ---------- schema.org builders ---------- */
function localBusinessSchema() {
  return {
    "@context": "https://schema.org", "@type": "ProfessionalService", "@id": site.baseUrl + "/#business",
    name: site.legalName, alternateName: site.brand + ".biz",
    description: `${site.brand} is an award-winning digital marketing and advertising agency in Goa, offering web design, SEO, Google Ads, social media, graphic design, content marketing and local listings since ${site.foundedYear}.`,
    image: [abs(img("goa-hero-1", 1200).url), abs(img("goa-hero-2", 1200).url)],
    logo: abs("/assets/favicon.svg"),
    url: site.baseUrl, telephone: site.phone, email: site.email, priceRange: site.priceRange,
    currenciesAccepted: "INR", paymentAccepted: "Cash, UPI, Bank Transfer, Card",
    address: { "@type": "PostalAddress", streetAddress: site.streetAddress, addressLocality: site.addressLocality, addressRegion: site.addressRegion, postalCode: site.postalCode, addressCountry: site.addressCountry },
    geo: { "@type": "GeoCoordinates", latitude: site.geo.lat, longitude: site.geo.lng },
    hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.legalName + ", " + site.addressLocality + ", Goa")}`,
    openingHoursSpecification: [{ "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], opens: "09:30", closes: "18:30" }],
    aggregateRating: { "@type": "AggregateRating", ratingValue: site.rating.value, reviewCount: site.rating.count, bestRating: "5", worstRating: "1" },
    review: [
      { "@type": "Review", author: { "@type": "Person", name: "Shreya Dutta" }, reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" }, reviewBody: "Highly recommend this agency to anyone looking for top-notch digital marketing in Goa. Skilled across SEO, social media and everything in between." },
      { "@type": "Review", author: { "@type": "Person", name: "Ashutosh Hazare" }, reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" }, reviewBody: "Impressed with the team's professionalism and effectiveness. I highly recommend Sanctify to any company that needs help with digital marketing." }
    ],
    areaServed: locations.map(l => ({ "@type": "City", name: l.name })),
    knowsAbout: services.map(s => s.name),
    foundingDate: String(site.foundedYear),
    makesOffer: services.map(s => ({ "@type": "Offer", priceCurrency: "INR", price: s.pricing.from.replace(/[^0-9]/g, ""), itemOffered: { "@type": "Service", name: s.name } })),
    parentOrganization: { "@type": "Organization", name: site.legalName, url: site.mainSite },
    sameAs: Object.values(site.social).concat([site.mainSite, site.hostingSite])
  };
}
function webSiteSchema() {
  return { "@context": "https://schema.org", "@type": "WebSite", "@id": site.baseUrl + "/#website", url: site.baseUrl, name: `${site.brand} — ${site.tagline}`, publisher: { "@id": site.baseUrl + "/#business" }, inLanguage: "en-IN" };
}
function serviceSchema(s, areaName) {
  return {
    "@context": "https://schema.org", "@type": "Service",
    serviceType: s.name, provider: { "@type": "ProfessionalService", name: site.legalName, telephone: site.phone },
    areaServed: { "@type": "Place", name: areaName }, description: s.intro,
    offers: { "@type": "Offer", priceCurrency: "INR", price: s.pricing.from.replace(/[^0-9]/g, "") }
  };
}
function faqSchema(faqs) {
  return { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
}
function breadcrumbSchema(items) {
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((it, idx) => ({ "@type": "ListItem", position: idx + 1, name: it.name, item: site.baseUrl + it.href })) };
}

/* ---------- reusable page sections ---------- */
function heroBlock(o) {
  const bg = o.heroImage || o.image;
  const crumb = o.breadcrumb.map((b, i) => i < o.breadcrumb.length - 1 ? `<a href="${b.href}">${esc(b.name)}</a><span>›</span>` : `<span style="color:#fff">${esc(b.name)}</span>`).join("");
  return `<section class="hero" style="background-image:linear-gradient(rgba(8,79,62,.82),rgba(9,26,21,.9)),url('${bg}')">
    <span class="orb o1"></span><span class="orb o2"></span>
    <div class="container">
      <div class="breadcrumb">${crumb}</div>
      <h1>${esc(o.h1)}</h1>
      <p>${esc(o.heroSub)}</p>
      <div class="hero-badges">
        ${site.trustSignals.map(t => `<span class="hero-badge"><span class="tick">✓</span>${esc(t)}</span>`).join("")}
      </div>
      <div class="hero-actions">
        <a class="btn btn-primary btn-lg" href="#contact">Get a Free Quote</a>
        <a class="btn btn-outline btn-lg" href="tel:${site.phoneRaw}">📞 ${esc(site.phone)}</a>
      </div>
    </div>
  </section>`;
}

function introSection(o) {
  return `<section class="section"><div class="container split">
    <div>
      <p class="eyebrow">${esc(o.eyebrow)}</p>
      <h2>${esc(o.h2)}</h2>
      ${o.intro}
      <a class="btn btn-brand" href="#contact" style="margin-top:8px">Start your project →</a>
    </div>
    <img src="${o.image.url}" alt="${esc(o.image.alt)}" loading="lazy" width="800" height="600">
  </div></section>`;
}

function painSection(painPoints, subjectLabel) {
  if (!painPoints || !painPoints.length) return "";
  return `<section class="section section-soft"><div class="container">
    <div class="section-head"><p class="eyebrow">Sound familiar?</p><h2>Challenges ${esc(subjectLabel)} face online</h2></div>
    <div class="grid grid-3">
      ${painPoints.map(p => `<div class="painbox"><h4>⚠ ${esc(p.h4)}</h4><p>${esc(p.p)}</p></div>`).join("")}
    </div>
    <p class="center" style="margin-top:22px;max-width:640px;margin-left:auto;margin-right:auto">That's exactly what we fix. Here's how ${esc(site.brand)} turns these challenges into growth ↓</p>
  </div></section>`;
}

function includedSection(s) {
  return `<section class="section" id="included"><div class="container split">
    <img src="${serviceImg(s, 800).url}" alt="${esc(serviceImg(s, 800).alt)}" loading="lazy" width="800" height="600">
    <div>
      <p class="eyebrow">What's included</p>
      <h2>Everything in our ${esc(s.short)} service</h2>
      <ul class="ticklist">${s.deliverables.map(d => `<li>${esc(d)}</li>`).join("")}</ul>
    </div>
  </div></section>`;
}

function processSection(s) {
  return `<section class="section section-soft"><div class="container">
    <div class="section-head"><p class="eyebrow">How we work</p><h2>Our ${esc(s.short)} process</h2></div>
    <div class="steps">
      ${s.process.map((p, i) => `<div class="step"><div class="num">${i + 1}</div><h4>${esc(p.step)}</h4><p>${esc(p.text)}</p></div>`).join("")}
    </div>
  </div></section>`;
}

function pricingSection(s) {
  return `<section class="section" id="pricing"><div class="container">
    <div class="section-head"><p class="eyebrow">Transparent pricing</p><h2>${esc(s.short)} packages that fit your budget</h2></div>
    <div class="grid grid-2" style="align-items:center">
      <div class="pricecard">
        <p class="eyebrow">Starting from</p>
        <div class="price">${esc(s.pricing.from)} <small>${esc(s.pricing.note)}</small></div>
        <p style="margin:16px 0;color:var(--muted)">Every business is different. Get a tailored quote based on exactly what you need — no obligation.</p>
        <a class="btn btn-primary btn-lg btn-block" href="#contact">Get My Custom Quote</a>
      </div>
      <div>
        <h3>Why Goa businesses choose ${esc(site.brand)}</h3>
        <ul class="ticklist" style="margin-top:12px">${site.usps.map(u => `<li><strong>${esc(u.title)}:</strong> ${esc(u.text)}</li>`).join("")}</ul>
      </div>
    </div>
  </div></section>`;
}

function bandSection(text) {
  return `<section class="section"><div class="container"><div class="band">
    <h2>${esc(text)}</h2>
    <p style="max-width:640px;margin:12px auto 20px;color:rgba(255,255,255,.92)">Book a free, no-obligation consultation with our team today.</p>
    <a class="btn btn-primary btn-lg" href="#contact">Get Started Free</a>
  </div></div></section>`;
}

function faqSection(faqs) {
  return `<section class="section section-soft" id="faqs"><div class="container" style="max-width:820px">
    <div class="section-head"><p class="eyebrow">Questions?</p><h2>Frequently asked questions</h2></div>
    ${faqs.map(f => `<details class="faq"><summary>${esc(f.q)}</summary><div class="faq-body">${esc(f.a)}</div></details>`).join("")}
  </div></section>`;
}

function relatedSection(title, pills) {
  if (!pills.length) return "";
  return `<section class="section"><div class="container">
    <div class="section-head"><p class="eyebrow">Explore more</p><h2>${esc(title)}</h2></div>
    <div class="pills" style="justify-content:center">${pills.map(p => `<a class="pill" href="${p.href}">${esc(p.label)}</a>`).join("")}</div>
  </div></section>`;
}

function contactSection(pageLabel, presetService) {
  return `<section class="section cta-final"><div class="container split">
    <div>
      <p class="eyebrow" style="color:var(--accent)">Ready to grow?</p>
      <h2>Let's put your business in front of more customers</h2>
      <p style="color:#cfe3db;max-width:46ch">Get a free quote and a no-pressure conversation about how ${esc(site.brand)} can help you win more customers in Goa.</p>
      <ul class="ticklist" style="margin-top:14px">
        <li style="color:#dfeee8">Free consultation & quote</li>
        <li style="color:#dfeee8">Response within 1 working day</li>
        <li style="color:#dfeee8">No long-term lock-in contracts</li>
      </ul>
    </div>
    ${leadForm(pageLabel, presetService)}
  </div></section>`;
}

/* ---------- generic landing renderer ---------- */
function renderLanding(o, wave) {
  const html = [
    head(o), header(), ratingBar(),
    heroBlock(o),
    introSection(o.introBlock),
    painSection(o.painPoints, o.painSubject),
    includedSection(o.service),
    processSection(o.service),
    o.statLine ? bandSection(o.statLine) : "",
    pricingSection(o.service),
    faqSection(o.faqs),
    relatedSection(o.relatedTitle, o.relatedPills),
    contactSection(o.pageLabel, o.service.name),
    floaties(), footer()
  ].join("\n");
  write(o.file, html);
  record(wave, o.file);
}

/* ================= PAGE GENERATORS ================= */

// -- Wave 1a: Service pillar (service in Goa) --
function genPillar(s) {
  const file = `${s.slug}-in-goa.html`;
  const pathname = U.pillar(s);
  const locPills = locations.map(l => ({ href: U.svcLoc(s, l), label: `${s.short} in ${l.name}` }));
  const faqs = s.faqs.concat([{ q: `Do you offer ${s.short.toLowerCase()} across all of Goa?`, a: `Yes. We provide ${s.name.toLowerCase()} to businesses across North and South Goa — from ${locations[0].name} and ${locations[2].name} to ${locations[8].name} and beyond.` }]);
  renderLanding({
    file, pathname,
    title: `${s.name} in Goa | ${site.brand}`,
    description: clampDesc(`${s.short} in Goa by ${site.brand}. ${s.tagline} Award-winning agency since ${site.foundedYear}, rated ${site.rating.value}/5. ${cta(pathname)}`),
    image: serviceImg(s, 1200).url,
    h1: `${s.name} in Goa`,
    heroSub: s.intro,
    breadcrumb: [{ name: "Home", href: "/" }, { name: `${s.short} in Goa`, href: pathname }],
    introBlock: { eyebrow: `${s.short} for Goa businesses`, h2: `Grow your Goa business with expert ${s.short.toLowerCase()}`, intro: `<p>${esc(s.intro)}</p><p>As Goa's award-winning agency since ${site.foundedYear}, ${site.brand} combines local market knowledge with proven digital expertise to deliver ${s.tagline.toLowerCase()}</p>`, image: serviceImg(s, 800) },
    painPoints: null,
    service: s,
    statLine: `Trusted by 100+ Goa businesses for ${s.short.toLowerCase()}.`,
    faqs,
    relatedTitle: `${s.short} across Goa — pick your area`,
    relatedPills: locPills,
    pageLabel: `${s.name} in Goa`,
    schema: [localBusinessSchema(), serviceSchema(s, "Goa"), faqSchema(faqs), breadcrumbSchema([{ name: "Home", href: "/" }, { name: `${s.short} in Goa`, href: pathname }])]
  }, 1);
}

// -- Wave 1b: Service x Location --
function genServiceLocation(s, l) {
  const file = `${s.slug}/${l.slug}.html`;
  const pathname = U.svcLoc(s, l);
  const otherLocs = locations.filter(x => x.slug !== l.slug).slice(0, 8).map(x => ({ href: U.svcLoc(s, x), label: `${s.short} in ${x.name}` }));
  const otherSvcs = services.filter(x => x.slug !== s.slug).map(x => ({ href: U.svcLoc(x, l), label: `${x.short} in ${l.name}` }));
  const faqs = [
    { q: `Do you provide ${s.short.toLowerCase()} in ${l.name}?`, a: `Yes. ${site.brand} serves businesses in ${l.name} and across ${l.region} with professional ${s.name.toLowerCase()}. ${l.localContext}` },
    { q: `Why does my ${l.name} business need ${s.short.toLowerCase()}?`, a: `${l.name} serves ${l.audience}. ${s.tagline} — helping you reach exactly these customers when they're searching.` }
  ].concat(s.faqs.slice(0, 2));
  renderLanding({
    file, pathname,
    title: `${s.name} in ${l.name}, Goa | ${site.brand}`,
    description: clampDesc(`${s.short} in ${l.name}, Goa by ${site.brand}. ${s.tagline} Trusted ${l.region} agency rated ${site.rating.value}/5. ${cta(pathname)}`),
    image: serviceImg(s, 1200).url,
    h1: `${s.name} in ${l.name}, Goa`,
    heroSub: `Professional ${s.name.toLowerCase()} for businesses in ${l.name}. ${s.tagline}`,
    breadcrumb: [{ name: "Home", href: "/" }, { name: `${s.short} in Goa`, href: U.pillar(s) }, { name: l.name, href: pathname }],
    introBlock: { eyebrow: `${s.short} in ${l.name}`, h2: `${s.short} tailored for ${l.name} businesses`, intro: `<p>${esc(l.localContext)}</p><p>${site.brand} delivers ${s.name.toLowerCase()} built around ${l.name}'s market — reaching ${l.audience}. ${esc(s.intro)}</p>`, image: serviceImg(s, 800) },
    painPoints: null,
    service: s,
    statLine: `${s.short} that gets ${l.name} businesses found by ${l.audience}.`,
    faqs,
    relatedTitle: `More in ${l.name} & nearby areas`,
    relatedPills: otherSvcs.concat(otherLocs).slice(0, 12),
    pageLabel: `${s.name} in ${l.name}`,
    schema: [localBusinessSchema(), serviceSchema(s, l.name + ", Goa"), faqSchema(faqs), breadcrumbSchema([{ name: "Home", href: "/" }, { name: `${s.short} in Goa`, href: U.pillar(s) }, { name: l.name, href: pathname }])]
  }, 1);
}

// -- Wave 1c: Location hub --
function genLocationHub(l) {
  const file = `locations/${l.slug}.html`;
  const pathname = U.locHub(l);
  const svcPills = services.map(s => ({ href: U.svcLoc(s, l), label: `${s.short} in ${l.name}` }));
  const faqs = [
    { q: `What digital marketing services does ${site.brand} offer in ${l.name}?`, a: `We offer ${services.map(s => s.short).join(", ")} to businesses in ${l.name}, ${l.region}.` },
    { q: `Do you understand the ${l.name} market?`, a: `${l.localContext}` }
  ];
  const html = [
    head({ pathname, title: `Digital Marketing in ${l.name}, Goa | ${site.brand}`, description: clampDesc(`Digital marketing in ${l.name}, Goa by ${site.brand} — web design, SEO, Google Ads & social media for ${l.name} businesses. Serving ${l.region}, rated ${site.rating.value}/5. ${cta(pathname)}`), image: img("goa-hero-2", 1200).url, schema: [localBusinessSchema(), faqSchema(faqs), breadcrumbSchema([{ name: "Home", href: "/" }, { name: l.name, href: pathname }])] }),
    header(), ratingBar(),
    heroBlock({ heroImage: img("goa-hero-2", 1600).url, breadcrumb: [{ name: "Home", href: "/" }, { name: l.name, href: pathname }], h1: `Digital Marketing in ${l.name}, Goa`, heroSub: `Web design, SEO, ads & social media for ${l.name} businesses. ${l.localContext}` }),
    `<section class="section"><div class="container"><div class="section-head"><p class="eyebrow">Our services in ${esc(l.name)}</p><h2>How we help ${esc(l.name)} businesses grow</h2><p class="lead">${esc(l.localContext)}</p></div><div class="grid grid-4">${services.map(s => `<a class="card-link" href="${U.svcLoc(s, l)}">${esc(s.short)} <span>→</span></a>`).join("")}</div></div></section>`,
    faqSection(faqs),
    relatedSection(`${l.name} services`, svcPills),
    contactSection(`Digital Marketing in ${l.name}`, null),
    floaties(), footer()
  ].join("\n");
  write(file, html); record(1, file);
}

// -- Wave 2a: Service x Industry --
function genServiceIndustry(s, ind) {
  const file = `${s.slug}/for-${ind.slug}.html`;
  const pathname = U.svcInd(s, ind);
  const otherInds = industries.filter(x => x.slug !== ind.slug).slice(0, 10).map(x => ({ href: U.svcInd(s, x), label: `${s.short} for ${x.name}` }));
  const otherSvcs = services.filter(x => x.slug !== s.slug).map(x => ({ href: U.svcInd(x, ind), label: `${x.short} for ${ind.name}` }));
  const pains = ind.painPoints.map(p => ({ h4: p, p: `A common challenge for ${ind.name.toLowerCase()} — and one ${s.short.toLowerCase()} directly addresses.` }));
  const faqs = [
    { q: `How does ${s.short.toLowerCase()} help ${ind.name.toLowerCase()}?`, a: `${ind.statLine} With ${s.name.toLowerCase()}, we focus on: ${ind.useCases.join("; ")}.` },
    { q: `Do you have experience with ${ind.name.toLowerCase()} in Goa?`, a: `Yes. ${site.brand} has worked with ${ind.name.toLowerCase()} across Goa since ${site.foundedYear}, tailoring ${s.short.toLowerCase()} to this industry's specific needs.` }
  ].concat(s.faqs.slice(0, 2));
  renderLanding({
    file, pathname,
    title: `${s.name} for ${ind.name} in Goa | ${site.brand}`,
    description: clampDesc(`${s.short} for ${ind.name} in Goa by ${site.brand}. ${ind.statLine} Rated ${site.rating.value}/5. ${cta(pathname)}`),
    image: industryImg(ind, 1200).url,
    h1: `${s.name} for ${ind.name}`,
    heroSub: `Specialised ${s.name.toLowerCase()} for ${ind.name.toLowerCase()} in Goa. ${ind.statLine}`,
    breadcrumb: [{ name: "Home", href: "/" }, { name: `${s.short} in Goa`, href: U.pillar(s) }, { name: `For ${ind.name}`, href: pathname }],
    introBlock: { eyebrow: `${s.short} for ${ind.name}`, h2: `Why ${ind.name.toLowerCase()} need specialised ${s.short.toLowerCase()}`, intro: `<p>${esc(ind.statLine)}</p><p>${site.brand} understands what makes ${ind.name.toLowerCase()} tick. We tailor our ${s.name.toLowerCase()} to your industry: ${esc(ind.useCases.join(", "))}.</p>`, image: industryImg(ind, 800) },
    painPoints: pains,
    painSubject: ind.name.toLowerCase(),
    service: s,
    statLine: ind.statLine,
    faqs,
    relatedTitle: `Related services for ${ind.name.toLowerCase()}`,
    relatedPills: otherSvcs.concat(otherInds).slice(0, 12),
    pageLabel: `${s.name} for ${ind.name}`,
    schema: [localBusinessSchema(), serviceSchema(s, "Goa"), faqSchema(faqs), breadcrumbSchema([{ name: "Home", href: "/" }, { name: `${s.short} in Goa`, href: U.pillar(s) }, { name: `For ${ind.name}`, href: pathname }])]
  }, 2);
}

// -- Wave 2b: Industry hub --
function genIndustryHub(ind) {
  const file = `industries/${ind.slug}.html`;
  const pathname = U.indHub(ind);
  const svcPills = services.map(s => ({ href: U.svcInd(s, ind), label: `${s.short} for ${ind.name}` }));
  const faqs = [
    { q: `What digital marketing do you offer for ${ind.name.toLowerCase()}?`, a: `We offer ${services.map(s => s.short).join(", ")} tailored for ${ind.name.toLowerCase()} in Goa.` },
    { q: `How do you help ${ind.name.toLowerCase()} grow?`, a: `${ind.statLine} We focus on ${ind.useCases.join("; ")}.` }
  ];
  const html = [
    head({ pathname, title: `Digital Marketing for ${ind.name} in Goa | ${site.brand}`, description: clampDesc(`Digital marketing for ${ind.name} in Goa by ${site.brand} — web design, SEO, ads & social media tailored to your industry. Rated ${site.rating.value}/5. ${cta(pathname)}`), image: industryImg(ind, 1200).url, schema: [localBusinessSchema(), faqSchema(faqs), breadcrumbSchema([{ name: "Home", href: "/" }, { name: ind.name, href: pathname }])] }),
    header(), ratingBar(),
    heroBlock({ heroImage: industryImg(ind, 1600).url, breadcrumb: [{ name: "Home", href: "/" }, { name: ind.name, href: pathname }], h1: `Digital Marketing for ${ind.name} in Goa`, heroSub: ind.statLine }),
    painSection(ind.painPoints.map(p => ({ h4: p, p: `A common hurdle for ${ind.name.toLowerCase()} that the right digital strategy solves.` })), ind.name.toLowerCase()),
    `<section class="section"><div class="container"><div class="section-head"><p class="eyebrow">Services for ${esc(ind.name)}</p><h2>Everything your ${esc(ind.singular)} needs online</h2></div><div class="grid grid-4">${services.map(s => `<a class="card-link" href="${U.svcInd(s, ind)}">${esc(s.short)} <span>→</span></a>`).join("")}</div></div></section>`,
    faqSection(faqs),
    relatedSection(`${ind.name} services`, svcPills),
    contactSection(`Digital Marketing for ${ind.name}`, null),
    floaties(), footer()
  ].join("\n");
  write(file, html); record(2, file);
}

// -- Wave 3: Service x Industry x Location (curated) --
function genTriple(s, ind, l) {
  const file = `${s.slug}/for-${ind.slug}/${l.slug}.html`;
  const pathname = U.triple(s, ind, l);
  const faqs = [
    { q: `Do you offer ${s.short.toLowerCase()} for ${ind.name.toLowerCase()} in ${l.name}?`, a: `Yes. ${site.brand} provides ${s.name.toLowerCase()} specifically for ${ind.name.toLowerCase()} in ${l.name}, ${l.region}. ${l.localContext}` },
    { q: `Why is this important for a ${ind.singular} in ${l.name}?`, a: `${l.name} attracts ${l.audience}. ${ind.statLine} ${s.tagline}` }
  ].concat(s.faqs.slice(0, 1));
  const relPills = [
    { href: U.svcInd(s, ind), label: `${s.short} for ${ind.name} (all Goa)` },
    { href: U.svcLoc(s, l), label: `${s.short} in ${l.name}` },
    { href: U.indHub(ind), label: `All services for ${ind.name}` },
    { href: U.locHub(l), label: `All services in ${l.name}` },
    { href: U.pillar(s), label: `${s.short} in Goa` }
  ];
  renderLanding({
    file, pathname,
    title: `${s.name} for ${ind.name} in ${l.name}, Goa | ${site.brand}`,
    description: clampDesc(`${s.short} for ${ind.name} in ${l.name}, Goa. ${ind.statLine} ${site.brand}, rated ${site.rating.value}/5. ${cta(pathname)}`),
    image: industryImg(ind, 1200).url,
    h1: `${s.name} for ${ind.name} in ${l.name}`,
    heroSub: `Specialised ${s.name.toLowerCase()} for ${ind.name.toLowerCase()} in ${l.name}. ${ind.statLine}`,
    breadcrumb: [{ name: "Home", href: "/" }, { name: `${s.short} in Goa`, href: U.pillar(s) }, { name: `For ${ind.name}`, href: U.svcInd(s, ind) }, { name: l.name, href: pathname }],
    introBlock: { eyebrow: `${s.short} · ${ind.name} · ${l.name}`, h2: `${s.short} for ${l.name}'s ${ind.name.toLowerCase()}`, intro: `<p>${esc(l.localContext)}</p><p>For ${ind.name.toLowerCase()} in ${l.name}, ${site.brand} tailors ${s.name.toLowerCase()} to reach ${l.audience}: ${esc(ind.useCases.join(", "))}.</p>`, image: industryImg(ind, 800) },
    painPoints: ind.painPoints.map(p => ({ h4: p, p: `A real challenge for ${ind.name.toLowerCase()} in ${l.name} — solved with focused ${s.short.toLowerCase()}.` })),
    painSubject: `${ind.name.toLowerCase()} in ${l.name}`,
    service: s,
    statLine: `${s.short} for ${l.name}'s ${ind.name.toLowerCase()}, done right.`,
    faqs,
    relatedTitle: `Related pages`,
    relatedPills: relPills,
    pageLabel: `${s.name} for ${ind.name} in ${l.name}`,
    schema: [localBusinessSchema(), serviceSchema(s, l.name + ", Goa"), faqSchema(faqs), breadcrumbSchema([{ name: "Home", href: "/" }, { name: `${s.short} in Goa`, href: U.pillar(s) }, { name: `For ${ind.name}`, href: U.svcInd(s, ind) }, { name: l.name, href: pathname }])]
  }, 3);
}

/* ---------- Home page ---------- */
function genHome() {
  const file = `index.html`;
  const faqs = [
    { q: `What does ${site.brand}.biz do?`, a: `${site.brand} is Goa's award-winning digital marketing agency. We help businesses across Goa grow with ${services.map(s => s.short).join(", ")}.` },
    { q: `Which areas of Goa do you serve?`, a: `We serve businesses across North and South Goa, including ${locations.map(l => l.name).join(", ")}.` },
    { q: `How much do your services cost?`, a: `Pricing depends on your needs. Web design starts from ${svcBy["web-design"].pricing.from} and SEO from ${svcBy["seo"].pricing.from}. Get a free custom quote.` }
  ];
  const chips = industries.map(ind => `<a class="chip" href="${U.indHub(ind)}">${esc(ind.name)}</a>`).join("");
  const testimonials = [
    { av: "SD", n: "Shreya Dutta", r: "Digital Marketing", q: "Highly recommend this agency to anyone looking for top-notch digital marketing in Goa. Skilled across SEO, social media and everything in between." },
    { av: "AH", n: "Ashutosh Hazare", r: "Digital Marketing", q: "Impressed with the team's professionalism and effectiveness. I highly recommend Sanctify to any company that needs help with digital marketing." },
    { av: "M", n: "Moin", r: "Branding", q: "Enthusiastic team, great for luxury brands. They quickly learn your business need and strategise the digital marketing accordingly." },
    { av: "PR", n: "Pawan Raj", r: "Web & Social", q: "We got our website built by Sanctify and are ongoing with their social media services. Very happy with the results — they respond with great patience." },
    { av: "TB", n: "TVS Bela Auto", r: "SEO client", q: "Quite happy with the Google visibility provided by Sanctify." },
    { av: "BN", n: "Benz Nx", r: "SEO & Social", q: "Their expertise in SEO and social media helped my business rank higher and attract more customers. Highly recommended in Goa!" }
  ];
  const wall = clients.wall.map(c => `<span class="logo-item"><span class="lb" style="background:${c.color}">${clientIcon(c.icon)}</span>${esc(c.name)}</span>`).join("");
  const clientGrid = clients.grid.map(c => `<div class="client"><div class="cicon" style="background:${c.color}">${clientIcon(c.icon)}</div><div><span class="cn">${esc(c.name)}</span><span class="tag">${esc(c.tag)}</span><div class="meta">📍 ${esc(c.location)}</div><div class="svc">${esc(c.service)}</div></div></div>`).join("");
  const featClock = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  const featChart = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19V5M4 19h16M8 16l3-4 3 2 4-6"/></svg>';
  const featStack = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5"/></svg>';
  const featSearch = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>';

  const html = [
    head({ pathname: "/", title: `${site.brand} — ${site.tagline} | Web Design, SEO & Ads in Goa`, description: clampDesc(`${site.brand} is Goa's award-winning digital marketing agency since ${site.foundedYear} — web design, SEO, Google Ads & social media that win local customers. Rated ${site.rating.value}/5. ${cta("/")}`), image: img("goa-hero-1", 1200).url, schema: [localBusinessSchema(), webSiteSchema(), faqSchema(faqs)] }),
    header(), ratingBar(),
    // Hero (aurora + rotating word)
    `<section class="hero hero-home">
      <div class="hero-photo" style="background-image:url('${img("goa-hero-1", 1600).url}')"></div>
      <span class="orb o1"></span><span class="orb o2"></span><span class="orb o3"></span>
      <div class="container">
        <div class="hero-badges">
          <span class="hero-badge"><span class="tick">★</span> ${site.rating.value}/5 · ${site.rating.count} reviews</span>
          <span class="hero-badge"><span class="tick">✓</span> Award-winning since ${site.foundedYear}</span>
          <span class="hero-badge"><span class="tick">✓</span> 100+ websites delivered</span>
        </div>
        <h1>Grow Your Goa Business<br><span class="rotator"><span class="rw" id="rw" data-words="Online|on Google|on Instagram|with Ads">Online</span></span></h1>
        <p>${esc(site.brand)} is Goa's award-winning digital marketing agency. From web design to SEO, Google Ads and social media — we help local businesses get found and win more customers.</p>
        <div class="hero-actions">
          <a class="btn btn-primary btn-lg" href="#contact">Get a Free Quote →</a>
          <a class="btn btn-outline btn-lg" href="tel:${site.phoneRaw}">📞 ${esc(site.phone)}</a>
        </div>
      </div>
    </section>`,
    // Glass stat strip (count-up)
    `<div class="statstrip"><div class="statstrip-inner">
      <div class="cell"><div class="n" data-count="13" data-suffix="+">0</div><div class="l">Years in Goa</div></div>
      <div class="cell"><div class="n" data-count="100" data-suffix="+">0</div><div class="l">Websites built</div></div>
      <div class="cell"><div class="n" data-count="1000" data-suffix="+">0</div><div class="l">Keywords on page 1</div></div>
      <div class="cell"><div class="n" data-count="${site.rating.value}" data-dec="1" data-suffix="★">0</div><div class="l">Across ${site.rating.count} reviews</div></div>
    </div></div>`,
    // Marquee (clickable → industry SEO pages)
    `<div class="marquee" style="margin-top:46px" role="navigation" aria-label="Industries we serve"><div class="marquee-track">${chips}${chips}</div></div>`,
    // Services
    `<section class="section" id="services"><div class="container">
      <div class="section-head"><p class="eyebrow">What we do</p><h2>Full-service digital marketing, under one roof</h2><p class="lead">Everything your business needs to grow online — strategy, build, and measurable results.</p></div>
      <div class="grid grid-4 tilt-wrap">${services.map(s => `<a class="card tilt" href="${U.pillar(s)}" style="text-decoration:none"><div class="ico">${svcIcon(s.slug)}</div><h3>${esc(s.short)}</h3><p style="color:var(--muted);font-size:.95rem">${esc(s.tagline)}</p><span class="more">Learn more →</span></a>`).join("")}</div>
    </div></section>`,
    // Why / bento
    `<section class="section section-soft" id="why"><div class="container">
      <div class="section-head"><p class="eyebrow">Why Sanctify</p><h2>Goa's market is our home turf</h2><p class="lead">13+ years, 100+ businesses, one dedicated Goa team — here's what sets us apart.</p></div>
      <div class="bento">
        <div class="b b-lg"><div><h3>Your growth partner in Goa since ${site.foundedYear}</h3><p>From beach shacks to five-star hotels, clinics to real estate — we pair global best-practice with deep local insight to win you more customers. Award-winning and rated ${site.rating.value}/5 by ${site.rating.count} clients.</p></div><a class="btn btn-primary" href="#contact" style="align-self:flex-start">Start your project →</a></div>
        <div class="b b-stat"><div class="n" data-count="${site.rating.value}" data-dec="1" data-suffix="★">0</div><div class="l">${site.rating.count} client reviews</div></div>
        <div class="b b-stat"><div class="n" data-count="100" data-suffix="+">0</div><div class="l">Websites delivered</div></div>
        <div class="b b-img" style="background-image:linear-gradient(transparent,rgba(6,26,21,.8)),url('${img("goa-hero-2", 1200).url}')"><b>North &amp; South Goa — fully covered</b></div>
        <div class="b b-feat"><span class="fi">${featClock}</span><b>13+ Years in Goa</b><span>Deep local-market knowledge of North &amp; South Goa buyers.</span></div>
        <div class="b b-feat"><span class="fi">${featChart}</span><b>Measurable ROI</b><span>Transparent analytics and clear monthly reporting.</span></div>
        <div class="b b-feat"><span class="fi">${featStack}</span><b>One Roof, Full Stack</b><span>Web, SEO, ads, social &amp; design in one team.</span></div>
        <div class="b b-feat"><span class="fi">${featSearch}</span><b>1000+ Keywords Ranked</b><span>Client pages on Google's first page.</span></div>
      </div>
    </div></section>`,
    // Clients
    `<section class="section" id="clients"><div class="container">
      <div class="section-head"><p class="eyebrow">Our clients</p><h2>Trusted by 100+ brands across Goa &amp; beyond</h2><p class="lead">From national names to loved local businesses — a snapshot of who we've helped grow.</p></div>
      <div class="logowall" style="margin-bottom:46px">${wall}</div>
      <div class="clients">${clientGrid}</div>
      <p class="center" style="margin-top:34px;color:var(--muted)">…and many more across hospitality, healthcare, education, retail &amp; automotive.</p>
    </div></section>`,
    // Process
    `<section class="section section-soft"><div class="container">
      <div class="section-head"><p class="eyebrow">How we work</p><h2>A simple, proven process</h2></div>
      <div class="steps">
        <div class="step"><div class="num">1</div><h4>Discovery</h4><p>We map your goals, customers and competitors.</p></div>
        <div class="step"><div class="num">2</div><h4>Strategy</h4><p>We build a plan around your key conversion goal.</p></div>
        <div class="step"><div class="num">3</div><h4>Execute</h4><p>We design, build, launch and optimise.</p></div>
        <div class="step"><div class="num">4</div><h4>Report</h4><p>We track rankings, traffic and leads every month.</p></div>
      </div>
    </div></section>`,
    // Testimonials carousel
    `<section class="section"><div class="container">
      <div class="thead"><div><p class="eyebrow">Loved by local businesses</p><h2>What our clients say</h2></div><div class="tnav"><button id="tprev" aria-label="Previous testimonial">‹</button><button id="tnext" aria-label="Next testimonial">›</button></div></div>
      <div class="tslider" id="tslider">${testimonials.map(t => `<div class="tcard"><div class="stars">★★★★★</div><p class="q">"${esc(t.q)}"</p><div class="who"><span class="av">${esc(t.av)}</span><div><b>${esc(t.n)}</b><small>${esc(t.r)}</small></div></div></div>`).join("")}</div>
    </div></section>`,
    // Locations
    `<section class="section section-soft"><div class="container"><div class="section-head"><p class="eyebrow">Where we work</p><h2>Serving businesses across Goa</h2></div><div class="pills" style="justify-content:center">${locations.map(l => `<a class="pill" href="${U.locHub(l)}">${esc(l.name)}</a>`).join("")}</div></div></section>`,
    faqSection(faqs),
    contactSection("Homepage", null),
    floaties(), footer()
  ].join("\n");
  write(file, html); record(1, file);
}

/* ---------- Image credits ---------- */
function genCredits() {
  const file = `image-credits.html`;
  const all = [...Object.values(images.heroes), ...Object.values(images.services), ...Object.values(images.industries)];
  const rows = all.map(r => `<li>Photo by <a href="${r.creditUrl}?utm_source=sanctify_biz&utm_medium=referral" rel="noopener">${esc(r.credit)}</a> on <a href="https://unsplash.com/?utm_source=sanctify_biz&utm_medium=referral" rel="noopener">Unsplash</a> — <em>${esc(r.alt)}</em></li>`).join("");
  const html = [
    head({ pathname: "/image-credits.html", title: `Image Credits | ${site.brand}`, description: `Photography credits for images used on ${site.brand}.biz, sourced from Unsplash.`, robots: "noindex,follow" }),
    header(),
    `<section class="section"><div class="container" style="max-width:820px"><h1>Image Credits</h1><p>Photography on this site is sourced from <a href="https://unsplash.com/?utm_source=sanctify_biz&utm_medium=referral" rel="noopener">Unsplash</a> under the Unsplash License. With thanks to the photographers:</p><ul class="ticklist" style="margin-top:16px">${rows}</ul></div></section>`,
    floaties(), footer()
  ].join("\n");
  write(file, html); record(1, file);
}

/* ---------- robots + sitemaps ---------- */
function genRobotsAndSitemaps() {
  const today = new Date().toISOString().slice(0, 10);
  const prio = u => {
    if (u === "/") return "1.0";
    if (/-in-goa\.html$/.test(u)) return "0.9";           // service pillars
    if (/^\/(locations|industries)\//.test(u)) return "0.7"; // hubs
    return "0.6";                                          // long-tail combos
  };
  const urlset = (urls) => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${site.baseUrl}${u}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>${prio(u)}</priority></url>`).join("\n")}\n</urlset>\n`;
  // Only real, indexable HTML pages belong in a sitemap — exclude assets (css/js/img),
  // robots.txt, the sitemaps themselves, and the noindex image-credits page.
  const toUrls = set => [...set]
    .filter(f => f.endsWith(".html") && !f.startsWith("assets/") && f !== "image-credits.html")
    .map(f => "/" + f.replace(/index\.html$/, "").replace(/\\/g, "/"))
    .sort();
  write("sitemap-wave1.xml", urlset(toUrls(waveFiles[1]))); record(1, "sitemap-wave1.xml");
  write("sitemap-wave2.xml", urlset(toUrls(waveFiles[2]))); record(2, "sitemap-wave2.xml");
  write("sitemap-wave3.xml", urlset(toUrls(waveFiles[3]))); record(3, "sitemap-wave3.xml");
  const robots = `User-agent: *\nAllow: /\n\nSitemap: ${site.baseUrl}/sitemap-wave1.xml\nSitemap: ${site.baseUrl}/sitemap-wave2.xml\nSitemap: ${site.baseUrl}/sitemap-wave3.xml\n`;
  write("robots.txt", robots); record(1, "robots.txt");
}

/* ---------- assets copy ---------- */
function copyAssets() {
  const src = path.join(ROOT, "src", "assets");
  copyDir(src, path.join(DIST, "assets"));
  // record every asset file (css, js, images) into Wave 1 so they ship in wave-1.zip
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else record(1, path.relative(DIST, p).replace(/\\/g, "/"));
    }
  })(path.join(DIST, "assets"));
}
function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, e.name), d = path.join(to, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}

/* ================= RUN ================= */
function run() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  // Wave 1
  genHome();
  services.forEach(genPillar);
  services.forEach(s => locations.forEach(l => genServiceLocation(s, l)));
  locations.forEach(genLocationHub);
  genCredits();

  // Wave 2
  services.forEach(s => industries.forEach(ind => genServiceIndustry(s, ind)));
  industries.forEach(genIndustryHub);

  // Wave 3 (curated)
  matrix.tier3.forEach(rule => {
    const s = svcBy[rule.service];
    rule.industries.forEach(iSlug => rule.locations.forEach(lSlug => {
      const ind = indBy[iSlug], l = locBy[lSlug];
      if (s && ind && l) genTriple(s, ind, l);
    }));
  });

  copyAssets();
  genRobotsAndSitemaps();

  // manifest of file lists per wave
  const manifest = {};
  [1, 2, 3].forEach(w => { manifest["wave" + w] = [...waveFiles[w]].sort(); });
  fs.writeFileSync(path.join(DIST, "_manifest.json"), JSON.stringify(manifest, null, 2));
  [1, 2, 3].forEach(w => fs.writeFileSync(path.join(DIST, `_wave${w}.txt`), [...waveFiles[w]].sort().join("\n") + "\n"));

  const counts = { wave1: waveFiles[1].size, wave2: waveFiles[2].size, wave3: waveFiles[3].size };
  console.log("Build complete:", JSON.stringify(counts));
  console.log("Total files:", counts.wave1 + counts.wave2 + counts.wave3);
}
run();
