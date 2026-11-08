"""Crawl LinkedIn guest job-search result pages."""

from __future__ import annotations

import re
from dataclasses import dataclass
from urllib.parse import urlencode

from bs4 import BeautifulSoup, Tag

from . import rawstore
from .config import CrawlConfig, Settings
from .fetch import Fetcher, polite_delay

SEARCH_URL = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"


@dataclass
class JobCard:
    job_id: str
    title: str
    company: str
    location: str
    url: str
    posted_at: str | None = None


def build_search_url(keyword: str, location: str, start: int = 0, distance: int = 25) -> str:
    params = {
        "keywords": keyword,
        "location": location,
        "distance": distance,
        "start": start,
    }
    return f"{SEARCH_URL}?{urlencode(params)}"


def _extract_job_id(card: Tag) -> str | None:
    urn = card.get("data-entity-urn") or ""
    match = re.search(r"jobPosting:(\d+)", str(urn))
    if match:
        return match.group(1)
    link = card.select_one("a.base-card__full-link, a[href*='/jobs/view/'], a[href*='currentJobId=']")
    if link:
        href = str(link.get("href") or "")
        for pattern in (r"/jobs/view/(?:[^/?]*-)?(\d+)", r"currentJobId=(\d+)", r"jobPosting:(\d+)"):
            match = re.search(pattern, href)
            if match:
                return match.group(1)
    return None


def _text(node: Tag | None) -> str:
    return node.get_text(" ", strip=True) if node else ""


def parse_job_cards(html: str) -> list[JobCard]:
    soup = BeautifulSoup(html, "lxml")
    cards: list[JobCard] = []
    seen: set[str] = set()

    for card in soup.select("div.base-search-card, div.base-card"):
        job_id = _extract_job_id(card)
        if not job_id or job_id in seen:
            continue
        seen.add(job_id)

        title = _text(card.select_one("h3.base-search-card__title")) or _text(
            card.select_one(".base-search-card__title")
        )
        company = _text(card.select_one("h4.base-search-card__subtitle")) or _text(
            card.select_one(".base-search-card__subtitle, .base-card__subtitle")
        )
        location = _text(card.select_one("span.job-search-card__location")) or _text(
            card.select_one(".job-search-card__location")
        )
        link = card.select_one("a.base-card__full-link, a[href*='/jobs/view/']")
        url = str(link.get("href")) if link and link.get("href") else ""
        url = url.split("?")[0] or f"https://www.linkedin.com/jobs/view/{job_id}"
        time_el = card.select_one("time")
        posted_at = str(time_el.get("datetime")) if time_el and time_el.get("datetime") else None

        cards.append(
            JobCard(
                job_id=job_id,
                title=title,
                company=company,
                location=location,
                url=url,
                posted_at=posted_at,
            )
        )
    return cards


class SearchCrawler:
    def __init__(self, fetcher: Fetcher, settings: Settings, config: CrawlConfig):
        self.fetcher = fetcher
        self.settings = settings
        self.config = config

    async def crawl(
        self, keyword: str, location: str, max_pages: int | None = None
    ) -> list[JobCard]:
        pages = max_pages if max_pages is not None else self.config.max_pages
        per_page = self.config.results_per_page
        distance = self.config.distance

        found: list[JobCard] = []
        seen: set[str] = set()

        for page in range(pages):
            start = page * per_page
            url = build_search_url(keyword, location, start=start, distance=distance)
            result = await self.fetcher.fetch(url)
            if self.config.save_raw:
                rawstore.save_raw("search", f"{keyword}__{location}__{start}", result.body)
            if result.blocked and not result.body:
                break

            cards = parse_job_cards(result.body)
            if not cards:
                break
            new = 0
            for card in cards:
                if card.job_id in seen:
                    continue
                seen.add(card.job_id)
                found.append(card)
                new += 1
            if new == 0:
                break
            await polite_delay(self.settings)

        return found
