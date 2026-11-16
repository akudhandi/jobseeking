"""job keywords

Replaces the single ``jobs.search_keyword`` column with a table, because one
posting is routinely returned by several searches and the column only kept the
last one written.

The backfill runs before the drop, in the same transaction, so the keyword that
is currently stored is carried over for every existing posting.

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-17 00:02:49.287649

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

BACKFILL = """
INSERT INTO job_keywords (job_id, keyword)
SELECT id, search_keyword
FROM jobs
WHERE search_keyword IS NOT NULL AND search_keyword <> ''
"""


def upgrade() -> None:
    op.create_table(
        "job_keywords",
        sa.Column("job_id", sa.Integer(), nullable=False),
        sa.Column("keyword", sa.String(length=255), nullable=False),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("job_id", "keyword"),
    )
    op.create_index("ix_job_keywords_keyword", "job_keywords", ["keyword"], unique=False)

    # Data migration first: dropping the column is irreversible, the copy is not.
    op.execute(BACKFILL)

    op.drop_column("jobs", "search_keyword")


def downgrade() -> None:
    op.add_column("jobs", sa.Column("search_keyword", sa.String(length=255), nullable=True))
    # Only one keyword fits back into the column; keep the alphabetically first
    # so the downgrade is deterministic. The rest lives on in job_keywords until
    # the table is dropped below.
    op.execute(
        """
        UPDATE jobs
        SET search_keyword = (
            SELECT min(keyword) FROM job_keywords WHERE job_keywords.job_id = jobs.id
        )
        """
    )
    op.drop_index("ix_job_keywords_keyword", table_name="job_keywords")
    op.drop_table("job_keywords")
