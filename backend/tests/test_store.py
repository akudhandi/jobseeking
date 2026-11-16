"""Store-layer tests against an in-memory SQLite database."""

from __future__ import annotations

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from jobseeking.db import Base
from jobseeking.models import Company, Job, JobKeyword, Skill
from jobseeking.records import ParsedJob
from jobseeking.store import age_missing_jobs, upsert_job


def _session():
    engine = create_engine("sqlite://", future=True)
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, expire_on_commit=False)()


def test_upsert_job_insert_then_update():
    session = _session()
    rec = ParsedJob(
        job_id="42",
        title="Backend Developer",
        url="https://www.linkedin.com/jobs/view/42",
        company_name="PT ABC Teknologi",
        city="Surabaya",
        province="Jawa Timur",
        is_jatim=True,
        work_type="remote",
        seniority="mid",
        skills=["node-js", "postgresql"],
        requirements=["Minimal 3 tahun pengalaman"],
        salary_min=10_000_000,
        salary_max=15_000_000,
        salary_period="month",
    )

    job, is_new = upsert_job(session, rec)
    session.commit()
    assert is_new is True
    assert job.id is not None
    assert len(job.skills) == 2
    assert job.company is not None and job.company.name_norm == "abc teknologi"

    # re-run with the same job_id updates rather than duplicates
    rec.title = "Senior Backend Developer"
    rec.seniority = "senior"
    job2, is_new2 = upsert_job(session, rec)
    session.commit()
    assert is_new2 is False
    assert job2.id == job.id
    assert job2.title == "Senior Backend Developer"

    assert session.scalar(select(Job).where(Job.job_id == "42")).id == job.id
    assert len(session.scalars(select(Job)).all()) == 1
    assert len(session.scalars(select(Skill)).all()) == 2
    assert len(session.scalars(select(Company)).all()) == 1


def test_company_name_normalization_merges_suffixes():
    session = _session()
    upsert_job(session, ParsedJob(job_id="1", title="a", url="u1", company_name="PT ABC Teknologi"))
    upsert_job(session, ParsedJob(job_id="2", title="b", url="u2", company_name="ABC Teknologi"))
    session.commit()
    assert len(session.scalars(select(Company)).all()) == 1


def _full_record() -> ParsedJob:
    return ParsedJob(
        job_id="7",
        title="Backend Developer",
        url="https://www.linkedin.com/jobs/view/7",
        company_name="PT ABC Teknologi",
        location_raw="Surabaya, Jawa Timur, Indonesia",
        city="Surabaya",
        province="Jawa Timur",
        is_jatim=True,
        work_type="remote",
        employment_type="full_time",
        seniority="senior",
        salary_min=10_000_000,
        salary_max=15_000_000,
        salary_period="month",
        posted_at=None,
        description_raw="Kami mencari Backend Developer.",
        requirements=["Minimal 3 tahun pengalaman"],
        min_years_experience=3,
        skills=["node-js", "postgresql"],
        search_keywords=["backend developer"],
    )


def test_rescrape_without_detail_does_not_erase_data():
    """A run whose detail fetch failed still yields a card; it must not blank
    the description, salary, skills or keyword already stored."""
    session = _session()
    upsert_job(session, _full_record())
    session.commit()

    card_only = ParsedJob(
        job_id="7",
        title="Backend Developer",
        url="https://www.linkedin.com/jobs/view/7",
        company_name="PT ABC Teknologi",
        location_raw="Surabaya, Jawa Timur, Indonesia",
        city="Surabaya",
        province="Jawa Timur",
        is_jatim=True,
        work_type="unknown",
        seniority="unknown",
        skills=[],
    )
    job, is_new = upsert_job(session, card_only)
    session.commit()

    assert is_new is False
    assert job.description_raw == "Kami mencari Backend Developer."
    assert job.salary_min == 10_000_000
    assert job.salary_max == 15_000_000
    assert job.employment_type == "full_time"
    assert job.seniority == "senior"
    assert job.work_type == "remote"
    assert job.min_years_experience == 3
    assert job.requirements == ["Minimal 3 tahun pengalaman"]
    assert [k.keyword for k in job.keywords] == ["backend developer"]
    assert [s.slug for s in job.skills] == ["node-js", "postgresql"]


