"""Crawl LinkedIn guest job-detail pages."""

from __future__ import annotations

import re
from dataclasses import dataclass

from bs4 import BeautifulSoup, Tag

from . import rawstore
from .config import CrawlConfig, Settings
from .fetch import Fetcher, polite_delay

DETAIL_URL = "https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{job_id}"


@dataclass
class JobDetail:
    job_id: str
    title: str = ""
    company: str = ""
    location: str = ""
    description_html: str = ""
    description_text: str = ""
    seniority_level: str | None = None
    employment_type: str | None = None
    job_function: str | None = None
    industries: str | None = None
    posted_at: str | None = None


def _text(node: Tag | None) -> str:
    return node.get_text(" ", strip=True) if node else ""


# The crawl runs with locale=id-ID, so LinkedIn usually answers with Indonesian
# criteria labels ("Tingkat senioritas", "Jenis pekerjaan", ...). Match both
# languages and map everything onto one internal key per criterion.
CRITERIA_LABELS: dict[str, str] = {
    "seniority level": "seniority",
    "tingkat senioritas": "seniority",
    "employment type": "employment_type",
    "jenis pekerjaan": "employment_type",
    "job function": "job_function",
    "fungsi pekerjaan": "job_function",
    "industries": "industries",
    "industri": "industries",
}

# Values LinkedIn uses to mean "no data" — they must not become literal enums.
EMPTY_VALUES = {"", "-", "n/a", "na", "not applicable", "tidak berlaku", "tidak ditentukan"}

EMPLOYMENT_TYPES: dict[str, str] = {
    "full-time": "full_time",
    "full time": "full_time",
    "penuh waktu": "full_time",
    "part-time": "part_time",
    "part time": "part_time",
    "paruh waktu": "part_time",
    "contract": "contract",
    "kontrak": "contract",
    "temporary": "temporary",
    "sementara": "temporary",
    "internship": "internship",
    "magang": "internship",
    "volunteer": "volunteer",
    "relawan": "volunteer",
    "other": "other",
    "lainnya": "other",
}


def _clean_value(value: str | None) -> str | None:
    """Trim a criteria value and turn LinkedIn's placeholders into None."""
    if value is None:
        return None
    cleaned = value.strip().strip(":").strip()
    if cleaned.lower() in EMPTY_VALUES:
        return None
    return cleaned


def canonical_employment_type(value: str | None) -> str | None:
    """Map "Penuh waktu" / "Full-time" onto one stable enum for analytics."""
    cleaned = _clean_value(value)
    if cleaned is None:
        return None
    key = cleaned.lower()
    if key in EMPLOYMENT_TYPES:
        return EMPLOYMENT_TYPES[key]
    # Unknown wording: keep it machine-friendly instead of dropping information.
    return re.sub(r"[^a-z0-9]+", "_", key).strip("_")[:40] or None


def _criteria(soup: BeautifulSoup) -> dict[str, str | None]:
    out: dict[str, str | None] = {}
    for item in soup.select("li.description__job-criteria-item"):
        raw_label = _text(item.select_one("h3, .description__job-criteria-subheader"))
        key = CRITERIA_LABELS.get(raw_label.strip().strip(":").lower())
        if key is None:
            continue
        out[key] = _clean_value(_text(item.select_one("span, .description__job-criteria-text")))
    return out


def parse_job_detail(html: str, job_id: str) -> JobDetail:
    soup = BeautifulSoup(html, "lxml")

    title = _text(soup.select_one("h2.top-card-layout__title, h1.topcard__title, h1"))
    company = _text(
        soup.select_one(
            "a.topcard__org-name-link, .topcard__org-name-link, h4.topcard__flavor, "
            ".topcard__flavor--black-link"
        )
    )
    if not company:
        company = _text(soup.select_one(".topcard__flavor"))
    location = _text(soup.select_one("span.topcard__flavor--bullet, .topcard__flavor--bullet"))
    if not location:
        location = _text(soup.select_one(".topcard__flavor"))

    desc = soup.select_one(".show-more-less-html__markup, .description__text, .decorated-job-posting__details")
    description_html = str(desc) if desc else ""
    description_text = desc.get_text("\n", strip=True) if desc else ""

    criteria = _criteria(soup)
    time_el = soup.select_one("time, .posting-time-filter time")

    return JobDetail(
        job_id=job_id,
        title=title,
        company=company,
        location=location,
        description_html=description_html,
        description_text=description_text,
        seniority_level=criteria.get("seniority"),
        employment_type=canonical_employment_type(criteria.get("employment_type")),
        job_function=criteria.get("job_function"),
        industries=criteria.get("industries"),
        posted_at=str(time_el.get("datetime")) if time_el and time_el.get("datetime") else None,
    )


class DetailCrawler:
    def __init__(self, fetcher: Fetcher, settings: Settings, config: CrawlConfig):
        self.fetcher = fetcher
        self.settings = settings
        self.config = config

    async def fetch_detail(self, job_id: str) -> JobDetail | None:
        url = DETAIL_URL.format(job_id=job_id)
        result = await self.fetcher.fetch(url)
        if self.config.save_raw:
            rawstore.save_raw("detail", job_id, result.body)
        if not result.body or result.blocked:
            return None
        detail = parse_job_detail(result.body, job_id)
        if not detail.title and not detail.description_text:
            return None
        return detail

    async def fetch_many(self, job_ids: list[str]) -> list[JobDetail]:
        out: list[JobDetail] = []
        for job_id in job_ids:
            detail = await self.fetch_detail(job_id)
            if detail:
                out.append(detail)
            await polite_delay(self.settings)
        return out
