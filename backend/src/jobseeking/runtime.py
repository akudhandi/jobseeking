"""Component factories: settings -> proxy pool / capsolver / fetcher."""

from __future__ import annotations

from .captcha import CapsolverClient
from .config import Settings, get_settings
from .fetch import Fetcher
from .proxy import ProxyPool


def build_proxy_pool(settings: Settings | None = None) -> ProxyPool:
    s = settings or get_settings()
    return ProxyPool(s.proxy_list)


def build_capsolver(settings: Settings | None = None) -> CapsolverClient | None:
    s = settings or get_settings()
    if not s.capsolver_api_key:
        return None
    return CapsolverClient(s.capsolver_api_key)


def build_fetcher(settings: Settings | None = None, *, with_capsolver: bool = True) -> Fetcher:
    s = settings or get_settings()
    pool = build_proxy_pool(s)
    capsolver = build_capsolver(s) if with_capsolver else None
    return Fetcher(s, pool, capsolver)
