"""Parsed job record shared between the pipeline and the store layer."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class ParsedJob:
    job_id: str
    title: str
    url: str
    company_name: str | None = None

    location_raw: str | None = None
    city: str | None = None
    province: str | None = None
    is_jatim: bool = False
    work_type: str = "unknown"
    employment_type: str | None = None
    seniority: str | None = None

    salary_min: float | None = None
    salary_max: float | None = None
    salary_period: str | None = None
    salary_currency: str = "IDR"

    posted_at: datetime | None = None
    description_raw: str | None = None
    requirements: list[str] = field(default_factory=list)
    min_years_experience: int | None = None

    skills: list[str] = field(default_factory=list)

    search_keyword: str | None = None
    source: str = "linkedin"
    run_id: int | None = None
