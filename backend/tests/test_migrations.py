"""The Alembic baseline must stay identical to the ORM models.

Prod already has the schema, so a baseline that drifts from ``models.py`` would
only show up as a broken deploy. Migrate a throwaway SQLite database from zero
and compare the result to the metadata instead.
"""

from __future__ import annotations

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import Engine, create_engine, inspect

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
