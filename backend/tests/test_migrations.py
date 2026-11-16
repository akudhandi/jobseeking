"""The Alembic baseline must stay identical to the ORM models.

Prod already has the schema, so a baseline that drifts from ``models.py`` would
only show up as a broken deploy. Migrate a throwaway SQLite database from zero
and compare the result to the metadata instead.
"""

from __future__ import annotations

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import Engine, create_engine, inspect, text

from jobseeking import models  # noqa: F401  (registers the mappers)
from jobseeking.config import BACKEND_DIR
from jobseeking.db import Base


def _alembic_config(url: str) -> Config:
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
    cfg.set_main_option("sqlalchemy.url", url)
    return cfg


def _index_signature(engine: Engine, table: str) -> set[tuple[str, bool]]:
    """(column, unique) for every single-column index on a table."""
    signature = set()
    for index in inspect(engine).get_indexes(table):
        columns = index.get("column_names") or []
        if len(columns) == 1:
            signature.add((columns[0], bool(index.get("unique"))))
    return signature


@pytest.fixture(scope="module")
def migrated(tmp_path_factory: pytest.TempPathFactory) -> Engine:
    url = f"sqlite+pysqlite:///{(tmp_path_factory.mktemp('migrations') / 'm.db').as_posix()}"
    command.upgrade(_alembic_config(url), "head")
    engine = create_engine(url)
    yield engine
    engine.dispose()


def test_migration_creates_every_model_table(migrated: Engine):
    migrated_tables = set(inspect(migrated).get_table_names())
    model_tables = {table.name for table in Base.metadata.sorted_tables}

    assert model_tables <= migrated_tables
    # Alembic's version table is the only thing the migration may add on top.
    assert migrated_tables - model_tables == {"alembic_version"}


@pytest.mark.parametrize("table_name", [t.name for t in Base.metadata.sorted_tables])
def test_migration_matches_columns(migrated: Engine, table_name: str):
    table = Base.metadata.tables[table_name]
    migrated_columns = {c["name"] for c in inspect(migrated).get_columns(table_name)}
    assert migrated_columns == set(table.c.keys())


@pytest.mark.parametrize("table_name", [t.name for t in Base.metadata.sorted_tables])
def test_migration_matches_indexes(migrated: Engine, table_name: str):
    table = Base.metadata.tables[table_name]
    expected = {(index.columns.keys()[0], bool(index.unique)) for index in table.indexes}
    assert _index_signature(migrated, table_name) == expected


def test_keyword_column_is_backfilled_into_job_keywords(tmp_path):
    """0003 moves ``jobs.search_keyword`` into the new table.

    The backfill is the risky part of the migration — the drop is irreversible —
    so exercise it with real rows instead of only comparing DDL.
    """
    url = f"sqlite+pysqlite:///{(tmp_path / 'backfill.db').as_posix()}"
    cfg = _alembic_config(url)
    command.upgrade(cfg, "0002")

    engine = create_engine(url)
    insert = (
        "INSERT INTO jobs (job_id, title, url, is_jatim, work_type, salary_currency,"
        " source, search_keyword) VALUES (:job_id, :title, :url, 0, 'remote', 'IDR',"
        " 'linkedin', :keyword)"
    )
    with engine.begin() as conn:
        conn.execute(
            text(insert),
            {
                "job_id": "1",
                "title": "Backend Developer",
                "url": "u1",
                "keyword": "backend developer",
            },
        )
        # A posting with no keyword must not produce an empty row.
        conn.execute(
            text(insert),
            {"job_id": "2", "title": "No Keyword", "url": "u2", "keyword": None},
        )

    command.upgrade(cfg, "head")

    with engine.connect() as conn:
        rows = conn.execute(
            text(
                "SELECT j.job_id, k.keyword FROM jobs j"
                " JOIN job_keywords k ON k.job_id = j.id ORDER BY j.job_id"
            )
        ).all()
        assert rows == [("1", "backend developer")]
        assert "search_keyword" not in {c["name"] for c in inspect(engine).get_columns("jobs")}

    engine.dispose()


def test_salary_migration_adds_source_and_drops_implausible_values(tmp_path):
    """0004 removes salaries the parser can no longer justify (the period bug
    produced values like Rp 163.083.333/month) and keeps sane ones."""
    url = f"sqlite+pysqlite:///{(tmp_path / 'salary.db').as_posix()}"
    cfg = _alembic_config(url)
    command.upgrade(cfg, "0003")

    engine = create_engine(url)
    insert = (
        "INSERT INTO jobs (job_id, title, url, is_jatim, work_type, salary_currency,"
        " source, salary_min, salary_max, salary_period)"
        " VALUES (:job_id, 'Job', 'u', 0, 'remote', 'IDR', 'linkedin', :lo, :hi, 'month')"
    )
    with engine.begin() as conn:
        conn.execute(text(insert), {"job_id": "ok", "lo": 8_000_000, "hi": 10_000_000})
        conn.execute(text(insert), {"job_id": "year-bug", "lo": 163_083_333, "hi": 163_083_333})

    command.upgrade(cfg, "head")

    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT job_id, salary_min, salary_max FROM jobs ORDER BY job_id")
        ).all()
        assert rows == [("ok", 8_000_000, 10_000_000), ("year-bug", None, None)]
        assert "salary_source" in {c["name"] for c in inspect(engine).get_columns("jobs")}

    engine.dispose()
