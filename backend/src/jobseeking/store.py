"""Upsert parsed jobs, companies, and skills into the database."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import Company, Job, Skill
from .normalize import company_name_norm, slugify
from .parse import SKILL_BY_SLUG
from .records import ParsedJob

# Values the parsers emit when they could not decide. They must not overwrite a
# previously known value, otherwise one blocked detail fetch downgrades a job.
UNKNOWN_ENUMS = {"unknown", ""}


def _merge_text(new: str | None, old: str | None) -> str | None:
    """Keep ``old`` when the new parse is empty."""
    return new if new and new.strip() else old


def _merge_enum(new: str | None, old: str | None) -> str | None:
    """Keep ``old`` when the new parse is empty or the "unknown" placeholder."""
    if not new or new in UNKNOWN_ENUMS:
        return old
    return new


def upsert_company(session: Session, name_raw: str | None) -> Company | None:
    if not name_raw:
        return None
    norm = company_name_norm(name_raw) or slugify(name_raw)
    if not norm:
        return None
    company = session.scalar(select(Company).where(Company.name_norm == norm))
    if company is None:
        company = Company(name_raw=name_raw.strip(), name_norm=norm, slug=slugify(name_raw))
        session.add(company)
        session.flush()
    return company


def get_or_create_skill(session: Session, slug: str) -> Skill | None:
    definition = SKILL_BY_SLUG.get(slug)
    if definition is None:
        return None
    skill = session.scalar(select(Skill).where(Skill.slug == slug))
    if skill is None:
        skill = Skill(name=definition.name, slug=definition.slug, category=definition.category)
        session.add(skill)
        session.flush()
    return skill


def upsert_job(session: Session, rec: ParsedJob) -> tuple[Job, bool]:
    """Insert a new job or merge the new parse into the stored row.

    Every field is merged rather than replaced: a run that fails to fetch the
    detail page still yields a card with the same job_id, and blanking the
    description/salary/skills there would silently degrade existing data.
    """
    job = session.scalar(select(Job).where(Job.job_id == rec.job_id))
    is_new = job is None
    if job is None:
        job = Job(job_id=rec.job_id)
        session.add(job)

    job.title = _merge_text(rec.title, job.title) or ""
    job.url = _merge_text(rec.url, job.url) or ""

    company = upsert_company(session, rec.company_name)
    if company is not None:
        job.company = company

    # A card always has a location; a missing detail page does not. Only trust
    # the location parse when the new record actually carries one, and never
    # downgrade a known city to "unknown" because the detail page only said
    # "Indonesia".
    if rec.location_raw:
        job.location_raw = rec.location_raw
        if rec.city is not None:
            job.city = rec.city
        if rec.province is not None:
            job.province = rec.province
            job.is_jatim = rec.is_jatim
        elif rec.city is not None:
            job.is_jatim = rec.is_jatim

    job.work_type = _merge_enum(rec.work_type, job.work_type) or "unknown"
    job.employment_type = _merge_text(rec.employment_type, job.employment_type)
    job.seniority = _merge_enum(rec.seniority, job.seniority)

    if rec.salary_min is not None or rec.salary_max is not None:
        job.salary_min = rec.salary_min
        job.salary_max = rec.salary_max
        job.salary_period = rec.salary_period
    job.salary_currency = rec.salary_currency or job.salary_currency

    if rec.posted_at is not None:
        job.posted_at = rec.posted_at
    job.description_raw = _merge_text(rec.description_raw, job.description_raw)
    if rec.requirements:
        job.requirements = rec.requirements
    if rec.min_years_experience is not None:
        job.min_years_experience = rec.min_years_experience

    # Replay passes keyword=None; never let it erase what the search knew.
    if rec.search_keyword:
        job.search_keyword = rec.search_keyword
    job.source = rec.source or job.source
    if rec.run_id is not None:
        job.run_id = rec.run_id

    if not is_new:
        job.scraped_at = func.now()

    resolved: list[Skill] = []
    for slug in rec.skills:
        skill = get_or_create_skill(session, slug)
        if skill is not None:
            resolved.append(skill)
    if resolved or not job.skills:
        job.skills = resolved

    session.flush()
    return job, is_new
