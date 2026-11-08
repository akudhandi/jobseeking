"""Salary extraction from free-text job descriptions (IDR-oriented)."""

from __future__ import annotations

import re
from dataclasses import dataclass

MULT: dict[str, float] = {
    "juta": 1e6,
    "jt": 1e6,
    "mio": 1e6,
    "m": 1e6,
    "miliar": 1e9,
    "rb": 1e3,
    "ribu": 1e3,
    "k": 1e3,
}

CUR_WINDOW_RE = re.compile(r"(rp\.?|idr|rupiah)\s*$", re.IGNORECASE)
PERIOD_YEAR_RE = re.compile(
    r"(per\s*tahun|per\s*annum|/\s*(tahun|year|yr|annum)\b|p\.?a\.?|annually|yearly)", re.IGNORECASE
)
PERIOD_HOUR_RE = re.compile(r"(per\s*jam|/\s*(jam|hour|hr)\b|hourly|/hr)", re.IGNORECASE)

NUMBER_RE = re.compile(
    r"(?P<num>\d[\d.,]*)"
    r"\s*(?P<mult>juta|jt|mio|ribu|rb|miliar|k|m)?",
    re.IGNORECASE,
)
SEP_RE = re.compile(r"\s*(?:-|–|—|to|s/d|s\.?d|sampai|hingga|s\.d\.)\s*", re.IGNORECASE)


@dataclass
class SalaryRange:
    min: float | None
    max: float | None
    period: str = "month"  # month | year | hour
    currency: str = "IDR"


def _to_number(num: str) -> float:
    num = num.strip().rstrip(".,")
    if re.fullmatch(r"\d{1,3}([.,]\d{3})+", num):  # 10.000.000 or 10,000,000
        return float(re.sub(r"[.,]", "", num))
    if "," in num and "." not in num:
        if re.fullmatch(r"\d+,\d{1,2}", num):  # 8,5  decimal
            return float(num.replace(",", "."))
        return float(num.replace(",", ""))
    if "." in num and "," not in num:
        if re.fullmatch(r"\d+\.\d{1,2}", num):  # 8.5 decimal
            return float(num)
        return float(num.replace(".", ""))
    if "." in num and "," in num:  # 1.234.567,89
        return float(num.replace(".", "").replace(",", "."))
    return float(num)


def _detect_period(text: str) -> str:
    if PERIOD_YEAR_RE.search(text):
        return "year"
    if PERIOD_HOUR_RE.search(text):
        return "hour"
    return "month"


def _extract_values(text: str) -> list[float]:
    matches = list(NUMBER_RE.finditer(text))
    # group consecutive numbers joined by range separators
    groups: list[list[re.Match[str]]] = []
    current: list[re.Match[str]] = []
    for match in matches:
        if not current:
            current = [match]
            continue
        gap = text[current[-1].end() : match.start()]
        if SEP_RE.fullmatch(gap):
            current.append(match)
        else:
            groups.append(current)
            current = [match]
    if current:
        groups.append(current)

    values: list[float] = []
    for group in groups:
        has_cur = any(CUR_WINDOW_RE.search(text[max(0, m.start() - 8) : m.start()]) for m in group)
        group_mult = next(
            (MULT[m.group("mult").lower()] for m in reversed(group) if m.group("mult")), None
        )
        if not has_cur and group_mult is None:
            continue
        for m in group:
            mult = MULT.get(m.group("mult").lower()) if m.group("mult") else group_mult
            values.append(_to_number(m.group("num")) * (mult or 1.0))
    return values


def parse_salary(text: str | None) -> SalaryRange | None:
    if not text:
        return None
    t = text.lower().replace("\u00a0", " ").replace("\u2022", " ")
    period = _detect_period(t)

    values = _extract_values(t)
    if not values:
        return None

    floor = {"month": 300_000, "year": 6_000_000, "hour": 5_000}[period]
    ceiling = {"month": 2_000_000_000, "year": 24_000_000_000, "hour": 10_000_000}[period]
    values = [v for v in values if floor <= v <= ceiling]
    if not values:
        return None

    lo, hi = min(values), max(values)
    if period == "year":
        lo, hi = lo / 12, hi / 12
        period = "month"
    return SalaryRange(min=round(lo), max=round(hi), period=period, currency="IDR")
