"""FastAPI application exposing the scraped job market as read endpoints."""

from __future__ import annotations

import csv
import io
import statistics

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, selectinload

from ..config import get_settings
from ..models import Company, Job, JobSkill, Skill
from .deps import get_db, job_to_dict

settings = get_settings()

app = FastAPI(title="JobSeeking API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SALARY_BUCKETS = [
    (0, 5_000_000, "<5jt"),
    (5_000_000, 10_000_000, "5-10jt"),
    (10_000_000, 15_000_000, "10-15jt"),
    (15_000_000, 20_000_000, "15-20jt"),
    (20_000_000, 30_000_000, "20-30jt"),
    (30_000_000, float("inf"), ">30jt"),
]


def _build_filters(
    q: str | None = None,
    city: str | None = None,
    province: str | None = None,
    is_jatim: bool | None = None,
    work_type: str | None = None,
    seniority: str | None = None,
    employment_type: str | None = None,
    keyword: str | None = None,
    company: str | None = None,
    skills: list[str] | None = None,
    salary_min: float | None = None,
    salary_max: float | None = None,
    has_salary: bool | None = None,
) -> list:
    conditions = []
    if q:
        like = f"%{q}%"
        conditions.append(or_(Job.title.ilike(like), Job.description_raw.ilike(like)))
    if city:
        conditions.append(Job.city.ilike(city))
    if province:
        conditions.append(Job.province.ilike(province))
    if is_jatim is not None:
        conditions.append(Job.is_jatim.is_(is_jatim))
    if work_type:
        conditions.append(Job.work_type == work_type)
    if seniority:
        conditions.append(Job.seniority == seniority)
    if employment_type:
        conditions.append(Job.employment_type == employment_type)
    if keyword:
        conditions.append(Job.search_keyword == keyword)
    if company:
        conditions.append(Company.slug == company)
    if skills:
        sub = (
            select(JobSkill.job_id)
            .join(Skill, Skill.id == JobSkill.skill_id)
            .where(Skill.slug.in_(skills))
        )
        conditions.append(Job.id.in_(sub))
    if has_salary is True:
        conditions.append(or_(Job.salary_min.is_not(None), Job.salary_max.is_not(None)))
    elif has_salary is False:
        conditions.append(and_(Job.salary_min.is_(None), Job.salary_max.is_(None)))
    if salary_min is not None:
        conditions.append(or_(Job.salary_max.is_(None), Job.salary_max >= salary_min))
    if salary_max is not None:
        conditions.append(or_(Job.salary_min.is_(None), Job.salary_min <= salary_max))
    return conditions


def _filtered_jobs(*conditions):
    stmt = select(Job).options(selectinload(Job.skills), selectinload(Job.company))
    if conditions:
        stmt = stmt.join(Company, Job.company_id == Company.id, isouter=True).where(*conditions)
    return stmt


@app.get("/health")
def health(db: Session = Depends(get_db)) -> dict:
    total = db.scalar(select(func.count()).select_from(Job)) or 0
    return {"status": "ok", "jobs": total}


@app.get("/meta")
def meta(db: Session = Depends(get_db)) -> dict:
    def distinct(column):
        return [v for (v,) in db.execute(select(column).distinct().order_by(column)).all() if v]

    skill_rows = db.execute(
        select(Skill.slug, Skill.name, Skill.category).order_by(Skill.category, Skill.name)
    ).all()
    return {
        "cities": distinct(Job.city),
        "provinces": distinct(Job.province),
        "work_types": distinct(Job.work_type),
        "seniorities": distinct(Job.seniority),
        "employment_types": distinct(Job.employment_type),
        "keywords": distinct(Job.search_keyword),
        "skills": [{"slug": s, "name": n, "category": c} for s, n, c in skill_rows],
    }


@app.get("/jobs")
def list_jobs(
    db: Session = Depends(get_db),
    q: str | None = None,
    city: str | None = None,
    province: str | None = None,
    is_jatim: bool | None = None,
    work_type: str | None = None,
    seniority: str | None = None,
    employment_type: str | None = None,
    keyword: str | None = None,
    company: str | None = None,
    skill: list[str] | None = Query(default=None),
    salary_min: float | None = None,
    salary_max: float | None = None,
    has_salary: bool | None = None,
    sort: str = "recent",
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> dict:
    conditions = _build_filters(
        q, city, province, is_jatim, work_type, seniority, employment_type, keyword,
        company, skill, salary_min, salary_max, has_salary,
    )
    base = _filtered_jobs(*conditions)

    count_stmt = select(func.count(func.distinct(Job.id))).select_from(Job)
    if conditions:
        count_stmt = count_stmt.join(Company, Job.company_id == Company.id, isouter=True).where(*conditions)
    total = db.scalar(count_stmt) or 0

    if sort == "salary":
        base = base.order_by(Job.salary_max.desc().nullslast(), Job.posted_at.desc().nullslast())
    elif sort == "oldest":
        base = base.order_by(Job.posted_at.asc().nullslast())
    else:
        base = base.order_by(Job.posted_at.desc().nullslast(), Job.scraped_at.desc())

    jobs = db.scalars(base.offset(offset).limit(limit)).unique().all()
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [job_to_dict(j) for j in jobs],
    }


