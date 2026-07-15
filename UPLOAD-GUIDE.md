# Sanctify.biz — Phased Upload Guide

This repo generates a **Programmatic Local-SEO Landing Engine** for `sanctify.biz` as pure static HTML, packaged into **3 upload waves**. Upload them **in order, spaced a few weeks apart** — this is deliberate. Dumping hundreds of pages at once looks unnatural to Google; a phased rollout indexes cleanly and lets us learn what ranks before expanding.

All pages funnel branded leads and links to the main site, **https://www.sanctify.in**.

---

## What's in the box

| Package | Pages | What it contains |
|---------|:-----:|------------------|
| `packages/wave-1-foundation.zip` | **149 files** | Homepage, 8 service pillars (`{service}-in-goa`), **120 Service × Location** pages, 15 location hubs, shared CSS/JS, `robots.txt`, `sitemap-wave1.xml`, image credits |
| `packages/wave-2-industries.zip` | **136 files** | **120 Service × Industry** pages (`{service}/for-{industry}`), 15 industry hubs, `sitemap-wave2.xml` |
| `packages/wave-3-longtail.zip` | **49 files** | **48 curated Service × Industry × Location** long-tail pages, `sitemap-wave3.xml` |

**Total: 328 unique HTML pages** + assets. Every page is uniquely written (local context, industry pain points, tailored FAQs) — not thin duplicates.

---

## When to upload which zip

### 🟢 Wave 1 — Foundation (upload NOW)
1. Extract `wave-1-foundation.zip` into the **root** of `sanctify.biz` (files should sit at `/`, e.g. `sanctify.biz/web-design-in-goa.html`, `sanctify.biz/assets/...`). The zip already has the correct folder structure — just extract at the web root.
2. Verify a few live URLs load (e.g. `/`, `/web-design-in-goa.html`, `/seo/panjim.html`).
3. In **Google Search Console** (domain property for sanctify.biz), submit `sitemap-wave1.xml`.
4. **Wait ~3–4 weeks.** Watch Coverage/Indexing until most Wave 1 pages are indexed and getting impressions.

### 🟡 Wave 2 — Industries (upload after Wave 1 is indexed, ~3–4 weeks later)
> ✅ Only upload once Wave 1 shows healthy indexing. Wave 2 pages link "up" to Wave 1 pages, so Wave 1 must already be live.
1. Extract `wave-2-industries.zip` at the web root (merges alongside Wave 1 — nothing is overwritten).
2. Submit `sitemap-wave2.xml` in Search Console.
3. **Wait ~3–4 weeks** and monitor indexing again.

### 🟠 Wave 3 — Long-tail (upload after Wave 2 is indexed)
> ✅ Wave 3 links to both Wave 1 and Wave 2 pages, so upload it last.
1. Extract `wave-3-longtail.zip` at the web root.
2. Submit `sitemap-wave3.xml` in Search Console.
3. Monitor. After ~90 days, review any zero-impression pages for pruning/merging.

---

## Important notes

- **Deployment path:** Pages use **root-relative** links (`/assets/...`, `/seo/panjim.html`), so the site must be served from the **domain root** of `sanctify.biz`. Extract each zip at the web root.
- **Images:** All photos are **self-hosted** and bundled in Wave 1 under `/assets/img/` (25 images, ~3 MB, web-optimised JPEGs). No external image dependencies. Sourced from Unsplash under the Unsplash License; photographer attribution is on `/image-credits.html`.
- **Phone / WhatsApp / email** are wired to `+91-9923352923` and `help@sanctify.in` throughout. Update in `data/site.json` and rebuild if these change.

### ✅ Setup before Wave 1 goes live (2 values to paste)

Everything is already wired — you only need to drop two values into **`data/site.json`** and run `npm run package`.

**1. Google Analytics 4 (GA4)**
- Create a GA4 property at [analytics.google.com] → copy your **Measurement ID** (looks like `G-XXXXXXXXXX`).
- Put it in `data/site.json`:
  ```json
  "ga4Id": "G-XXXXXXXXXX"
  ```
- On rebuild, the GA4 tag is injected into every page **with cross-domain tracking to sanctify.in already configured** (linker domains: sanctify.biz + sanctify.in). A `generate_lead` event also fires on form submits. If left empty, no tag is added (just an HTML comment).

**2. Lead form endpoint (automatic lead capture)**
- The form works out-of-the-box via `mailto:` (opens the visitor's email app) if you set nothing.
- For **automatic capture**, use a no-backend form service and paste its URL:
  - **Web3Forms** (free): sign up → get an access key. Set:
    ```json
    "formEndpoint": "https://api.web3forms.com/submit",
    "formAccessKey": "your-web3forms-access-key"
    ```
  - **Formspree** (alternative): set `"formEndpoint": "https://formspree.io/f/yourid"` (leave `formAccessKey` empty).
  - **Your own CRM:** set `formEndpoint` to any URL that accepts a `multipart/form-data` POST.
- On submit, leads POST via `fetch()` with a success message; no page reload. Falls back to `mailto:` automatically if the endpoint is empty.

**3. Google Search Console (GSC)** — no code needed
- Create a **Domain property** for `sanctify.biz`, verify via DNS TXT record, then submit each wave's sitemap when you upload it (see wave steps above).

After editing `data/site.json`, run:
```bash
npm run package   # rebuilds dist/ and repackages the 3 wave zips with your IDs baked in
```

---

## Rebuilding / editing content

Everything is generated from JSON data — no page is hand-edited.

```bash
# one-time: uses Node 18+ (no dependencies)
npm run build      # regenerates dist/
npm run package    # rebuilds dist/ AND repackages the 3 wave zips
```

Edit content in:
- `data/site.json` — brand, phone, address, ratings, USPs
- `data/services.json` — the 8 services (copy, deliverables, pricing, FAQs)
- `data/industries.json` — 15 industries (pain points, use cases)
- `data/locations.json` — 15 Goa areas (local context)
- `data/matrix.json` — which Wave 3 long-tail combos to generate
- `data/images.json` — image mappings + attribution

---

## SEO guardrails (why this won't get penalised)

- **Unique content per page** — real local context, industry-specific pain points, tailored FAQs. No thin/spun duplicates.
- **Curated Wave 3** — we deliberately do NOT generate all 1,800 combinations, only ~48 high-value ones, to avoid doorway-page risk.
- **Branded, varied anchors** to `sanctify.in` — no exact-match keyword stuffing (avoids link-scheme footprints).
- **Phased indexing** — waves + separate sitemaps = natural rollout.
- **Full schema** — ProfessionalService, Service, FAQPage, BreadcrumbList on every page.
