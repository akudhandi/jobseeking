"""Crawl LinkedIn guest job-detail pages."""

from __future__ import annotations

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


def _criteria(soup: BeautifulSoup) -> dict[str, str]:
    out: dict[str, str] = {}
    for item in soup.select("li.description__job-criteria-item"):
        label = _text(item.select_one("h3, .description__job-criteria-subheader")).strip(":").lower()
        value = _text(item.select_one("span, .description__job-criteria-text"))
        if label:
            out[label] = value
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
        seniority_level=criteria.get("seniority level"),
        employment_type=criteria.get("employment type"),
        job_function=criteria.get("job function"),
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
