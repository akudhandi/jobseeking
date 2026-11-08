"""Connectivity checks for proxy pool and CapSolver.

Usage:
    python -m jobseeking.diagnostics proxy [--limit N]
    python -m jobseeking.diagnostics capsolver
    python -m jobseeking.diagnostics linkedin
"""

from __future__ import annotations

import argparse
import asyncio
import re

from .config import get_settings
from .fetch import Fetcher
from .runtime import build_capsolver, build_proxy_pool


async def check_proxy(limit: int) -> None:
    settings = get_settings()
    pool = build_proxy_pool(settings)
    print(f"loaded {len(pool)} proxies")
    ok = 0
    async with Fetcher(settings, pool, None, block_assets=False) as fetcher:
        for index, proxy in enumerate(pool.all()[:limit]):
            result = await fetcher.fetch_with("https://api.ipify.org/?format=json", proxy)
            ip_match = re.search(rb'"ip"\s*:\s*"([^"]+)"', result.body.encode("utf-8", "ignore"))
            ip = ip_match.group(1).decode() if ip_match else "-"
            status = "OK" if result.status == 200 and ip != "-" else "FAIL"
            if status == "OK":
                ok += 1
            print(f"[{index:>3}] {status:<4} {proxy.redacted():<55} http={result.status} ip={ip}")
    print(f"\n{ok}/{min(limit, len(pool))} proxies working")


async def check_capsolver() -> None:
    settings = get_settings()
    client = build_capsolver(settings)
    if client is None:
        print("CAPSOLVER_API_KEY not set")
        return
    balance = await client.balance()
    print(f"capsolver balance: {balance}")


async def check_linkedin() -> None:
    settings = get_settings()
    pool = build_proxy_pool(settings)
    capsolver = build_capsolver(settings)
    url = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=backend%20developer&location=Jawa%20Timur%2C%20Indonesia&start=0"
    async with Fetcher(settings, pool, capsolver) as fetcher:
        result = await fetcher.fetch(url, retries=1)
        print(f"status={result.status} blocked={result.blocked} captcha_solved={result.captcha_solved}")
        print(f"proxy={result.proxy.redacted() if result.proxy else '-'} len={len(result.body)}")
        print(f"notes={result.notes}")
        print("--- preview ---")
        print(result.body[:600])


def main() -> None:
    parser = argparse.ArgumentParser(description="jobseeking diagnostics")
    sub = parser.add_subparsers(dest="command", required=True)

    p_proxy = sub.add_parser("proxy", help="test proxy pool (fetches egress IP)")
    p_proxy.add_argument("--limit", type=int, default=10)

    sub.add_parser("capsolver", help="print CapSolver balance")
    sub.add_parser("linkedin", help="hit the LinkedIn guest search endpoint once")

    args = parser.parse_args()
    if args.command == "proxy":
        asyncio.run(check_proxy(args.limit))
    elif args.command == "capsolver":
        asyncio.run(check_capsolver())
    elif args.command == "linkedin":
        asyncio.run(check_linkedin())


if __name__ == "__main__":
    main()
