"""Tests for the scrape-health computation."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from jobseeking.api.health import job_coverage, scrape_health
from jobseeking.db import Base
from jobseeking.models import CrawlRun
from jobseeking.records import ParsedJob
from jobseeking.store import upsert_job

NOW = datetime.now(UTC)


def _session():
    engine = create_engine("sqlite://", future=True)
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, expire_on_commit=False)()


def _run(
    session,
    *,
    status: str = "completed",
    hours_ago: float = 1.0,
    duration_minutes: float = 30.0,
    pages: int = 270,
    found: int = 800,
    new: int = 3,
    failed: int = 0,
) -> CrawlRun:
    started = NOW - timedelta(hours=hours_ago)
    finished = None
    if status != "running":
        finished = started + timedelta(minutes=duration_minutes)
    run = CrawlRun(
        started_at=started,
        finished_at=finished,
        keyword="backend developer",
        location="Surabaya",
        status=status,
        pages_fetched=pages,
        jobs_found=found,
        jobs_new=new,
        jobs_updated=found - new,
        jobs_failed=failed,
    )
    session.add(run)
    session.commit()
    return run


def test_health_without_runs_reports_never():
    session = _session()
    health = scrape_health(session)
    assert health["status"] == "never"
    assert health["last_run"] is None
    assert health["age_hours"] is None
    assert health["coverage"]["total_jobs"] == 0


def test_health_ok_for_recent_successful_run():
    session = _session()
    _run(session, hours_ago=3)
    health = scrape_health(session)
    assert health["status"] == "ok"
    assert health["consecutive_failures"] == 0
    assert health["last_success_at"] is not None
    # next_due is one scrape interval after the last success.
    assert health["next_due_at"] is not None
    assert health["last_run"]["pages_fetched"] == 270
    assert health["last_run"]["duration_seconds"] == 1800.0


def test_health_stale_when_last_success_is_older_than_threshold():
    session = _session()
    _run(session, hours_ago=40)
    health = scrape_health(session)
    assert health["status"] == "stale"
    assert health["age_hours"] > health["stale_after_hours"]


def test_health_reports_failing_after_failed_run():
    session = _session()
    _run(session, hours_ago=10)
    _run(session, status="failed", hours_ago=1, found=0)
    health = scrape_health(session)
    assert health["status"] == "failing"
    assert health["consecutive_failures"] == 1


def test_health_detects_run_killed_mid_flight():
    # A suspended sandbox leaves the row in "running" forever.
    session = _session()
    _run(session, hours_ago=8)
    _run(session, status="running", hours_ago=5, found=0)
    health = scrape_health(session)
    assert health["status"] == "hung"


def test_health_allows_run_that_is_still_in_progress():
    session = _session()
    _run(session, hours_ago=40)
    _run(session, status="running", hours_ago=0.2, found=0)
    health = scrape_health(session)
    # Not "hung": it started minutes ago. Freshness still tracks the last success.
    assert health["status"] == "stale"


def test_health_flags_blocked_scrape_that_found_nothing():
    # LinkedIn answers a blocked guest request with an empty page, so the run
    # "completes" with zero cards instead of raising.
    session = _session()
    _run(session, hours_ago=2, found=0, new=0)
    health = scrape_health(session)
    assert health["status"] == "empty"


def test_replay_run_does_not_reset_freshness():
    """--replay-raw writes a crawl_runs row too; it must not look like a scrape."""
    session = _session()
    _run(session, hours_ago=40)
    replay = _run(session, hours_ago=0.1, pages=0, found=189, new=0)
    replay.keyword = "(replay)"
    session.commit()

    health = scrape_health(session)
    assert health["status"] == "stale"
    assert health["last_run"]["keywords"] != "(replay)"
    # History still shows the replay row.
    assert any(run["keywords"] == "(replay)" for run in health["runs"])


def test_coverage_counts_nulls_as_missing():
    session = _session()
    upsert_job(
        session,
        ParsedJob(
            job_id="1",
            title="Backend Developer",
            url="u1",
            location_raw="Surabaya, Jawa Timur, Indonesia",
            city="Surabaya",
            province="Jawa Timur",
            employment_type="full_time",
            description_raw="deskripsi",
            search_keyword="backend developer",
        ),
    )
    upsert_job(
        session,
        ParsedJob(job_id="2", title="Remote Engineer", url="u2", location_raw="Indonesia"),
    )
    session.commit()

    coverage = job_coverage(session)
    assert coverage["total_jobs"] == 2
    assert coverage["city"] == {"count": 1, "percent": 50.0}
    assert coverage["salary"] == {"count": 0, "percent": 0.0}
    assert coverage["description"] == {"count": 1, "percent": 50.0}
