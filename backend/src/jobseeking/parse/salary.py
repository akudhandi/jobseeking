"""Salary extraction from free-text job descriptions (IDR, normalised to monthly).

A job description is not a salary field: it mixes Indonesian and English and is
full of numbers that are not compensation ("3 tahun pengalaman", "20 juta
pengguna", "20 Min"). Everything here works line by line and only trusts a line
that carries a rupiah amount, or an explicit salary word together with an
Indonesian multiplier ("Gaji 8-10 juta"). The period is read from that line —
never from the whole description, which is how "Rp 6.000.000,00/bln" used to be
divided by twelve because "pengalaman" contains "pa" and the old year pattern
matched any `p.a.` substring.

The result is always monthly IDR. Foreign-currency postings are left empty
instead of being converted at a guessed exchange rate, and implausible monthly
values are dropped rather than skewing the averages. ``source`` keeps the line
the number came from so an outlier can be audited later, even after the raw HTML
is gone.
"""

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

# Rupiah amounts are the only ones that can be trusted without an exchange rate.
IDR_RE = re.compile(r"(?<![a-z])(?:rp\.?|idr|rupiah)(?![a-z])", re.IGNORECASE)
FOREIGN_RE = re.compile(r"(?:us\$|usd|sgd|myr|php|thb|eur|gbp|aud|\$|€|£)", re.IGNORECASE)
SALARY_WORD_RE = re.compile(
    r"\b(?:gaji|salary|upah|kompensasi|compensation|remunerasi|tunjangan|penghasilan|"
    r"pendapatan|honor|honorarium|rate|dibayar|dibayarkan|fee)\b",
    re.IGNORECASE,
)
IDR_MULT_RE = re.compile(r"(?<![a-z])(?:juta|jt|mio|miliar|ribu|rb)(?![a-z])", re.IGNORECASE)

PERIOD_YEAR_RE = re.compile(
    r"(?<![a-z])(?:per\s*(?:tahun|year|yr|annum)|/\s*(?:tahun|year|yr|annum)|annually|yearly)(?![a-z])"
    r"|(?<![a-z])p\.a\.?(?![a-z])",
    re.IGNORECASE,
)
PERIOD_HOUR_RE = re.compile(
    r"(?<![a-z])(?:per\s*(?:jam|hour|hr)|/\s*(?:jam|hour|hr)|hourly)(?![a-z])",
    re.IGNORECASE,
)
PERIOD_DAY_RE = re.compile(
    r"(?<![a-z])(?:per\s*(?:hari|day)|/\s*(?:hari|day)|daily)(?![a-z])",
    re.IGNORECASE,
)
PERIOD_WEEK_RE = re.compile(
    r"(?<![a-z])(?:per\s*(?:minggu|week|wk)|/\s*(?:minggu|week|wk)|weekly)(?![a-z])",
    re.IGNORECASE,
)

# 40 h/week, 52 weeks, 260 workdays a year — the conventional full-time basis.
PERIOD_FACTOR: dict[str, float] = {
    "month": 1.0,
    "year": 1 / 12,
    "week": 52 / 12,
    "day": 260 / 12,
    "hour": 40 * 52 / 12,
}

# Monthly gross rupiah a developer posting can plausibly offer. Below this it is
# an allowance or a typo; above it the number came from some other context.
MIN_MONTHLY = 1_000_000
MAX_MONTHLY = 150_000_000

NUMBER_RE = re.compile(
    r"(?P<num>\d[\d.,]*)\s*(?:(?P<mult>juta|jt|mio|miliar|ribu|rb|k|m)(?![a-z]))?",
    re.IGNORECASE,
)
SEP_RE = re.compile(r"\s*(?:-|–|—|to|s/d|s\.?d|sampai|hingga|s\.d\.)\s*", re.IGNORECASE)


@dataclass
class SalaryRange:
    min: float | None
    max: float | None
    period: str = "month"  # always "month": values are normalised before storage
    currency: str = "IDR"
    source: str | None = None


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
    if PERIOD_DAY_RE.search(text):
        return "day"
    if PERIOD_WEEK_RE.search(text):
        return "week"
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
        has_cur = any(IDR_RE.search(text[max(0, m.start() - 10) : m.start()]) for m in group)
        group_mult = next(
            (MULT[m.group("mult").lower()] for m in reversed(group) if m.group("mult")), None
        )
        # A bare number ("20 Min", "3 tahun") is never a salary on its own.
        if not has_cur and group_mult is None:
            continue
        for m in group:
            mult = MULT.get(m.group("mult").lower()) if m.group("mult") else group_mult
            values.append(_to_number(m.group("num")) * (mult or 1.0))
    return values


def _is_candidate(line: str) -> bool:
    if FOREIGN_RE.search(line):
        return False
    if IDR_RE.search(line):
        return True
    # "Gaji 8-10 juta" is common enough to accept without the "Rp" prefix.
    return bool(SALARY_WORD_RE.search(line) and IDR_MULT_RE.search(line))


def parse_salary(text: str | None) -> SalaryRange | None:
    if not text:
        return None
    clean = text.replace("\u00a0", " ").replace("\u2022", " ")
    lines = [line.strip() for line in clean.splitlines() if line.strip()]

    for index, line in enumerate(lines):
        if not _is_candidate(line):
            continue
        # A range split across two lines ("Gaji pokok" / "Rp ... per tahun") carries
        # its period on the neighbour, so widen the window for period detection.
        window = line if index + 1 >= len(lines) else f"{line} {lines[index + 1]}"
        factor = PERIOD_FACTOR[_detect_period(window)]

        monthly = [round(value * factor) for value in _extract_values(line)]
        monthly = [value for value in monthly if MIN_MONTHLY <= value <= MAX_MONTHLY]
        if not monthly:
            continue
        return SalaryRange(
            min=min(monthly),
            max=max(monthly),
            period="month",
            currency="IDR",
            source=line[:400],
        )
    return None
