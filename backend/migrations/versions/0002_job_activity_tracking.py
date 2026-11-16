"""job activity tracking

Adds the columns that let a scrape retire postings it no longer returns.
Existing rows start active: they were all seen by the last run, and any that
have actually closed will be retired after SCRAPE_MISSES_BEFORE_INACTIVE runs.

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-16 23:29:12.288191

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # sa.true() instead of sa.text('1'): autogenerate rendered the SQLite form,
    # which Postgres rejects on a boolean column.
    op.add_column(
        "jobs",
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
    )
    op.add_column(
        "jobs",
        sa.Column("missed_runs", sa.Integer(), server_default=sa.text("0"), nullable=False),
    )
    op.create_index("ix_jobs_is_active", "jobs", ["is_active"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_jobs_is_active", table_name="jobs")
    op.drop_column("jobs", "missed_runs")
    op.drop_column("jobs", "is_active")
