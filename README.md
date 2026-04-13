# Medrelief

> AI-first LIMS for diagnostic labs. Point the camera at a prescription → AI extracts the details → staff verify → bill, accession, report. Under 2 minutes.

🌐 **Landing page:** https://khalidnoshtek.github.io/medrelief/

## Monorepo layout

```
packages/
  backend/      # Express + TypeScript + Prisma + Neon PostgreSQL (port 4782)
  frontend-v2/  # React 19 + Vite + Tailwind 4 PWA (mobile-first kiosk UI, port 5174)
website/        # Public landing page (GitHub Pages deploys from here)
docs/           # Stakeholder briefs, architecture docs, flow PDFs
```

## Tech stack

| Layer | Choice |
|---|---|
| Backend | Express + TypeScript + Prisma ORM |
| Frontend | React 19 + Vite + Tailwind 4 + Zustand + TanStack Query |
| Database | Neon PostgreSQL (cloud) |
| AI | Anthropic Claude Vision (prescription OCR + structured extraction) |
| Voice | Browser Web Speech API (bilingual: Hindi / English) |
| QR | `qrcode` (gen) + `html5-qrcode` (scan) |
| PDF | `pdfkit` for reports, receipts, barcode labels |
| Email | Nodemailer + Ethereal (dev) |

## Quick start

```bash
# Install all workspaces
npm install

# Backend (port 4782)
cp packages/backend/.env.example packages/backend/.env
# Edit .env — add DATABASE_URL and ANTHROPIC_API_KEY
cd packages/backend
npx prisma migrate dev
npx tsx prisma/seed.ts
npx tsx prisma/seed-new-doctors.ts
npm run dev

# Frontend-v2 (port 5174) — in a second terminal
cd packages/frontend-v2
npm run dev
```

Open http://localhost:5174 and log in with any demo credential below.

## Demo credentials

| Username | Role | Password |
|---|---|---|
| receptionist1 | Receptionist | demo123 |
| labtech1 | Lab Technician | demo123 |
| pathologist1 | Pathologist | demo123 |
| centerhead1 | Center Head | demo123 |
| finance1 | Finance Manager | demo123 |
| admin1 | System Admin | demo123 |

## Key flows

1. **New Visit** — Camera → AI verification card → test selection → payment → QR receipt. Under 2 minutes.
2. **Lab Worklist** — collect/receive samples → enter results (with voice) → pathologist signs off → report auto-generates.
3. **Status** — search by patient mobile, doctor name, or **scan a bill's QR code** from the receipt.
4. **Dashboard** — real-time revenue, lab TAT, pending approvals.
5. **Daily Close** — freezes the day's bills and produces a summary.

## AI extraction

Prescription OCR is provider-agnostic. Switch via env:

```bash
EXTRACTION_PROVIDER=mock       # free, canned data (default)
EXTRACTION_PROVIDER=claude     # real Claude Vision (needs ANTHROPIC_API_KEY)
ANTHROPIC_MODEL=claude-haiku-4-5  # optional override
```

Cost with Claude Haiku: ~₹0.08 per prescription. First $5 of credits is free on Anthropic signup (~5,000 scans).

## Deployment

- **Landing page** (`website/`): auto-deploys to GitHub Pages via `.github/workflows/pages.yml` on every push to `main`
- **Frontend-v2 PWA**: deploy to Vercel / Netlify for HTTPS camera access on phones
- **Backend**: deploy to Railway / Render / Fly.io — needs `DATABASE_URL` + `ANTHROPIC_API_KEY`

## Docs

- [`docs/Medrelief-Prototype-2.0-Stakeholder-Brief.docx`](docs/Medrelief-Prototype-2.0-Stakeholder-Brief.docx) — product brief
- [`docs/Medrelief-Flow-Document.pdf`](docs/Medrelief-Flow-Document.pdf) — visual flow document
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — technical architecture
- [`docs/LIMS-FLOWS.md`](docs/LIMS-FLOWS.md) — core business flows

## License

Proprietary. © 2026 Medrelief Diagnostics.
