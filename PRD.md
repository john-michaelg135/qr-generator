# PRD: QR Code Generator API

**Document Version:** 1.0
**Author:** Engineering Team
**Status:** Draft
**Last Updated:** 2026-08-24
**Target Platform:** Vercel (Serverless Functions + Static Hosting)

---

## 1. Overview

### 1.1 Product Summary
A lightweight, stateless QR Code Generator API that accepts text or URL input via HTTP (GET/POST) and returns a rendered QR code image. The service is deployed as a Vercel Serverless Function and paired with a minimal HTML frontend hosted on Vercel's static hosting.

### 1.2 Problem Statement
Developers, designers, and end-users frequently need QR codes for URLs, Wi-Fi credentials, vCards, payment links, and other payloads. Existing public generators often impose ads, rate limits, branding, or require account creation. A minimal, fast, dependency-light, and free-to-host alternative is desirable for both personal use and integration into other products.

### 1.3 Goals & Objectives
| # | Goal | Measurable Outcome |
|---|------|--------------------|
| G1 | Deliver a working QR code API in < 1 week | API deployed and responding in production |
| G2 | Sub-second image generation for typical payloads | p95 latency < 800ms |
| G3 | Zero infrastructure maintenance | Fully serverless, no DB, no cron |
| G4 | Provide a usable frontend for non-technical users | HTML page that consumes the API |
| G5 | Stay within Vercel's free/hobby tier limits | < 10s execution, < 4MB response |

### 1.4 Non-Goals (v1)
- User accounts, authentication, or usage tracking
- Persistent storage of generated codes
- Analytics, A/B testing, or click tracking
- Custom logo embedding or advanced styling (deferred to v2)
- Mobile native apps

---

## 2. Target Users

| Persona | Description | Primary Use Case |
|---------|-------------|------------------|
| **Developer (Dev)** | Integrates QR generation into their own product via API | Programmatic QR creation from CI/CD, emails, invoices |
| **Power User (PU)** | Comfortable with URLs, wants quick QR codes | Paste URL → get QR → download PNG |
| **Casual User (CU)** | Non-technical, uses the frontend | Generate a QR for a Wi-Fi password or event link |

---

## 3. Functional Requirements

### 3.1 API Endpoints

#### `GET /api/generate`
Returns a QR code image for the given query parameters.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `data` | string | ✅ | — | Text or URL to encode |
| `size` | integer | ❌ | `300` | Image width/height in pixels (min 100, max 1000) |
| `format` | string | ❌ | `png` | Output format: `png`, `svg`, `jpeg` |
| `error_correction` | string | ❌ | `M` | `L` (7%), `M` (15%), `Q` (25%), `H` (30%) |
| `border` | integer | ❌ | `4` | Quiet zone width in modules (min 0, max 10) |
| `fill_color` | string | ❌ | `#000000` | Foreground color (hex) |
| `back_color` | string | ❌ | `#FFFFFF` | Background color (hex) |

**Example request:**
```
GET /api/generate?data=https://example.com&size=400&format=png
```

**Response:**
- `200 OK` — Image binary with `Content-Type: image/png` (or `image/svg+xml`, `image/jpeg`)
- `400 Bad Request` — Missing `data`, invalid size, unsupported format
- `413 Payload Too Large` — Input exceeds encoding capacity for chosen error correction
- `500 Internal Server Error` — Unexpected failure

#### `POST /api/generate`
Same behavior as GET but accepts a JSON body:
```json
{
  "data": "https://example.com",
  "size": 400,
  "format": "png",
  "error_correction": "M",
  "border": 4,
  "fill_color": "#000000",
  "back_color": "#FFFFFF"
}
```
`Content-Type: application/json` required. `data` field is mandatory.

#### `GET /`
Serves the static HTML frontend from Vercel's static hosting.

#### `GET /health`
Returns `200 OK` with `{"status": "ok"}` for uptime monitoring.

### 3.2 Frontend Requirements

A single-page, responsive HTML interface (`public/index.html`) that:

1. Provides an input field for the text/URL.
2. Offers dropdowns/inputs for size, format, error correction, border, and colors.
3. Displays a live preview of the generated QR code.
4. Provides a **Download** button that saves the image locally.
5. Provides a **Copy Link** button that copies the direct API URL to the clipboard.
6. Shows client-side validation errors (empty input, invalid hex color, out-of-range size).
7. Works without JavaScript for the basic case (progressive enhancement via `<img src="/api/generate?data=...">`).

