"""Seniority detection from LinkedIn criteria, title, and description."""

from __future__ import annotations

import re

LEVEL_MAP: dict[str, str] = {
    "internship": "intern",
    "intern": "intern",
    "entry level": "junior",
    "entry": "junior",
    "associate": "mid",
    "mid-senior level": "mid",
    "mid level": "mid",
    "senior level": "senior",
    "director": "lead",
    "executive": "lead",
    "not applicable": "unknown",
}

TITLE_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("lead", re.compile(r"\b(lead|principal|head of|chief|vp|vice president|manager|architect)\b")),
    ("senior", re.compile(r"\b(senior|sr\.?|experienced|expert)\b")),
    ("junior", re.compile(r"\b(junior|jr\.?|entry|fresh graduate|freshgrad|magang)\b")),
    ("intern", re.compile(r"\b(intern|internship|trainee|magang)\b")),
]

DESC_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("senior", re.compile(r"\b(5|6|7|8|9|10)\+?\s*(?:tahun|years?)\b")),
    ("junior", re.compile(r"\b(0|1|2)\s*(?:tahun|years?)\b")),
]


def detect_seniority(
    *, level: str | None = None, title: str | None = None, description: str | None = None
) -> str:
    if level:
        mapped = LEVEL_MAP.get(level.strip().lower())
        if mapped:
            return mapped

    if title:
        lowered = title.lower()
        # check intern before junior/senior so "Internal" style titles don't mislead badly
        for name, pattern in TITLE_PATTERNS:
            if pattern.search(lowered):
                return name

    if description:
        lowered = description.lower()
        for name, pattern in DESC_PATTERNS:
            if pattern.search(lowered):
                return name

    return "unknown"
