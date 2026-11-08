"""Shared FastAPI dependencies and serializers."""

from __future__ import annotations

from collections.abc import Iterator
from datetime import datetime

from sqlalchemy.orm import Session

from ..db import get_session_factory
from ..models import Job


def get_db() -> Iterator[Session]:
    session = get_session_factory()()
    try:
        yield session
    finally:
        session.close()


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def job_to_dict(job: Job, *, include_description: bool = False) -> dict:
    data = {
        "job_id": job.job_id,
        "title": job.title,
        "url": job.url,
        "company": job.company.name_raw if job.company else None,
        "company_slug": job.company.slug if job.company else None,
        "location_raw": job.location_raw,
        "city": job.city,
        "province": job.province,
        "is_jatim": job.is_jatim,
        "work_type": job.work_type,
        "employment_type": job.employment_type,
        "seniority": job.seniority,
        "salary_min": job.salary_min,
        "salary_max": job.salary_max,
        "salary_period": job.salary_period,
        "salary_currency": job.salary_currency,
        "has_salary": job.salary_min is not None or job.salary_max is not None,
        "posted_at": _iso(job.posted_at),
        "scraped_at": _iso(job.scraped_at),
        "search_keyword": job.search_keyword,
        "source": job.source,
        "skills": [s.slug for s in job.skills],
        "requirements": job.requirements or [],
    }
    if include_description:
        data["description"] = job.description_raw
    return data
