"""Application settings and crawl configuration."""

from __future__ import annotations

import functools
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml
from pydantic_settings import BaseSettings, SettingsConfigDict

PACKAGE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = PACKAGE_DIR.parents[1]
REPO_ROOT = PACKAGE_DIR.parents[2]

CONFIG_YAML = BACKEND_DIR / "config.yaml"
DATA_DIR = REPO_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
EXPORT_DIR = DATA_DIR / "exports"


class Settings(BaseSettings):
    """Runtime settings loaded from environment / .env files."""

    model_config = SettingsConfigDict(
        env_file=(REPO_ROOT / ".env", BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    database_url: str = "postgresql+psycopg://jobseeking:jobseeking@localhost:5432/jobseeking"

    proxy_urls: str = ""
    proxy_username: str = ""
    proxy_password: str = ""
    # Path to a gitignored credential file. One proxy per line, either
    #   host:port:user:pass   (FloppyData / common format)  or
    #   http://user:pass@host:port
    proxy_file: str = ""

    capsolver_api_key: str = ""

    scrape_delay_min: float = 2.0
    scrape_delay_max: float = 4.0
    scrape_max_retries: int = 3
    scrape_timeout_ms: int = 45000
    headless: bool = True

    api_host: str = "127.0.0.1"
    api_port: int = 8000
    cors_origins: str = "http://localhost:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def proxy_list(self) -> list[str]:
        """Normalized proxy endpoints; each is a scheme://user:pass@host:port string."""
        entries: list[str] = [p.strip() for p in self.proxy_urls.split(",") if p.strip()]
        if self.proxy_file:
            entries.extend(self._read_proxy_file(self.proxy_file))

        out: list[str] = []
        for entry in entries:
            if not entry or entry.startswith("#"):
                continue
            out.append(self._normalize_proxy(entry))
        return out

    @staticmethod
    def _read_proxy_file(path: str) -> list[str]:
        from pathlib import Path

        p = Path(path)
        if not p.is_absolute():
            p = REPO_ROOT / p
        if not p.exists():
            return []
        return [line.strip() for line in p.read_text(encoding="utf-8").splitlines()]

    def _normalize_proxy(self, entry: str) -> str:
        # host:port:user:pass  ->  http://user:pass@host:port
        if "://" not in entry and entry.count(":") == 3:
            host, port, user, password = entry.split(":")
            return f"http://{user}:{password}@{host}:{port}"

        if "://" not in entry:
            entry = f"http://{entry}"

        scheme, _, rest = entry.partition("://")
        if "@" not in rest and self.proxy_username:
            cred = self.proxy_username
            if self.proxy_password:
                cred += f":{self.proxy_password}"
            entry = f"{scheme}://{cred}@{rest}"
        return entry


@functools.lru_cache
def get_settings() -> Settings:
    return Settings()


@dataclass(slots=True)
class CrawlConfig:
    """Parsed config.yaml describing the search matrix and scrape knobs."""

    keywords: list[str]
    locations: list[str]
    scrape: dict[str, Any]
    jatim_cities: list[str] = field(default_factory=list)

    @property
    def max_pages(self) -> int:
        return int(self.scrape.get("max_pages", 10))

    @property
    def results_per_page(self) -> int:
        return int(self.scrape.get("results_per_page", 25))

    @property
    def distance(self) -> int:
        return int(self.scrape.get("distance", 25))

    @property
    def fetch_detail(self) -> bool:
        return bool(self.scrape.get("fetch_detail", True))

    @property
    def save_raw(self) -> bool:
        return bool(self.scrape.get("save_raw", True))

    @property
    def concurrency(self) -> int:
        return int(self.scrape.get("concurrency", 1))


@functools.lru_cache
def load_crawl_config(path: str | Path | None = None) -> CrawlConfig:
    cfg_path = Path(path) if path else CONFIG_YAML
    data = yaml.safe_load(cfg_path.read_text(encoding="utf-8")) or {}
    return CrawlConfig(
        keywords=list(data.get("keywords", [])),
        locations=list(data.get("locations", [])),
        scrape=dict(data.get("scrape", {})),
        jatim_cities=list(data.get("jatim_cities", [])),
    )