@app.get("/jobs/{job_id}")
def get_job(job_id: str, db: Session = Depends(get_db)) -> dict:
    job = db.scalar(
        select(Job)
        .options(selectinload(Job.skills), selectinload(Job.company))
        .where(Job.job_id == job_id)
    )
    if job is None:
        raise HTTPException(status_code=404, detail="job not found")
    return job_to_dict(job, include_description=True)


@app.get("/stats/overview")
def stats_overview(db: Session = Depends(get_db)) -> dict:
    total = db.scalar(select(func.count()).select_from(Job)) or 0
    companies = db.scalar(select(func.count()).select_from(Company)) or 0
    with_salary = db.scalar(
        select(func.count()).select_from(Job).where(
            or_(Job.salary_min.is_not(None), Job.salary_max.is_not(None))
        )
    ) or 0
    jatim = db.scalar(select(func.count()).select_from(Job).where(Job.is_jatim.is_(True))) or 0
    remote = db.scalar(select(func.count()).select_from(Job).where(Job.work_type == "remote")) or 0
    last_scraped = db.scalar(select(func.max(Job.scraped_at)))

    def group(column, limit=20):
        rows = db.execute(
            select(column, func.count().label("count"))
            .where(column.is_not(None))
            .group_by(column)
            .order_by(func.count().desc())
            .limit(limit)
        ).all()
        return [{"name": name, "count": count} for name, count in rows]

    return {
        "total_jobs": total,
        "total_companies": companies,
        "jobs_with_salary": with_salary,
        "salary_coverage": round(with_salary / total * 100, 1) if total else 0.0,
        "jatim_jobs": jatim,
        "remote_jobs": remote,
        "last_scraped_at": last_scraped.isoformat() if last_scraped else None,
        "by_city": group(Job.city),
        "by_work_type": group(Job.work_type),
        "by_seniority": group(Job.seniority),
        "by_keyword": group(Job.search_keyword),
        "by_employment_type": group(Job.employment_type),
    }


@app.get("/stats/skills")
def stats_skills(
    db: Session = Depends(get_db),
    category: str | None = None,
    city: str | None = None,
    keyword: str | None = None,
    limit: int = Query(30, ge=1, le=200),
) -> dict:
    stmt = (
        select(Skill.slug, Skill.name, Skill.category, func.count(JobSkill.job_id).label("count"))
        .join(JobSkill, JobSkill.skill_id == Skill.id)
        .join(Job, Job.id == JobSkill.job_id)
        .group_by(Skill.slug, Skill.name, Skill.category)
        .order_by(func.count(JobSkill.job_id).desc())
        .limit(limit)
    )
    if category:
        stmt = stmt.where(Skill.category == category)
    if city:
        stmt = stmt.where(Job.city.ilike(city))
    if keyword:
        stmt = stmt.where(Job.search_keyword == keyword)
    rows = db.execute(stmt).all()
    return {"items": [{"slug": s, "name": n, "category": c, "count": cnt} for s, n, c, cnt in rows]}


@app.get("/stats/companies")
def stats_companies(db: Session = Depends(get_db), limit: int = Query(20, ge=1, le=200)) -> dict:
    stmt = (
        select(
            Company.name_raw,
            Company.slug,
            func.count(Job.id).label("count"),
            func.avg(Job.salary_min).label("avg_min"),
            func.avg(Job.salary_max).label("avg_max"),
        )
        .join(Job, Job.company_id == Company.id)
        .group_by(Company.id)
        .order_by(func.count(Job.id).desc())
        .limit(limit)
    )
    rows = db.execute(stmt).all()
    return {
        "items": [
            {
                "company": name,
                "slug": slug,
                "count": count,
                "avg_salary_min": round(avg_min) if avg_min else None,
                "avg_salary_max": round(avg_max) if avg_max else None,
            }
            for name, slug, count, avg_min, avg_max in rows
        ]
    }


