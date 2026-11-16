"""Alembic environment for the jobseeking schema.

The database URL comes from the caller (tests set it explicitly) or from the
application settings, never from the ini file, so no credentials are tracked.
"""

from __future__ import annotations

from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection, engine_from_config

from jobseeking import models  # noqa: F401  (registers the mappers)
from jobseeking.config import get_settings
from jobseeking.db import Base

config = context.config

if config.config_file_name is not None:
    # disable_existing_loggers=False: init_db() runs inside the API and scraper
    # processes, and their loggers must survive the migration.
    fileConfig(config.config_file_name, disable_existing_loggers=False)

target_metadata = Base.metadata

# Session-level Postgres advisory lock. The API (--init-db) and the scraper both
# call init_db(), and a deploy can overlap a cron tick; without the lock the two
# could try to apply the same revision at once and fail on alembic_version.
LOCK_ID = 917_273_645


def _database_url() -> str:
    return config.get_main_option("sqlalchemy.url", "") or get_settings().database_url


def _configure(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        # SQLite cannot ALTER a column, so batch mode rewrites the table instead.
        # Keeps migrations runnable against a throwaway SQLite database.
        render_as_batch=connection.dialect.name == "sqlite",
    )


def run_migrations_offline() -> None:
    context.configure(
        url=_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    section = config.get_section(config.config_ini_section, {})
    section["sqlalchemy.url"] = _database_url()
    connectable = engine_from_config(section, prefix="sqlalchemy.", poolclass=pool.NullPool)

    with connectable.connect() as connection:
        if connection.dialect.name == "postgresql":
            connection.exec_driver_sql(f"SELECT pg_advisory_lock({LOCK_ID})")
            # Lock is session level, so committing here keeps it held while the
            # migrations run and releases it when the connection closes.
            connection.commit()
        _configure(connection)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
