"""Schema guards for columns that hold the full search matrix."""

from __future__ import annotations

from sqlalchemy import Text

from jobseeking.models import CrawlRun


def test_crawl_run_matrix_columns_are_unbounded_text():
    # The pipeline joins every keyword/location into these columns; a varchar
    # limit would truncate the insert and kill the run before scraping starts.
    for column in ("keyword", "location"):
        assert isinstance(CrawlRun.__table__.c[column].type, Text)
