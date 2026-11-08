"""Upsert parsed jobs, companies, and skills into the database."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Company, Job, Skill
from .normalize import company_name_norm, slugify
from .parse import SKILL_BY_SLUG
from .records import ParsedJob


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
    job = session.scalar(select(Job).where(Job.job_id == rec.job_id))
    is_new = job is None
    if job is None:
        job = Job(job_id=rec.job_id)
        session.add(job)

    job.title = rec.title
    job.url = rec.url
    job.company = upsert_company(session, rec.company_name)

    job.location_raw = rec.location_raw
    job.city = rec.city
    job.province = rec.province
    job.is_jatim = rec.is_jatim
    job.work_type = rec.work_type
    job.employment_type = rec.employment_type
    job.seniority = rec.seniority

    job.salary_min = rec.salary_min
    job.salary_max = rec.salary_max
    job.salary_period = rec.salary_period
    job.salary_currency = rec.salary_currency

    job.posted_at = rec.posted_at
    job.description_raw = rec.description_raw
    job.requirements = rec.requirements or None

    job.search_keyword = rec.search_keyword
    job.source = rec.source
    job.run_id = rec.run_id

    resolved: list[Skill] = []
    for slug in rec.skills:
        skill = get_or_create_skill(session, slug)
        if skill is not None:
            resolved.append(skill)
    job.skills = resolved

    session.flush()
    return job, is_new
