"""Combine search cards + detail pages into a ParsedJob record."""

from __future__ import annotations

from .config import CrawlConfig
from .detail import JobDetail, canonical_employment_type
from .normalize import parse_datetime
from .parse import (
    LocationInfo,
    detect_seniority,
    detect_work_type,
    extract_skills,
    parse_location,
    parse_requirements,
    parse_salary,
)
from .records import ParsedJob
from .search import JobCard


def _pick_location(
    card: JobCard, detail: JobDetail | None, cities: list[str] | None
) -> tuple[str | None, LocationInfo]:
    """Use the most specific location available.

    Guest detail pages often only say "Indonesia", while the search card knows
    the city. Prefer whichever candidate actually resolves to a city.
    """
    candidates = [raw for raw in ((detail.location if detail else None), card.location) if raw]
    parsed = [(raw, parse_location(raw, cities)) for raw in candidates]
    for raw, info in parsed:
        if info.city:
            return raw, info
    if parsed:
        return parsed[0]
    return None, LocationInfo(None, None, False)


def build_parsed_job(
    card: JobCard,
    detail: JobDetail | None,
    keywords: list[str] | None,
    config: CrawlConfig,
    run_id: int | None = None,
) -> ParsedJob:
    description = detail.description_text if detail else ""
    title = (detail.title if detail and detail.title else card.title) or ""
    company = (detail.company if detail and detail.company else card.company) or None

    location, loc = _pick_location(card, detail, config.jatim_cities)
    salary = parse_salary(description)
    req = parse_requirements(description)
    seniority = detect_seniority(
        level=detail.seniority_level if detail else None,
        title=title,
        description=description,
    )
    work_type = detect_work_type(title, location, description)
    posted_at = parse_datetime(
        (detail.posted_at if detail and detail.posted_at else None) or card.posted_at
    )
    skills = extract_skills(f"{title}\n{description}")

    return ParsedJob(
        job_id=card.job_id,
        title=title,
        url=card.url,
        company_name=company,
        location_raw=location,
        city=loc.city,
        province=loc.province,
        is_jatim=loc.is_jatim,
        work_type=work_type,
        employment_type=canonical_employment_type(detail.employment_type if detail else None),
        seniority=seniority,
        salary_min=salary.min if salary else None,
        salary_max=salary.max if salary else None,
        salary_period=salary.period if salary else None,
        salary_currency=salary.currency if salary else "IDR",
        posted_at=posted_at,
        description_raw=description or None,
        requirements=req.items,
        min_years_experience=req.min_years,
        skills=skills,
        search_keywords=[k for k in (keywords or []) if k],
        run_id=run_id,
    )
