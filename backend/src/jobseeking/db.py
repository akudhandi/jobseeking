"""Database engine, session factory, and declarative base."""

from __future__ import annotations

import logging
from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import BACKEND_DIR, get_settings


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
    """Bring the schema up to date.

    Postgres runs the versioned Alembic migrations, which is a no-op once the
    database is at head. SQLite is only used by the tests, where the models are
    the schema, so those tables are created directly.
    """
    from . import models  # noqa: F401  (register mappers)

    engine = get_engine()
    if engine.dialect.name != "postgresql":
        Base.metadata.create_all(bind=engine)
        return
    _run_migrations()


def _run_migrations() -> None:
    """Apply every pending revision (``alembic upgrade head``)."""
    # Alembic registers its autogenerate plugins the moment it is imported, and
    # each registration logs a line at INFO. It has to be silenced before the
    # import, otherwise the api and scraper print six lines on every start.
    logging.getLogger("alembic.runtime.plugins").setLevel(logging.WARNING)

    from alembic import command
    from alembic.config import Config

    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    # Set explicitly so the migrations are found even when the process cwd is not
    # the backend directory (containers, cron, uvicorn).
    cfg.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
    # ConfigParser interpolation: a literal % in the password must be doubled.
    cfg.set_main_option("sqlalchemy.url", get_settings().database_url.replace("%", "%%"))
    command.upgrade(cfg, "head")