def _salary_dimension(db: Session, column, min_count: int = 1) -> list[dict]:
    stmt = (
        select(
            column.label("name"),
            func.count(Job.id).label("count"),
            func.avg(Job.salary_min).label("avg_min"),
            func.avg(Job.salary_max).label("avg_max"),
            func.avg((Job.salary_min + func.coalesce(Job.salary_max, Job.salary_min)) / 2).label("avg_mid"),
        )
        .where(or_(Job.salary_min.is_not(None), Job.salary_max.is_not(None)))
        .where(column.is_not(None))
        .group_by(column)
        .having(func.count(Job.id) >= min_count)
        .order_by(func.avg((Job.salary_min + func.coalesce(Job.salary_max, Job.salary_min)) / 2).desc())
        .limit(30)
    )
    rows = db.execute(stmt).all()
    return [
        {
            "name": name,
            "count": count,
            "avg_min": round(avg_min) if avg_min else None,
            "avg_max": round(avg_max) if avg_max else None,
            "avg_mid": round(avg_mid) if avg_mid else None,
        }
        for name, count, avg_min, avg_max, avg_mid in rows
    ]


@app.get("/stats/salary")
def stats_salary(db: Session = Depends(get_db)) -> dict:
    rows = db.execute(
        select(Job.salary_min, Job.salary_max)
        .where(or_(Job.salary_min.is_not(None), Job.salary_max.is_not(None)))
        .limit(50000)
    ).all()
    mids = [
        ((lo + (hi if hi is not None else lo)) / 2)
        for lo, hi in rows
        if lo is not None or hi is not None
    ]
    mins = [lo for lo, _ in rows if lo is not None]
    maxs = [hi for _, hi in rows if hi is not None]

    distribution = {label: 0 for _, _, label in SALARY_BUCKETS}
    for mid in mids:
        for low, high, label in SALARY_BUCKETS:
            if low <= mid < high:
                distribution[label] += 1
                break

    def summary(values: list[float]) -> dict | None:
        if not values:
            return None
        return {
            "count": len(values),
            "min": round(min(values)),
            "max": round(max(values)),
            "avg": round(statistics.mean(values)),
            "median": round(statistics.median(values)),
        }

    return {
        "sample_size": len(mids),
        "overall": summary(mids),
        "salary_min": summary(mins),
        "salary_max": summary(maxs),
        "distribution": [
            {"bucket": label, "count": distribution[label]} for _, _, label in SALARY_BUCKETS
        ],
        "by_seniority": _salary_dimension(db, Job.seniority),
        "by_city": _salary_dimension(db, Job.city),
        "by_keyword": _salary_dimension(db, Job.search_keyword),
    }


@app.get("/stats/trend")
def stats_trend(db: Session = Depends(get_db)) -> dict:
    bucket = func.to_char(func.date_trunc("month", Job.posted_at), "YYYY-MM")
    rows = db.execute(
        select(bucket.label("bucket"), func.count().label("count"))
        .where(Job.posted_at.is_not(None))
        .group_by("bucket")
        .order_by("bucket")
    ).all()
    return {"items": [{"bucket": b, "count": c} for b, c in rows]}


@app.get("/stats/locations")
def stats_locations(db: Session = Depends(get_db), limit: int = Query(40, ge=1, le=200)) -> dict:
    rows = db.execute(
        select(Job.city, Job.province, Job.is_jatim, func.count().label("count"))
        .where(Job.city.is_not(None))
        .group_by(Job.city, Job.province, Job.is_jatim)
        .order_by(func.count().desc())
        .limit(limit)
    ).all()
    return {
        "items": [
            {"city": city, "province": province, "is_jatim": is_jatim, "count": count}
            for city, province, is_jatim, count in rows
        ]
    }


@app.get("/export.csv")
def export_csv(
    db: Session = Depends(get_db),
    q: str | None = None,
    city: str | None = None,
    keyword: str | None = None,
    skill: list[str] | None = Query(default=None),
) -> StreamingResponse:
    conditions = _build_filters(q=q, city=city, keyword=keyword, skills=skill)
    stmt = _filtered_jobs(*conditions).order_by(Job.scraped_at.desc()).limit(50000)
    jobs = db.scalars(stmt).unique().all()

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "job_id", "title", "company", "city", "province", "is_jatim", "work_type",
            "seniority", "employment_type", "salary_min", "salary_max", "salary_period",
            "posted_at", "skills", "url",
        ]
    )
    for job in jobs:
        writer.writerow(
            [
                job.job_id, job.title, job.company.name_raw if job.company else "",
                job.city or "", job.province or "", job.is_jatim, job.work_type,
                job.seniority or "", job.employment_type or "",
                job.salary_min or "", job.salary_max or "", job.salary_period or "",
                job.posted_at.isoformat() if job.posted_at else "",
                "|".join(s.slug for s in job.skills), job.url,
            ]
        )
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=jobs.csv"},
    )


def run() -> None:
    import uvicorn

    uvicorn.run(
        "jobseeking.api.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=False,
    )


if __name__ == "__main__":
    run()