**Design constraints:**
- No external frameworks (vanilla HTML/CSS/JS) to keep bundle size near zero.
- Mobile-first responsive layout.
- Accessible (WCAG 2.1 AA): proper labels, ARIA attributes, keyboard navigation.
- Dark/light mode via `prefers-color-scheme`.

---

## 4. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | p95 response time < 800ms for payloads < 2KB |
| **Availability** | Leverage Vercel's global edge; target 99.9% monthly uptime |
| **Security** | Input sanitization; reject payloads > 4KB; rate limit via Vercel (e.g., 60 req/min/IP) |
| **Scalability** | Stateless by design — scales horizontally via Vercel's serverless infra |
| **Compatibility** | API returns standard image MIME types; works in all modern browsers |
| **Observability** | Vercel Logs for request traces; `/health` endpoint for external monitors |
| **Cost** | Target $0/month on Vercel Hobby tier for moderate traffic |
| **Timeout** | All executions must complete within Vercel's 10s serverless limit |

---

## 5. Technical Architecture

```
┌─────────────────┐         ┌──────────────────────────────┐
│  Browser /      │  HTTPS  │         Vercel Edge          │
│  HTTP Client    │ ──────▶ │  ┌────────────────────────┐  │
│                 │         │  │  Static Hosting (/)    │  │
│                 │         │  │  index.html, css, js   │  │
│                 │         │  └────────────────────────┘  │
│                 │         │  ┌────────────────────────┐  │
│                 │         │  │  Serverless Function   │  │
│                 │         │  │  /api/generate         │  │
│                 │         │  │  /api/health           │  │
│                 │         │  │                        │  │
│                 │         │  │  Python (FastAPI via   │  │
│                 │         │  │  @vercel/python rt)    │  │
│                 │         │  │                        │  │
│                 │         │  │  libs: fastapi,        │  │
│                 │         │  │  qrcode, Pillow, io    │  │
│                 │         │  └────────────────────────┘  │
└─────────────────┘         └──────────────────────────────┘
```

### 5.1 Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Python 3.9+ on Vercel Serverless |
| Web Framework | FastAPI (via Mangum adapter for serverless) |
| QR Library | `qrcode[pil]` (wraps Pillow) |
| Image Processing | Pillow |
| Frontend | Vanilla HTML5 + CSS3 + ES6 JavaScript |
| Deployment | Vercel CLI / GitHub integration |
| Repo Structure | See §5.2 |

### 5.2 Repository Structure

```
qr-code-api/
├── api/
│   ├── generate.py        # FastAPI app + QR logic
│   └── health.py          # Health check endpoint
├── public/
│   ├── index.html         # Frontend
│   ├── style.css          # Styles
│   └── script.js          # Frontend logic
├── requirements.txt       # fastapi, qrcode[pil], Pillow, mangum
├── vercel.json            # Routes + runtime config
├── README.md
└── PRD.md                 # This document
```

### 5.3 `vercel.json` (draft)

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" }
  ],
  "functions": {
    "api/generate.py": {
      "runtime": "@vercel/python@4.x",
      "maxDuration": 10
    }
  }
}
```

### 5.4 `requirements.txt`

```
fastapi==0.115.*
mangum==0.19.*
qrcode[pil]==7.4.*
Pillow==10.4.*
```

---

## 6. API Contract Examples

### 6.1 Minimal GET
```
GET /api/generate?data=Hello
→ 200, image/png, 300×300 px
```

### 6.2 Styled PNG via POST
```
POST /api/generate
Content-Type: application/json

{
  "data": "wifi:T:WPA;S:MyNet;P:secret;;",
  "size": 500,
  "format": "png",
  "fill_color": "#1a73e8",
  "back_color": "#ffffff"
}
→ 200, image/png, 500×500 px, blue-on-white
```

### 6.3 SVG Output
```
GET /api/generate?data=mailto:hi@example.com&format=svg
→ 200, image/svg+xml
```

### 6.4 Error Cases
```
GET /api/generate
→ 400 { "detail": "Missing required parameter: data" }

GET /api/generate?data=foo&size=50
→ 400 { "detail": "size must be between 100 and 1000" }

