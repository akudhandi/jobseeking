"""Requirement bullet extraction and experience parsing."""

from __future__ import annotations

import re
from dataclasses import dataclass, field

BULLET_RE = re.compile(r"^\s*(?:[-*•·‣▪◦o]|\d+[.)])\s+")

REQ_KEYWORDS = (
    "pengalaman", "experience", "minimal", "minimum", "sarjana", "bachelor",
    "s1", "s2", "d3", "diploma", "menguasai", "mampu", "memahami", "familiar",
    "proficient", "wajib", "must", "required", "requirement", "kemampuan",
    "ability", "knowledge", "strong", "understanding", "domisili", "usia",
    "bertanggung jawab", "responsib", "kualifikasi", "qualification", "skill",
    "terbiasa", "mengerti", "having", "possess", "bisa", "dapat",
)

YEAR_RE = re.compile(r"(\d{1,2})\s*\+?\s*(?:tahun|years?)\b", re.IGNORECASE)


@dataclass
class Requirements:
    items: list[str] = field(default_factory=list)
    min_years: int | None = None


def _looks_like_requirement(line: str) -> bool:
    lowered = line.lower()
    if len(line) < 4 or len(line) > 320:
        return False
    if BULLET_RE.match(line):
        return True
    return any(kw in lowered for kw in REQ_KEYWORDS)


def extract_min_years(text: str) -> int | None:
    years = [int(m.group(1)) for m in YEAR_RE.finditer(text)]
    years = [y for y in years if 0 < y <= 40]
    return min(years) if years else None


def parse_requirements(description: str | None, *, limit: int = 40) -> Requirements:
    if not description:
        return Requirements()
    lines: list[str] = []
    for raw in description.splitlines():
        line = raw.strip()
        if not line:
            continue
        line = BULLET_RE.sub("", line).strip()
        if _looks_like_requirement(line):
            lines.append(line)

    seen: set[str] = set()
    items: list[str] = []
    for line in lines:
        key = line.lower()
        if key in seen:
            continue
        seen.add(key)
        items.append(line)
        if len(items) >= limit:
            break

    return Requirements(items=items, min_years=extract_min_years(description))
