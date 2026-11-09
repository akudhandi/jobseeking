"""ORM models for the job-market database."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(primary_key=True)
    name_raw: Mapped[str] = mapped_column(String(255))
    name_norm: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    jobs: Mapped[list[Job]] = relationship(back_populates="company")


class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    # frontend | backend | database | devops | cloud | language | mobile | data | soft | other
    category: Mapped[str] = mapped_column(String(40), default="other", index=True)

    jobs: Mapped[list[Job]] = relationship(secondary="job_skills", back_populates="skills")


class JobSkill(Base):
    __tablename__ = "job_skills"
    __table_args__ = (UniqueConstraint("job_id", "skill_id", name="uq_job_skill"),)

    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"), primary_key=True)
    skill_id: Mapped[int] = mapped_column(
        ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True
    )


class Location(Base):
    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(primary_key=True)
    city: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    province: Mapped[str] = mapped_column(String(120), default="Jawa Timur")
    is_jatim: Mapped[bool] = mapped_column(Boolean, default=True, index=True)


class CrawlRun(Base):
    __tablename__ = "crawl_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Full search matrix can join many keywords/locations, so these are Text.
    keyword: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(Text, nullable=True)
    pages_fetched: Mapped[int] = mapped_column(Integer, default=0)
    jobs_found: Mapped[int] = mapped_column(Integer, default=0)
    jobs_new: Mapped[int] = mapped_column(Integer, default=0)
    jobs_updated: Mapped[int] = mapped_column(Integer, default=0)
    jobs_failed: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(40), default="running")


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(512), index=True)
    url: Mapped[str] = mapped_column(String(1024))

    company_id: Mapped[int | None] = mapped_column(
        ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True
    )
    company: Mapped[Company | None] = relationship(back_populates="jobs")

    location_raw: Mapped[str | None] = mapped_column(String(512), nullable=True)
    city: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    province: Mapped[str | None] = mapped_column(String(120), nullable=True)
    is_jatim: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    # remote | hybrid | onsite | unknown
    work_type: Mapped[str] = mapped_column(String(20), default="unknown", index=True)
    # full-time | contract | part-time | internship | ...
    employment_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    # intern | junior | mid | senior | lead | unknown
    seniority: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)

    salary_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    salary_max: Mapped[float | None] = mapped_column(Float, nullable=True)
    salary_period: Mapped[str | None] = mapped_column(String(20), nullable=True)  # month|year|hour
    salary_currency: Mapped[str] = mapped_column(String(8), default="IDR")

    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    scraped_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    description_raw: Mapped[str | None] = mapped_column(Text, nullable=True)
    requirements: Mapped[list | None] = mapped_column(JSON, nullable=True)

    search_keyword: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source: Mapped[str] = mapped_column(String(40), default="linkedin")
    run_id: Mapped[int | None] = mapped_column(
        ForeignKey("crawl_runs.id", ondelete="SET NULL"), nullable=True
    )

    skills: Mapped[list[Skill]] = relationship(secondary="job_skills", back_populates="jobs")
