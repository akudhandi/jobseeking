"""Raw HTML persistence so crawls can be re-parsed without hitting the network."""

from __future__ import annotations

import re
from pathlib import Path

from .config import RAW_DIR

_SAFE = re.compile(r"[^A-Za-z0-9._-]+")


def slug(name: str) -> str:
    """File-name-safe form of a search keyword/location.

    Exposed because callers must be able to reverse it: the raw search files are
    named after their search, and replay maps the slug back to the keyword.
    """
    return _SAFE.sub("_", name).strip("_")[:180]


def save_raw(kind: str, name: str, html: str) -> Path:
    directory = RAW_DIR / kind
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / f"{slug(name)}.html"
    path.write_text(html, encoding="utf-8")
    return path


def list_raw(kind: str) -> list[Path]:
    directory = RAW_DIR / kind
    if not directory.exists():
        return []
    return sorted(directory.glob("*.html"))


def read_raw(path: str | Path) -> str:
    return Path(path).read_text(encoding="utf-8")
