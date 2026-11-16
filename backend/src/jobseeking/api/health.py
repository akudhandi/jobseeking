"""Scrape-health computation for the dashboard and monitoring.

The pipeline writes one ``CrawlRun`` row per invocation, so the questions the
dashboard needs to answer ("is the scraper still alive?", "what did the last run
do?", "how complete is the data?") can all be answered from that table.

A run finishing with zero results is treated as a problem, not a success:
LinkedIn answers a blocked guest request with an empty result page rather than
an error, so a silently blocked scraper would otherwise look healthy forever.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..models import CrawlRun, Job

# A run still marked "running" this long after it started was killed mid-flight
# — the sandbox suspended, the container was recreated, or the host OOM'd — and
# nothing will ever close it.
HUNG_AFTER_HOURS = 2.0
RECENT_RUNS = 20


def _as_utc(value: datetime | None) -> datetime | None:
    """SQLite (tests) returns naive datetimes; Postgres returns aware ones."""
    if value is None:
        return None
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def _hours_since(value: datetime | None, now: datetime) -> float | None:
    value = _as_utc(value)
    if value is None:
        return None
    return round((now - value).total_seconds() / 3600, 1)


def _percent(part: int | None, total: int) -> float:
    return round((part or 0) / total * 100, 1) if total else 0.0


def run_to_dict(run: CrawlRun) -> dict[str, Any]:
    started = _as_utc(run.started_at)
    finished = _as_utc(run.finished_at)
    duration = None
    if started and finished:
        duration = round((finished - started).total_seconds(), 1)
    return {
        "id": run.id,
        "status": run.status,
        "started_at": started.isoformat() if started else None,
        "finished_at": finished.isoformat() if finished else None,
        "duration_seconds": duration,
        "keywords": run.keyword,
        "locations": run.location,
        "pages_fetched": run.pages_fetched,
        "jobs_found": run.jobs_found,
        "jobs_new": run.jobs_new,
        "jobs_updated": run.jobs_updated,
        "jobs_failed": run.jobs_failed,
    }


def job_coverage(db: Session) -> dict[str, Any]:
    """Field coverage over the postings that are still live.

    Nulls are meaningful here: salary/town/criteria are frequently absent from
    the posting itself, so coverage is reported instead of being papered over.
    Retired postings are excluded, otherwise a field would look better covered
    just because an old run happened to parse it.
    """
    active = Job.is_active.is_(True)
    total = db.scalar(select(func.count()).select_from(Job).where(active)) or 0
    inactive = db.scalar(select(func.count()).select_from(Job).where(Job.is_active.is_(False))) or 0
    salary = (
        db.scalar(
            select(func.count())
            .select_from(Job)
            .where(active, or_(Job.salary_min.is_not(None), Job.salary_max.is_not(None)))
        )
        or 0
    )
    fields = {
        "city": db.scalar(select(func.count(Job.city)).where(active)) or 0,
        "province": db.scalar(select(func.count(Job.province)).where(active)) or 0,
        "employment_type": db.scalar(select(func.count(Job.employment_type)).where(active)) or 0,
        "seniority": db.scalar(select(func.count(Job.seniority)).where(active)) or 0,
        "description": db.scalar(select(func.count(Job.description_raw)).where(active)) or 0,
        "experience": db.scalar(select(func.count(Job.min_years_experience)).where(active)) or 0,
        "keyword": db.scalar(select(func.count(Job.search_keyword)).where(active)) or 0,
    }
    out: dict[str, Any] = {
        "total_jobs": total,
        "inactive_jobs": inactive,
        "salary": {"count": salary, "percent": _percent(salary, total)},
    }
    for name, count in fields.items():
        out[name] = {"count": count, "percent": _percent(count, total)}
    return out


def _is_scrape_run(run: CrawlRun) -> bool:
    """Replay runs re-parse local HTML and prove nothing about the live site.

    They are recorded in crawl_runs like any other run, so without this filter a
    backfill would reset the freshness clock and hide a dead scraper.
    """
    return not (run.keyword or "").startswith("(replay)")


def scrape_health(db: Session, *, recent: int = RECENT_RUNS) -> dict[str, Any]:
    settings = get_settings()
    interval = float(settings.scrape_interval_hours)
    stale_after = round(interval * 1.5, 1)
    now = datetime.now(UTC)

    runs = list(db.scalars(select(CrawlRun).order_by(CrawlRun.id.desc()).limit(recent)).all())
    scrapes = [run for run in runs if _is_scrape_run(run)]
    last_run = scrapes[0] if scrapes else None
    last_success = next((r for r in scrapes if r.status == "completed"), None)

    last_started_hours = _hours_since(last_run.started_at, now) if last_run else None
    hung = (
        last_run is not None
        and last_run.status == "running"
        and (last_started_hours or 0) > HUNG_AFTER_HOURS
    )

    consecutive_failures = 0
    for run in scrapes:
        if run.status == "failed":
            consecutive_failures += 1
        elif run is last_run and run.status == "running" and not hung:
            # A run that started a few minutes ago is simply in progress.
            continue
        else:
            break

    success_at = (
        _as_utc(last_success.finished_at or last_success.started_at) if last_success else None
    )
    age_hours = _hours_since(success_at, now)
    next_due = None
    if success_at is not None:
        next_due = success_at.timestamp() + interval * 3600
        next_due = datetime.fromtimestamp(next_due, UTC).isoformat()

    if last_run is None:
        status = "never"
        message = "Belum pernah ada proses scraping."
    elif hung:
        status = "hung"
        message = (
            f"Scrape terakhir macet {last_started_hours:.0f} jam di status berjalan "
            "— kemungkinan container mati di tengah proses."
        )
    elif consecutive_failures:
        status = "failing"
        message = f"{consecutive_failures} proses scrape terakhir gagal."
    elif last_success is None:
        status = "never"
        message = "Belum ada proses scrape yang selesai dengan sukses."
    elif age_hours is not None and age_hours > stale_after:
        status = "stale"
        message = (
            f"Scrape sukses terakhir {age_hours:.0f} jam lalu, "
            f"padahal jadwalnya tiap {interval:.0f} jam."
        )
    elif last_success.jobs_found == 0:
        status = "empty"
        message = (
            "Scrape terakhir selesai tanpa menemukan satu lowongan pun "
            "— kemungkinan diblokir LinkedIn."
        )
    else:
        status = "ok"
        message = f"Scrape sukses terakhir {age_hours:.0f} jam lalu."

    return {
        "status": status,
        "message": message,
        "interval_hours": interval,
        "stale_after_hours": stale_after,
        "last_success_at": success_at.isoformat() if success_at else None,
        "age_hours": age_hours,
        "next_due_at": next_due,
        "consecutive_failures": consecutive_failures,
        "last_run": run_to_dict(last_run) if last_run else None,
        "runs": [run_to_dict(run) for run in runs],
        "coverage": job_coverage(db),
    }
