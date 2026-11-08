"""Store-layer tests against an in-memory SQLite database."""

from __future__ import annotations

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from jobseeking.db import Base
from jobseeking.models import Company, Job, Skill
from jobseeking.records import ParsedJob
from jobseeking.store import upsert_job


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