def test_replay_without_keywords_keeps_stored_ones():
    # --replay-raw passes no keyword when the raw file name is unreadable; that
    # must not wipe the attribution a real search already made.
    session = _session()
    upsert_job(session, _full_record())
    session.commit()

    replay_rec = _full_record()
    replay_rec.search_keywords = []
    job, _ = upsert_job(session, replay_rec)
    session.commit()
    assert [k.keyword for k in job.keywords] == ["backend developer"]


def test_one_job_accumulates_every_keyword_that_found_it():
    """The old single column kept only the last keyword written, which is why
    "web developer" showed zero jobs while being in the config."""
    session = _session()
    rec = _full_record()
    rec.search_keywords = ["backend developer", "remote developer"]
    job, _ = upsert_job(session, rec)
    session.commit()
    assert sorted(k.keyword for k in job.keywords) == ["backend developer", "remote developer"]

    # Re-running the same searches must not duplicate rows.
    upsert_job(session, rec)
    session.commit()
    assert sorted(k.keyword for k in job.keywords) == ["backend developer", "remote developer"]
    assert len(session.scalars(select(JobKeyword)).all()) == 2

    # A third search later finds the same posting and is added, not substituted.
    rec.search_keywords = ["web developer"]
    job, _ = upsert_job(session, rec)
    session.commit()
    assert sorted(k.keyword for k in job.keywords) == [
        "backend developer",
        "remote developer",
        "web developer",
    ]


def test_less_specific_location_does_not_downgrade_city():
    """Detail pages from the guest endpoint often only say "Indonesia"; that
    must not erase the city the search card already gave us."""
    session = _session()
    upsert_job(session, _full_record())
    session.commit()

    vague = _full_record()
    vague.location_raw = "Indonesia"
    vague.city = None
    vague.province = None
    vague.is_jatim = False
    job, _ = upsert_job(session, vague)
    session.commit()

    assert job.city == "Surabaya"
    assert job.province == "Jawa Timur"
    assert job.is_jatim is True
    assert job.location_raw == "Indonesia"


def _record(job_id: str, run_id: int | None = None) -> ParsedJob:
    return ParsedJob(
        job_id=job_id,
        title=f"Developer {job_id}",
        url=f"https://www.linkedin.com/jobs/view/{job_id}",
        run_id=run_id,
    )


def test_missing_job_is_retired_after_threshold_and_reactivated_when_seen():
    session = _session()
    upsert_job(session, _record("1", run_id=1))
    upsert_job(session, _record("2", run_id=1))
    session.commit()

    # Run 2 still returns job 1 only: job 2 has now missed one run.
    upsert_job(session, _record("1", run_id=2))
    session.commit()
    assert age_missing_jobs(session, run_id=2, threshold=3) == {"missed": 1, "retired": 0}
    session.commit()
    assert session.scalar(select(Job).where(Job.job_id == "2")).missed_runs == 1

    age_missing_jobs(session, run_id=2, threshold=3)
    session.commit()
    retired = session.scalar(select(Job).where(Job.job_id == "2"))
    assert retired.missed_runs == 2
    assert retired.is_active is True

    # Third consecutive miss flips it.
    assert age_missing_jobs(session, run_id=2, threshold=3) == {"missed": 1, "retired": 1}
    session.commit()
    retired = session.scalar(select(Job).where(Job.job_id == "2"))
    assert retired.is_active is False
    assert retired.missed_runs == 3

    # Showing up again in a later run brings it back and resets the counter.
    upsert_job(session, _record("2", run_id=3))
    session.commit()
    revived = session.scalar(select(Job).where(Job.job_id == "2"))
    assert revived.is_active is True
    assert revived.missed_runs == 0


def test_missing_job_is_never_deleted():
    session = _session()
    upsert_job(session, _record("9", run_id=1))
    session.commit()

    for _ in range(5):
        # A later run that does not return this posting (same run_id keeps it
        # excluded from every sweep).
        age_missing_jobs(session, run_id=2, threshold=2)
    session.commit()

    job = session.scalar(select(Job).where(Job.job_id == "9"))
    assert job is not None
    assert job.is_active is False
    assert job.missed_runs == 5
