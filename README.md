# JobSeeking — LinkedIn Job-Market Analytics (Jawa Timur)

Scrape LinkedIn job postings for developer roles across Jawa Timur, parse them
into structured data (skills, salary, location, seniority), store in Postgres,
and explore the result in a Next.js analytics dashboard.

> Scraping LinkedIn is against its Terms of Service and job posts may contain
> personal data (recruiter names/emails). Use this for internal analysis only
> and do not redistribute raw dumps.

## Stack

| Layer     | Tech                                              |
|-----------|---------------------------------------------------|
| Scraper   | Python 3.11+, Playwright, residential proxy, CapSolver |
| Storage   | PostgreSQL 16 (docker-compose)                    |
| API       | FastAPI + SQLAlchemy 2.0                          |
| Dashboard | Next.js + shadcn/ui + Recharts                    |

## Layout

```
.
├── docker-compose.yml        # Postgres (+ optional pgAdmin)
├── .env.example              # copy to .env and fill in
├── backend/                  # Python scraper + API
│   ├── config.yaml           # keyword x location search matrix
│   └── src/jobseeking/
│       ├── config.py         # settings + crawl config
│       ├── db.py             # engine / session / Base
│       ├── models.py         # ORM models
│       ├── proxy.py          # proxy pool + rotation
│       ├── captcha.py        # CapSolver client
│       ├── fetch.py          # Playwright fetcher
│       ├── search.py         # search-result crawler
│       ├── detail.py         # job-detail crawler
│       ├── parse/            # skill / salary / seniority / location parsers
│       ├── normalize.py      # canonicalization helpers
│       ├── store.py          # upsert + dedup
│       ├── pipeline.py       # batch CLI orchestrator
│       └── api/              # FastAPI read API
└── web/                      # Next.js dashboard
```

## Quick start

```bash
cp .env.example .env          # then edit PROXY_FILE/PROXY_URLS and CAPSOLVER_API_KEY
docker compose up -d db       # start Postgres (host port 5433)

cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -e ".[dev]"
playwright install chromium

python -m jobseeking.pipeline --init-db
python -m jobseeking.pipeline --location "Jawa Timur, Indonesia" --max-pages 3
```

Configuration notes:

- Postgres is mapped to host port **5433** (default) to avoid clashing with a local
  PostgreSQL on 5432. Override with `POSTGRES_PORT`.
- Proxy credentials live in a gitignored file. Set `PROXY_FILE` to a file with one proxy
  per line (`host:port:user:pass` or `http://user:pass@host:port`). Never commit it.
- `CAPSOLVER_API_KEY` enables captcha solving; without it the fetcher still retries.

## Tests

```bash
cd backend
pytest -q
```

## Batch scraping

```bash
# full matrix from config.yaml
python -m jobseeking.pipeline

# one-shot overrides
python -m jobseeking.pipeline --keyword "backend developer" --location "Surabaya, Jawa Timur, Indonesia" --max-pages 5

# re-parse from saved raw HTML (no network)
python -m jobseeking.pipeline --replay-raw
```

## API

```bash
jobseeking-api                 # or: python -m jobseeking.api.main
```

Endpoints: `/jobs`, `/stats/overview`, `/stats/skills`, `/stats/companies`,
`/stats/salary`, `/stats/trend`, `/export.csv`.

## Dashboard

```bash
cd web
npm install
npm run dev                    # http://localhost:3000
```

Set `NEXT_PUBLIC_API_BASE` (default `http://localhost:8000`).
