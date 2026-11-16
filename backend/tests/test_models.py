"""Schema guards for columns that hold the full search matrix."""

from __future__ import annotations

from sqlalchemy import Integer, Text

from jobseeking.models import CrawlRun, Job


def test_crawl_run_matrix_columns_are_unbounded_text():
    # The pipeline joins every keyword/location into these columns; a varchar
    # limit would truncate the insert and kill the run before scraping starts.
    for column in ("keyword", "location"):
        assert isinstance(CrawlRun.__table__.c[column].type, Text)


def test_job_has_experience_and_timestamps():
    columns = Job.__table__.c
    assert isinstance(columns["min_years_experience"].type, Integer)
    assert "updated_at" in columns
    assert columns["updated_at"].nullable is False
