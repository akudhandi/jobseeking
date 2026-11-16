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

REMOTE_RE = re.compile(
    r"\b(remote|wfh|work from home|kerja dari rumah|remote work|fully remote)\b", re.I
)
HYBRID_RE = re.compile(r"\b(hybrid|hibrida|sebagian remote)\b", re.I)
ONSITE_RE = re.compile(r"\b(onsite|on-site|on site|wfo|work from office|di kantor)\b", re.I)

# "Kota Malang", "Kab. Sidoarjo", "Kecamatan Blimbing", "Surabaya dan Sekitarnya"
_CITY_PREFIX_RE = re.compile(
    r"^(kota administrasi|kota|kabupaten|kab\.?|kecamatan|kec\.?|kelurahan|kel\.?|desa|ds\.?|"
    r"city of|district of|subdistrict of|municipality of)\s+",
    re.I,
)
_CITY_SUFFIX_RE = re.compile(
    r"\s+(dan\s+sekitarnya|and\s+surrounding\s+area|greater\s+area|area|region)\s*$", re.I
)

# LinkedIn sometimes reports the kecamatan instead of the city. Only the
# metro-area districts are mapped; anything unknown is kept verbatim rather
# than guessed into the wrong city. Applied only inside Jawa Timur.
DISTRICT_CITY: dict[str, str] = {
    # Malang
    "blimbing": "Malang",
    "lowokwaru": "Malang",
    "klojen": "Malang",
    "sukun": "Malang",
    "kedungkandang": "Malang",
    # Surabaya
    "gubeng": "Surabaya",
    "rungkut": "Surabaya",
    "sukolilo": "Surabaya",
    "tambaksari": "Surabaya",
    "sawahan": "Surabaya",
    "tegalsari": "Surabaya",
    "genteng": "Surabaya",
    "wonokromo": "Surabaya",
    "karang pilang": "Surabaya",
    "dukuh pakis": "Surabaya",
    "wiyung": "Surabaya",
    "mulyorejo": "Surabaya",
    "tenggilis mejoyo": "Surabaya",
    "gunung anyar": "Surabaya",
    "jambangan": "Surabaya",
    "gayungan": "Surabaya",
    "kenjeran": "Surabaya",
    "semampir": "Surabaya",
    "bubutan": "Surabaya",
    "simokerto": "Surabaya",
    "pabean cantian": "Surabaya",
    "asemrowo": "Surabaya",
    "benowo": "Surabaya",
    "sambikerep": "Surabaya",
    "lakarsantri": "Surabaya",
    # Sidoarjo
    "waru": "Sidoarjo",
    "gedangan": "Sidoarjo",
    "buduran": "Sidoarjo",
    "candi": "Sidoarjo",
    "taman": "Sidoarjo",
    "krian": "Sidoarjo",
    "sukodono": "Sidoarjo",
    "sedati": "Sidoarjo",
    "tanggulangin": "Sidoarjo",
    "wonoayu": "Sidoarjo",
    "porong": "Sidoarjo",
    # Gresik
    "kebomas": "Gresik",
    "manyar": "Gresik",
    "cerme": "Gresik",
    "driyorejo": "Gresik",
    "menganti": "Gresik",
}


def _is_province_name(city: str, province: str | None) -> bool:
    lowered = city.lower()
    if province and lowered == province.lower():
        return True
    return lowered in PROVINCE_ALIASES


def _canonical_city(
    raw_city: str, jatim_cities: list[str] | None, province: str | None = None
) -> str | None:
    city = _CITY_PREFIX_RE.sub("", raw_city).strip()
    city = _CITY_SUFFIX_RE.sub("", city).strip()
    if not city:
        return None
    # "Jawa Timur" / "East Java" is the province, not a city.
    if _is_province_name(city, province):
        return None
    # District reported instead of the city: only map it for Jawa Timur.
    if province in (None, "Jawa Timur"):
        mapped = DISTRICT_CITY.get(city.lower())
        if mapped:
            return mapped
    lowered = city.lower()
    for canon in jatim_cities or []:
        if canon.lower() == lowered:
            return canon
    return city


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

    joined = raw.lower()
    province: str | None = None
    for alias, canonical in PROVINCE_ALIASES.items():
        if re.search(rf"(?<![a-z]){re.escape(alias)}(?![a-z])", joined):
            province = canonical
            break

    if city:
        city = _canonical_city(city, jatim_cities, province)

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