GET /api/generate?data=foo&format=bmp
→ 400 { "detail": "Unsupported format: bmp" }
```

---

## 7. UX Wireframe (Frontend)

```
┌──────────────────────────────────────────────┐
│  🔳 QR Code Generator            [☀/🌑]     │
├──────────────────────────────────────────────┤
│                                              │
│  Text or URL                                 │
│  ┌──────────────────────────────────────┐   │
│  │ https://example.com                  │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  Size: [300 ▾]   Format: [PNG ▾]            │
│  Error Correction: [M ▾]   Border: [4]      │
│  Foreground: [#000000]  Background: [#FFF]  │
│                                              │
│  ┌──────────────┐   [ Download PNG ]         │
│  │              │   [ Copy API Link ]        │
│  │   [QR CODE]  │                            │
│  │              │                            │
│  └──────────────┘                            │
│                                              │
│  Direct link: https://.../api/generate?...   │
└──────────────────────────────────────────────┘
```

---

## 8. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| API latency (p95) | < 800ms | Vercel Analytics |
| Error rate | < 0.5% | Vercel Logs |
| Frontend Lighthouse score | > 95 | Lighthouse CI |
| Monthly active users | 500+ in first 3 months | Vercel Analytics |
| Time to first deploy | < 1 week | Project tracker |

---

## 9. Milestones & Timeline

| Week | Milestone | Deliverable |
|------|-----------|-------------|
| W1 | Core API | `generate.py` working locally with tests |
| W1 | Deployment | Live on Vercel, `/api/generate` reachable |
| W2 | Frontend | `index.html` consuming the API |
| W2 | Polish | Validation, dark mode, responsive layout |
| W2 | Launch | README, `/health`, basic rate limiting |
| W3+ | Iteration | v2 features (see §10) based on feedback |

---

## 10. Future Enhancements (v2+)

- 🎨 **Logo embedding** — upload a center logo for branded QR codes
- 📊 **Analytics** — track scans via redirect-based QR codes
- 🎭 **Styles** — rounded modules, gradients, dot patterns
- 📦 **Batch generation** — upload CSV → zip of QR codes
- 🔐 **Authentication** — API keys for higher rate limits
- 🌍 **i18n** — multi-language frontend
- 📱 **PWA** — installable offline-capable frontend
- 🧩 **SDKs** — npm / pip / Go client libraries

---

## 11. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Vercel cold start adds latency | Poor UX on first request | Medium | Use `maxDuration` + keep function warm via `/health` ping |
| Malicious payloads (huge text, XSS in SVG) | Security / DoS | Medium | Cap input at 4KB; sanitize SVG output; rate limit |
| Vercel free tier limits hit | Service degradation | Low | Monitor usage; document upgrade path to Pro |
| `qrcode` library vulnerabilities | Security | Low | Dependabot alerts; pin versions; audit quarterly |
| Browser caching serves stale QRs | Wrong image shown | Low | Add `Cache-Control: public, max-age=31536000, immutable` keyed on query hash |

---

## 12. Open Questions

1. Should we support **Wi-Fi**, **vCard**, and **email** structured input helpers on the frontend, or keep the API strictly generic?
2. Do we want a **favicon/OG image** for link previews when the frontend URL is shared?
3. Should rate limiting be enforced at the Vercel edge (via middleware) or inside the function?
4. Is SVG output a v1 requirement, or can it ship in v1.1?

---

## 13. Appendix

### A. QR Code Error Correction Reference
| Level | Recovery Capacity | Use Case |
|-------|-------------------|----------|
| L | ~7% | Clean, high-contrast environments |
| M | ~15% | General purpose (default) |
| Q | ~25% | Slightly damaged / partially obscured |
| H | ~30% | Logo overlay, harsh environments |

### B. Sample `curl` Tests
```bash
# Basic
curl -o qr.png "https://your-project.vercel.app/api/generate?data=hello"

# Styled
curl -X POST https://your-project.vercel.app/api/generate \
  -H "Content-Type: application/json" \
  -d '{"data":"hello","size":500,"fill_color":"#ff5722"}' -o qr.png

# Health
curl https://your-project.vercel.app/api/health
```

### C. References
- [Vercel Python Runtime docs](https://vercel.com/docs/functions/runtimes/python)
- [FastAPI + Mangum adapter](https://github.com/jordaneremieff/mangum)
- [qrcode Python library](https://github.com/lincolnloop/python-qrcode)
- [Pillow docs](https://pillow.readthedocs.io/)

---

**End of Document**