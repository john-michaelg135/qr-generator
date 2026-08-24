# QR Generator

A stateless QR code generation API with a minimal, dark-themed frontend. No accounts, no tracking, no ads. Deployed on Vercel serverless.

## Structure

```
qr-app/
├── api/
│   ├── __init__.py        # Package marker
│   ├── generate.py        # QR generation endpoint (GET + POST)
│   └── health.py          # Health check → {"status": "ok"}
├── public/
│   ├── index.html         # Frontend
│   ├── style.css          # Dark sci-fi UI
│   └── script.js          # Client logic (validation, preview, download)
├── dev.py                 # Local dev server (API + static on one port)
├── requirements.txt       # Python deps
├── vercel.json            # Vercel routing and runtime config
├── .gitignore
├── PRD.md                 # Product requirements
└── README.md
```

## Local Development

Install dependencies:

```bash
pip install -r requirements.txt
```

Run the dev server (serves both the API and frontend on port 3000):

```bash
python dev.py
```

Open http://localhost:3000.

## API

**GET** `/api/generate`

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| data | string | (required) | Text or URL to encode |
| size | int | 300 | Width/height in px (100-1000) |
| format | string | png | png, svg, jpeg |
| error_correction | string | M | L, M, Q, H |
| border | int | 4 | Quiet zone modules (0-10) |
| fill_color | string | #000000 | Foreground hex color |
| back_color | string | #FFFFFF | Background hex color |

Returns the image with appropriate `Content-Type`. Errors return JSON with a `detail` field.

**POST** `/api/generate` accepts the same params as a JSON body.

**GET** `/api/health` returns `{"status": "ok"}`.

Examples:

```bash
# Basic
curl -o qr.png "http://localhost:3000/api/generate?data=hello"

# Styled
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"data":"https://example.com","size":500,"fill_color":"#1a73e8"}' \
  -o qr.png
```

## Deploying to Vercel

Push to a connected GitHub repo, or deploy manually:

```bash
npx vercel
```

The `vercel.json` handles routing. No additional configuration needed.

## Tech Stack

- **Runtime:** Python 3.9+ on Vercel Serverless
- **Framework:** FastAPI + Mangum
- **QR Library:** qrcode[pil] + Pillow
- **Frontend:** Vanilla HTML/CSS/JS (zero external frameworks)
