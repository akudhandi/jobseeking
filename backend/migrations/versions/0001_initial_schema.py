"""initial schema

Baseline revision. It describes the schema that was built by
``Base.metadata.create_all`` before Alembic took over, so an existing database
is brought under version control with ``alembic stamp 0001`` instead of being
re-created (the jobs volume must never be dropped).

Revision ID: 0001
Revises:
Create Date: 2026-11-16 23:05:30.162262

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# CURRENT_TIMESTAMP instead of now(): identical meaning on Postgres, and it also
# parses on the SQLite database the schema test migrates from scratch.
NOW = sa.text("CURRENT_TIMESTAMP")


def upgrade() -> None:
    op.create_table(
        "companies",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name_raw", sa.String(length=255), nullable=False),
        sa.Column("name_norm", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_companies_name_norm", "companies", ["name_norm"], unique=True)
    op.create_index("ix_companies_slug", "companies", ["slug"], unique=True)

    op.create_table(
        "crawl_runs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("keyword", sa.Text(), nullable=True),
        sa.Column("location", sa.Text(), nullable=True),
        sa.Column("pages_fetched", sa.Integer(), nullable=False),
        sa.Column("jobs_found", sa.Integer(), nullable=False),
        sa.Column("jobs_new", sa.Integer(), nullable=False),
        sa.Column("jobs_updated", sa.Integer(), nullable=False),
        sa.Column("jobs_failed", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "locations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("city", sa.String(length=120), nullable=False),
        sa.Column("province", sa.String(length=120), nullable=False),
        sa.Column("is_jatim", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_locations_city", "locations", ["city"], unique=True)
    op.create_index("ix_locations_is_jatim", "locations", ["is_jatim"], unique=False)

    op.create_table(
        "skills",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column("category", sa.String(length=40), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_skills_category", "skills", ["category"], unique=False)
    op.create_index("ix_skills_name", "skills", ["name"], unique=True)
    op.create_index("ix_skills_slug", "skills", ["slug"], unique=True)

    op.create_table(
        "jobs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("job_id", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=512), nullable=False),
        sa.Column("url", sa.String(length=1024), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=True),
        sa.Column("location_raw", sa.String(length=512), nullable=True),
        sa.Column("city", sa.String(length=120), nullable=True),
        sa.Column("province", sa.String(length=120), nullable=True),
        sa.Column("is_jatim", sa.Boolean(), nullable=False),
        sa.Column("work_type", sa.String(length=20), nullable=False),
        sa.Column("employment_type", sa.String(length=40), nullable=True),
        sa.Column("seniority", sa.String(length=20), nullable=True),
        sa.Column("salary_min", sa.Float(), nullable=True),
        sa.Column("salary_max", sa.Float(), nullable=True),
        sa.Column("salary_period", sa.String(length=20), nullable=True),
        sa.Column("salary_currency", sa.String(length=8), nullable=False),
        sa.Column("posted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("scraped_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.Column("description_raw", sa.Text(), nullable=True),
        sa.Column("requirements", sa.JSON(), nullable=True),
        sa.Column("min_years_experience", sa.Integer(), nullable=True),
        sa.Column("search_keyword", sa.String(length=255), nullable=True),
        sa.Column("source", sa.String(length=40), nullable=False),
        sa.Column("run_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["run_id"], ["crawl_runs.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_jobs_city", "jobs", ["city"], unique=False)
    op.create_index("ix_jobs_company_id", "jobs", ["company_id"], unique=False)
    op.create_index("ix_jobs_is_jatim", "jobs", ["is_jatim"], unique=False)
    op.create_index("ix_jobs_job_id", "jobs", ["job_id"], unique=True)
    op.create_index("ix_jobs_seniority", "jobs", ["seniority"], unique=False)
    op.create_index("ix_jobs_title", "jobs", ["title"], unique=False)
    op.create_index("ix_jobs_work_type", "jobs", ["work_type"], unique=False)

    op.create_table(
        "job_skills",
        sa.Column("job_id", sa.Integer(), nullable=False),
        sa.Column("skill_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["skill_id"], ["skills.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("job_id", "skill_id"),
    )


def downgrade() -> None:
    op.drop_table("job_skills")
    op.drop_index("ix_jobs_work_type", table_name="jobs")
    op.drop_index("ix_jobs_title", table_name="jobs")
    op.drop_index("ix_jobs_seniority", table_name="jobs")
    op.drop_index("ix_jobs_job_id", table_name="jobs")
    op.drop_index("ix_jobs_is_jatim", table_name="jobs")
    op.drop_index("ix_jobs_company_id", table_name="jobs")
    op.drop_index("ix_jobs_city", table_name="jobs")
    op.drop_table("jobs")
    op.drop_index("ix_skills_slug", table_name="skills")
    op.drop_index("ix_skills_name", table_name="skills")
    op.drop_index("ix_skills_category", table_name="skills")
    op.drop_table("skills")
    op.drop_index("ix_locations_is_jatim", table_name="locations")
    op.drop_index("ix_locations_city", table_name="locations")
    op.drop_table("locations")
    op.drop_table("crawl_runs")
    op.drop_index("ix_companies_slug", table_name="companies")
    op.drop_index("ix_companies_name_norm", table_name="companies")
    op.drop_table("companies")
