"""Database engine, session factory, and declarative base."""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


_engine = None
_SessionLocal: sessionmaker[Session] | None = None


def get_engine():
    global _engine
    if _engine is None:
        _engine = create_engine(get_settings().database_url, pool_pre_ping=True, future=True)
    return _engine


def get_session_factory() -> sessionmaker[Session]:
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(bind=get_engine(), expire_on_commit=False, future=True)
    return _SessionLocal


@contextmanager
def session_scope() -> Iterator[Session]:
    """Transactional scope: commit on success, rollback on error."""
    session = get_session_factory()()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def init_db() -> None:
    """Create all tables (idempotent) and apply additive column changes."""
    from . import models  # noqa: F401  (register mappers)

    Base.metadata.create_all(bind=get_engine())
    _apply_additive_columns()


# Columns introduced after the first deploy. ``create_all`` never ALTERs an
# existing table, and dropping the volume to migrate means losing every job, so
# additive changes are applied here. Postgres supports IF NOT EXISTS; SQLite
# test databases are created fresh from the models and skip this path.
ADDITIVE_COLUMNS: tuple[tuple[str, str, str], ...] = (
    ("jobs", "min_years_experience", "INTEGER"),
    ("jobs", "updated_at", "TIMESTAMPTZ NOT NULL DEFAULT now()"),
)


def _apply_additive_columns() -> None:
    engine = get_engine()
    if engine.dialect.name != "postgresql":
        return
    with engine.begin() as conn:
        for table, column, ddl in ADDITIVE_COLUMNS:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {ddl}"))
