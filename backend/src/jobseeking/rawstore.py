"""Raw HTML persistence so crawls can be re-parsed without hitting the network."""

from __future__ import annotations

import re
from pathlib import Path

from .config import RAW_DIR

_SAFE = re.compile(r"[^A-Za-z0-9._-]+")


def _slug(name: str) -> str:
    return _SAFE.sub("_", name).strip("_")[:180]


def save_raw(kind: str, name: str, html: str) -> Path:
    directory = RAW_DIR / kind
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / f"{_slug(name)}.html"
    path.write_text(html, encoding="utf-8")
    return path


def list_raw(kind: str) -> list[Path]:
    directory = RAW_DIR / kind
    if not directory.exists():
        return []
    return sorted(directory.glob("*.html"))


def read_raw(path: str | Path) -> str:
    return Path(path).read_text(encoding="utf-8")
