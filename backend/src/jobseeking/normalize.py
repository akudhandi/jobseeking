"""Canonicalization helpers for companies, slugs, and datetimes."""

from __future__ import annotations

import re
from datetime import datetime, timezone

from dateutil import parser as dateparser

_COMPANY_NOISE = re.compile(
    r"\b(pt|cv|tbk|ltd|limited|inc|incorporated|corp|corporation|llc|gmbh|pte|co|"
    r"company|group|indonesia|persero|perseroda|koperasi)\b"
)


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")


def company_name_norm(name: str) -> str:
    """Lowercase, drop common corporate suffixes/noise, collapse whitespace."""
    n = (name or "").lower()
    n = re.sub(r"[^a-z0-9\s]", " ", n)
    n = _COMPANY_NOISE.sub(" ", n)
    n = re.sub(r"\s+", " ", n).strip()
    return n


def parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        dt = dateparser.parse(value)
    except (ValueError, OverflowError, TypeError):
        return None
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt
