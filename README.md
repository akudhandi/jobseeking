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

## Deploy (instabox + Cloudflare Tunnel)

Tidak ada IP publik dan tidak ada port 80/443 di box, jadi TLS + auth
diselesaikan Cloudflare dan origin-nya cuma HTTP di loopback:

```
Cloudflare Access (OTP email)
  jobs.sengganglabs.my.id
        |
        +-- Cloudflare Tunnel "cf-tunnel" (pm2, sudah jalan di box)
              -> http://localhost:18080
                   |
                caddy:80 (container, tanpa TLS)
                   |-- /api/* -> api:8000   (FastAPI, prefix dibuang)
                   +-- /*     -> web:3000   (Next.js standalone, force-dynamic)
                                 db (internal-only)
                                 scraper (on-demand + cron, proxy residensial)
```

### 1. Prasyarat di box
Debian dengan Docker + Compose, user di grup `docker`. Port `18080` harus kosong
(8080 sudah dipakai proses `keepalive`).

Docker data-root dipindah ke `/data` supaya build tidak menekan root disk:
```bash
sudo mkdir -p /data/docker
echo '{"data-root":"/data/docker"}' | sudo tee /etc/docker/daemon.json
sudo systemctl restart docker
```

### 2. Ambil kode
```bash
sudo mkdir -p /data/jobseeking && sudo chown "$USER":"$USER" /data/jobseeking
git clone https://github.com/akudhandi/jobseeking.git /data/jobseeking
cd /data/jobseeking
```

### 3. Konfigurasi
```bash
cp deploy/.env.prod.example .env.prod
chmod 600 .env.prod
# isi POSTGRES_PASSWORD (acak) dan CAPSOLVER_API_KEY

mkdir -p secrets && chmod 700 secrets
# scp daftar proxy (host:port:user:pass) ke secrets/proxies.txt, lalu:
chmod 600 secrets/proxies.txt
```

### 4. Jalankan
```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
```

Caddy hanya listen di `127.0.0.1:18080`. Verifikasi dari dalam box:
```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:18080/api/health
```

### 5. Cloudflare (dashboard, bukan file)
Zero Trust -> Networks -> Tunnels -> tunnel `cf-tunnel` -> Public Hostname -> Add:
```
Subdomain: jobs        Domain: sengganglabs.my.id
Service:   HTTP  ->  localhost:18080
```
Lalu Zero Trust -> Access -> Applications -> Add self-hosted untuk
`jobs.sengganglabs.my.id`, policy `Allow` + `Emails` (email kamu).
Aktifkan Access **sebelum** hostname, kalau tidak dashboard jadi publik.

### 6. Scrape pertama
```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml run --rm scraper --max-pages 3
```

### 7. Cron
```bash
chmod +x deploy/cron/*.sh
crontab deploy/cron/crontab.example
```
`scrape.sh` dijalankan tiap 30 menit tapi hanya benar-benar scrape kalau run
terakhir > 20 jam (`MIN_INTERVAL`). Jadi kalau box sedang suspend saat jadwal,
tick berikutnya menyusul. `MIN_INTERVAL=0 ./scrape.sh` untuk memaksa.

### Update
```bash
cd /data/jobseeking
git pull && docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

### Ukuran image
| image | size | catatan |
|---|---|---|
| api | ~555 MB | selalu jalan |
| web | ~325 MB | selalu jalan |
| scraper | ~2.1 GB | hanya saat scrape |

Butuh ~8 GB kosong di `/data` (image + build cache). `deploy/cron/prune.sh`
mingguan: gzip `data/raw` (>1 hari), hapus arsip (>7 hari), prune docker.

### Keamanan
- Tidak ada port publik. `db` dan `api` hanya di network internal compose.
- Caddy bind ke `127.0.0.1:18080`, dijangkau hanya lewat Cloudflare Tunnel.
- Auth di Cloudflare Access (OTP email); `basic_auth` Caddy tersedia sebagai cadangan.
- `.env.prod` dan `secrets/` gitignored — jangan di-commit.
