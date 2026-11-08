"""Proxy pool: parsing, rotation, and Playwright/CapSolver adapters."""

from __future__ import annotations

import itertools
import random
import threading
from dataclasses import dataclass
from urllib.parse import urlparse


@dataclass(frozen=True, slots=True)
class Proxy:
    raw: str
    scheme: str
    host: str
    port: int
    username: str | None = None
    password: str | None = None

    @property
    def server(self) -> str:
        return f"{self.scheme}://{self.host}:{self.port}"

    @classmethod
    def parse(cls, raw: str) -> Proxy:
        if "://" not in raw:
            raw = f"http://{raw}"
        u = urlparse(raw)
        if not u.hostname or not u.port:
            raise ValueError(f"Invalid proxy: {raw!r}")
        return cls(
            raw=raw,
            scheme=u.scheme or "http",
            host=u.hostname,
            port=int(u.port),
            username=u.username,
            password=u.password,
        )

    def playwright(self) -> dict[str, str]:
        """Options dict for Playwright's ``browser.new_context(proxy=...)``."""
        opts: dict[str, str] = {"server": self.server}
        if self.username:
            opts["username"] = self.username
        if self.password:
            opts["password"] = self.password
        return opts

    def capsolver(self) -> dict[str, object]:
        """Proxy block for a CapSolver task payload."""
        data: dict[str, object] = {
            "proxyType": self.scheme,
            "proxyAddress": self.host,
            "proxyPort": self.port,
        }
        if self.username:
            data["proxyLogin"] = self.username
        if self.password:
            data["proxyPassword"] = self.password
        return data

    def redacted(self) -> str:
        if self.username:
            return f"{self.scheme}://{self.username}:***@{self.host}:{self.port}"
        return self.server


class ProxyPool:
    """Thread-safe round-robin pool with optional random selection."""

    def __init__(self, proxies: list[str]):
        parsed: list[Proxy] = []
        for entry in proxies:
            entry = entry.strip()
            if not entry or entry.startswith("#"):
                continue
            try:
                parsed.append(Proxy.parse(entry))
            except ValueError:
                continue
        if not parsed:
            raise ValueError("Proxy pool is empty — set PROXY_URLS or PROXY_FILE")
        self._proxies = parsed
        self._lock = threading.Lock()
        self._cycle = itertools.cycle(range(len(parsed)))
        self._counter = 0

    def __len__(self) -> int:
        return len(self._proxies)

    def next(self) -> Proxy:
        with self._lock:
            self._counter += 1
            idx = next(self._cycle)
        return self._proxies[idx]

    def random(self) -> Proxy:
        return random.choice(self._proxies)

    def all(self) -> list[Proxy]:
        return list(self._proxies)
