"""salary provenance and plausibility cleanup

Adds ``jobs.salary_source`` — the description line a salary was read from — and
clears values the parser can no longer justify.

Everything still stored came from the old parser, which had two defects:
``p\\.?a\\.?`` matched the "pa" inside ordinary Indonesian words ("pengalaman",
"aplikasi"), so the whole description was treated as annual and every monthly
amount was divided by twelve; and the multiplier "m" matched the first letter of
any word, so "20 Min" became Rp 20.000.000. Rows outside the monthly
plausibility range are dropped here rather than shown as real salaries. Rows
whose raw HTML still has a description are rebuilt by ``--replay-raw`` anyway;
this covers the ones whose raw page is now a login wall.

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-17 01:30:00.000000

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Same bounds as jobseeking.parse.salary; duplicated because a migration must
# keep describing the schema as it was at this revision, even if the parser
# bounds are tuned later.
CLEANUP = """
UPDATE jobs
SET salary_min = NULL,
    salary_max = NULL,
    salary_period = NULL,
    salary_source = NULL
WHERE salary_min < 1000000
   OR salary_min > 150000000
   OR salary_max < 1000000
   OR salary_max > 150000000
"""


def upgrade() -> None:
    op.add_column("jobs", sa.Column("salary_source", sa.Text(), nullable=True))
    op.execute(CLEANUP)


def downgrade() -> None:
    op.drop_column("jobs", "salary_source")
