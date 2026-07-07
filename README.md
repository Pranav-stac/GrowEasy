# GrowEasy AI CSV Importer

**Position Applied For:** Software Developer Intern  
**Author:** Pranav

An AI-powered CSV importer that maps arbitrary CSV formats into GrowEasy CRM lead records. The challenge is not parsing CSV — it is intelligently mapping different column names, layouts, and structures using AI.

## How It Works

1. **Upload** any valid CSV (drag & drop or file picker)
2. **Preview** raw rows locally — no AI processing yet
3. **Confirm Import** — Gemini reads headers + first 2 rows to detect column mapping, then extracts all records in batches
4. **View Results** — imported records, skipped rows, totals

Supported sources: Facebook Lead Export, Google Ads Export, Excel (.xlsx/.xls), CSV, TSV, sales reports, real estate CRMs, and manually created spreadsheets.

## Tech Stack

| Layer | Technology |
|-------|-------------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| AI | Google Gemini API |
| CSV | csv-parse (server), client parser (browser) |
| Tests | Vitest |

## Setup

### Prerequisites
- Node.js 20+
- Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

### Install

```bash
npm run install:all
```

### Environment

**Backend** (`backend/.env`):
```env
PORT=4000
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash
BATCH_SIZE=12
MAX_RETRIES=3
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Run

```bash
npm run dev
```

- Frontend: http://localhost:3001/lead-sources
- Backend: http://localhost:4000/health

### Test

```bash
npm test
```

## Sample CSV Files

Download from the Lead Sources page or use files in `samples/`:

| File | Format |
|------|--------|
| `facebook_leads_export.csv` | Facebook Lead Ads |
| `google_ads_export.csv` | Google Ads conversions |
| `real_estate_crm_export.csv` | Real estate CRM |
| `sales_report.csv` | Marketing / sales report |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/import/extract` | AI field extraction |
| POST | `/api/import/extract/stream` | Streaming with progress (SSE) |
| POST | `/api/import/preview` | Server-side CSV preview |
| GET | `/api/import/template` | GrowEasy CRM template CSV |
| GET | `/health` | Health check |

## CRM Fields Extracted

`created_at`, `name`, `email`, `country_code`, `mobile_without_country_code`, `company`, `city`, `state`, `country`, `lead_owner`, `crm_status`, `crm_note`, `data_source`, `possession_time`, `description`

## Docker

```bash
GEMINI_API_KEY=your_key docker-compose up --build
```

## Project Structure

```
GrowEasy/
├── backend/src/services/
│   ├── aiExtraction.ts   # Gemini batch extraction
│   └── prompts.ts        # Format-specific mapping prompts
├── frontend/src/
│   ├── components/       # Import modal, tables, sidebar
│   └── app/              # Lead Sources, Manage Leads pages
└── samples/              # Test CSV files
```
