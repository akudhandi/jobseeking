"""Batch scrape orchestrator CLI.

Examples:
    python -m jobseeking.pipeline --init-db
    python -m jobseeking.pipeline --location "Jawa Timur, Indonesia" --max-pages 3
    python -m jobseeking.pipeline --keyword "backend developer" --keyword "frontend developer"
    python -m jobseeking.pipeline --replay-raw
"""

from __future__ import annotations

import argparse
import asyncio
import logging
from datetime import datetime, timezone

from . import rawstore
from .build import build_parsed_job
from .config import CrawlConfig, get_settings, load_crawl_config
from .db import init_db, session_scope
from .detail import DetailCrawler, parse_job_detail
from .fetch import Fetcher
from .models import CrawlRun
from .runtime import build_capsolver, build_proxy_pool
from .search import SearchCrawler, parse_job_cards
from .store import upsert_job

log = logging.getLogger("jobseeking")


def _open_run(keywords: list[str], locations: list[str]) -> int:
    with session_scope() as session:
        run = CrawlRun(
            keyword=", ".join(keywords),
            location=", ".join(locations),
            status="running",
        )
        session.add(run)
        session.flush()
        return run.id


def _close_run(run_id: int, stats: dict[str, int], status: str = "completed") -> None:
    with session_scope() as session:
        run = session.get(CrawlRun, run_id)
        if run is None:
            return
        run.finished_at = datetime.now(timezone.utc)
        run.pages_fetched = stats.get("pages", 0)
        run.jobs_found = stats["found"]
        run.jobs_new = stats["new"]
        run.jobs_updated = stats["updated"]
        run.jobs_failed = stats["failed"]
        run.status = status


def _store_records(records, stats: dict[str, int]) -> None:
    with session_scope() as session:
        for rec in records:
            try:
                _, is_new = upsert_job(session, rec)
            except Exception as exc:  # noqa: BLE001
                stats["failed"] += 1
                log.warning("store failed job_id=%s: %s", rec.job_id, exc)
            else:
                stats["new" if is_new else "updated"] += 1


async def scrape(args: argparse.Namespace) -> dict[str, int]:
    settings = get_settings()
    config = load_crawl_config()

    keywords = args.keyword or config.keywords
    locations = args.location or config.locations
    max_pages = args.max_pages or config.max_pages

    pool = None if args.no_proxy else build_proxy_pool(settings)
    capsolver = build_capsolver(settings)
    log.info(
        "proxies=%s capsolver=%s keywords=%d locations=%d",
        "direct" if pool is None else len(pool),
        bool(capsolver),
        len(keywords),
        len(locations),
    )

    run_id = _open_run(keywords, locations)
    stats = {"found": 0, "new": 0, "updated": 0, "failed": 0, "pages": 0}
    fetch_detail = config.fetch_detail and not args.no_detail

    status = "completed"
    try:
        async with Fetcher(settings, pool, capsolver) as fetcher:
            search = SearchCrawler(fetcher, settings, config)
            detail_crawler = DetailCrawler(fetcher, settings, config)

            for keyword in keywords:
                for location in locations:
                    log.info("search keyword=%r location=%r", keyword, location)
                    cards = await search.crawl(keyword, location, max_pages=max_pages)
                    if args.max_jobs:
                        cards = cards[: args.max_jobs]
                    stats["found"] += len(cards)
                    stats["pages"] += max_pages
                    log.info("  cards=%d", len(cards))

                    details = {}
                    if fetch_detail:
                        for card in cards:
                            parsed = await detail_crawler.fetch_detail(card.job_id)
                            if parsed is not None:
                                details[card.job_id] = parsed

                    records = [
                        build_parsed_job(card, details.get(card.job_id), keyword, config, run_id)
                        for card in cards
                    ]
                    _store_records(records, stats)
                    log.info("  stored new=%d updated=%d", stats["new"], stats["updated"])
    except Exception:
        status = "failed"
        raise
    finally:
        _close_run(run_id, stats, status)
        log.info("run %d %s: %s", run_id, status, stats)
    return stats


def replay(args: argparse.Namespace) -> dict[str, int]:
    settings = get_settings()  # noqa: F841  (ensures settings load)
    config = load_crawl_config()
    init_db()

    cards = []
    seen: set[str] = set()
    for path in rawstore.list_raw("search"):
        for card in parse_job_cards(rawstore.read_raw(path)):
            if card.job_id not in seen:
                seen.add(card.job_id)
                cards.append(card)

    details = {}
    for path in rawstore.list_raw("detail"):
        job_id = path.stem
        details[job_id] = parse_job_detail(rawstore.read_raw(path), job_id)

    run_id = _open_run(["(replay)"], ["(raw)"])
    stats = {"found": len(cards), "new": 0, "updated": 0, "failed": 0, "pages": 0}
    records = [
        build_parsed_job(card, details.get(card.job_id), None, config, run_id) for card in cards
    ]
    _store_records(records, stats)
    _close_run(run_id, stats)
    log.info("replay: cards=%d details=%d -> %s", len(cards), len(details), stats)
    return stats


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="LinkedIn job-market batch scraper")
    parser.add_argument("--keyword", action="append", help="override keyword (repeatable)")
    parser.add_argument("--location", action="append", help="override location (repeatable)")
    parser.add_argument("--max-pages", type=int, default=0, help="pages per keyword/location")
    parser.add_argument("--max-jobs", type=int, default=0, help="cap cards processed per search")
    parser.add_argument("--no-detail", action="store_true", help="skip fetching job detail pages")
    parser.add_argument(
        "--no-proxy",
        action="store_true",
        help="fetch directly from the host IP (use when the proxy pool is unusable)",
    )
    parser.add_argument("--replay-raw", action="store_true", help="re-parse saved HTML, no network")
    parser.add_argument("--init-db", action="store_true", help="create tables and exit")
    parser.add_argument("--log-level", default="INFO")
    return parser


def main() -> None:
    args = build_parser().parse_args()
    logging.basicConfig(
        level=getattr(logging, args.log_level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    if args.init_db:
        init_db()
        log.info("database initialized")
        return
    if args.replay_raw:
        replay(args)
        return
    asyncio.run(scrape(args))


if __name__ == "__main__":
    main()
