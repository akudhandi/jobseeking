"""Location normalization and work-type detection."""

from __future__ import annotations

import re
from dataclasses import dataclass

PROVINCE_ALIASES: dict[str, str] = {
    "jawa timur": "Jawa Timur",
    "east java": "Jawa Timur",
    "jatim": "Jawa Timur",
    "jawa barat": "Jawa Barat",
    "west java": "Jawa Barat",
    "jawa tengah": "Jawa Tengah",
    "central java": "Jawa Tengah",
    "dki jakarta": "DKI Jakarta",
    "jakarta": "DKI Jakarta",
    "banten": "Banten",
    "di yogyakarta": "DI Yogyakarta",
    "yogyakarta": "DI Yogyakarta",
    "bali": "Bali",
    "jawa": "Jawa",
}

REMOTE_RE = re.compile(r"\b(remote|wfh|work from home|kerja dari rumah|remote work|fully remote)\b", re.I)
HYBRID_RE = re.compile(r"\b(hybrid|hibrida|sebagian remote)\b", re.I)
ONSITE_RE = re.compile(r"\b(onsite|on-site|on site|wfo|work from office|di kantor)\b", re.I)


@dataclass
class LocationInfo:
    city: str | None
    province: str | None
    is_jatim: bool


def parse_location(raw: str | None, jatim_cities: list[str] | None = None) -> LocationInfo:
    if not raw:
        return LocationInfo(None, None, False)

    jatim_lower = {c.lower() for c in (jatim_cities or [])}
    parts = [p.strip() for p in raw.split(",") if p.strip()]
    city = parts[0] if parts else None
    if city and city.lower() in {"remote", "anywhere", "indonesia", "worldwide"}:
        city = None

    province: str | None = None
    joined = raw.lower()
    for alias, canonical in PROVINCE_ALIASES.items():
        if re.search(rf"(?<![a-z]){re.escape(alias)}(?![a-z])", joined):
            province = canonical
            break

    is_jatim = province == "Jawa Timur"
    if not is_jatim and city and city.lower() in jatim_lower:
        is_jatim = True
        province = province or "Jawa Timur"

    return LocationInfo(city=city, province=province, is_jatim=is_jatim)


def detect_work_type(*texts: str | None) -> str:
    blob = " ".join(t for t in texts if t)
    if not blob:
        return "unknown"
    if HYBRID_RE.search(blob):
        return "hybrid"
    if REMOTE_RE.search(blob):
        return "remote"
    if ONSITE_RE.search(blob):
        return "onsite"
    return "unknown"
