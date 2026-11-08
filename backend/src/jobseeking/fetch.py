"""Playwright-based fetcher with proxy rotation, stealth, and captcha solving."""

from __future__ import annotations

import asyncio
import random
from dataclasses import dataclass, field

from .captcha import CapsolverClient, CapsolverError
from .config import Settings
from .proxy import Proxy, ProxyPool

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/130.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/129.0.0.0 Safari/537.36",
]

STEALTH_JS = """
Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
Object.defineProperty(navigator, 'languages', {get: () => ['id-ID', 'id', 'en-US', 'en']});
Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]});
window.chrome = window.chrome || { runtime: {} };
const origQuery = window.navigator.permissions.query;
window.navigator.permissions.query = (p) => (
  p.name === 'notifications'
    ? Promise.resolve({ state: Notification.permission })
    : origQuery(p)
);
"""

CAPTCHA_DETECT_JS = """
() => {
  const r = document.querySelector('.g-recaptcha[data-sitekey]');
  if (r) return { type: 'recaptcha', sitekey: r.getAttribute('data-sitekey') };
  const h = document.querySelector('.h-captcha[data-sitekey]');
  if (h) return { type: 'hcaptcha', sitekey: h.getAttribute('data-sitekey') };
  for (const f of document.querySelectorAll('iframe')) {
    const src = f.getAttribute('src') || '';
    const m = src.match(/[?&]k=([^&]+)/);
    if (!m) continue;
    if (src.includes('/recaptcha/')) return { type: 'recaptcha', sitekey: decodeURIComponent(m[1]) };
    if (src.includes('hcaptcha.com')) return { type: 'hcaptcha', sitekey: decodeURIComponent(m[1]) };
  }
  return null;
}
"""

CAPTCHA_INJECT_JS = """
(token) => {
  const set = (el) => {
    if (!el) return false;
    el.value = token;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };
  const ta = document.querySelector('#g-recaptcha-response')
    || document.querySelector('textarea[name="g-recaptcha-response"]')
    || document.querySelector('textarea[name="h-captcha-response"]');
  set(ta);
  try {
    const cfg = window.___grecaptcha_cfg;
    if (cfg && cfg.clients) {
      for (const key of Object.keys(cfg.clients)) {
        const client = cfg.clients[key];
        for (const prop of Object.keys(client)) {
          const cb = client[prop] && client[prop].callback;
          if (typeof cb === 'function') cb(token);
        }
      }
    }
  } catch (e) {}
  const btn = document.querySelector('#recaptcha-verify-button, button[type=submit]');
  if (btn) btn.click();
  return true;
}
"""


@dataclass
class FetchResult:
    url: str
    final_url: str
    status: int
    body: str
    proxy: Proxy | None
    captcha_solved: bool = False
    attempts: int = 1
    notes: list[str] = field(default_factory=list)

    @property
    def blocked(self) -> bool:
        if self.status in (429, 999, 403):
            return True
        lowered = self.body.lower()
        return any(m in lowered for m in ("authwall", "/checkpoint/", "captcha-delivery"))


class Fetcher:
    """Async Playwright fetcher.

    Rotation happens per request (a fresh context per fetch), so use
    ``async with Fetcher(...) as f:`` to reuse the underlying browser.
    """

    def __init__(
        self,
        settings: Settings,
        pool: ProxyPool,
        capsolver: CapsolverClient | None = None,
        *,
        block_assets: bool = True,
    ):
        self.settings = settings
        self.pool = pool
        self.capsolver = capsolver
        self.block_assets = block_assets
        self._pw = None
        self._browser = None

    async def __aenter__(self) -> Fetcher:
        await self.start()
        return self

    async def __aexit__(self, *exc) -> None:
        await self.close()

    async def start(self) -> None:
        from playwright.async_api import async_playwright

        self._pw = await async_playwright().start()
        self._browser = await self._pw.chromium.launch(
            headless=self.settings.headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage",
            ],
        )

    async def close(self) -> None:
        if self._browser:
            await self._browser.close()
        if self._pw:
            await self._pw.stop()
        self._browser = None
        self._pw = None

    async def fetch(
        self,
        url: str,
        *,
        wait_selector: str | None = None,
        retries: int | None = None,
        solve_captcha: bool = True,
    ) -> FetchResult:
        attempts = (retries if retries is not None else self.settings.scrape_max_retries) + 1
        last: FetchResult | None = None
        for attempt in range(1, attempts + 1):
            proxy = self.pool.next()
            result = await self._attempt(
                url, proxy, wait_selector=wait_selector, solve_captcha=solve_captcha
            )
            result.attempts = attempt
            last = result
            if not result.blocked:
                return result
            if attempt < attempts:
                await asyncio.sleep(self._backoff(attempt))
        return last  # type: ignore[return-value]

    async def fetch_with(
        self,
        url: str,
        proxy: Proxy,
        *,
        wait_selector: str | None = None,
        solve_captcha: bool = False,
    ) -> FetchResult:
        """Fetch using a specific proxy (no rotation, no retries)."""
        return await self._attempt(
            url, proxy, wait_selector=wait_selector, solve_captcha=solve_captcha
        )

    async def _attempt(
        self,
        url: str,
        proxy: Proxy,
        *,
        wait_selector: str | None,
        solve_captcha: bool,
    ) -> FetchResult:
        assert self._browser is not None, "Fetcher.start() not called"
        context = await self._browser.new_context(
            proxy=proxy.playwright(),
            user_agent=random.choice(USER_AGENTS),
            locale="id-ID",
            timezone_id="Asia/Jakarta",
            viewport={"width": 1366, "height": 900},
            ignore_https_errors=True,
        )
        await context.add_init_script(STEALTH_JS)
        if self.block_assets:
            await context.route(
                "**/*",
                lambda route: asyncio.ensure_future(_abort_assets(route)),
            )
        page = await context.new_page()
        notes: list[str] = []
        captcha_solved = False
        try:
            response = await page.goto(
                url, wait_until="domcontentloaded", timeout=self.settings.scrape_timeout_ms
            )
            status = response.status if response else 0
            if wait_selector:
                try:
                    await page.wait_for_selector(wait_selector, timeout=8000)
                except Exception:
                    notes.append(f"selector timeout: {wait_selector}")

            if solve_captcha and self.capsolver is not None:
                captcha_solved = await self._handle_captcha(page, proxy, notes)

            body = await page.content()
            return FetchResult(
                url=url,
                final_url=page.url,
                status=status,
                body=body,
                proxy=proxy,
                captcha_solved=captcha_solved,
                notes=notes,
            )
        except Exception as exc:  # noqa: BLE001
            notes.append(f"error: {type(exc).__name__}: {exc}")
            return FetchResult(
                url=url,
                final_url=page.url,
                status=0,
                body="",
                proxy=proxy,
                notes=notes,
            )
        finally:
            await context.close()

    async def _handle_captcha(self, page, proxy: Proxy, notes: list[str]) -> bool:
        try:
            challenge = await page.evaluate(CAPTCHA_DETECT_JS)
        except Exception:
            return False
        if not challenge:
            return False

        sitekey = challenge.get("sitekey")
        kind = challenge.get("type")
        if not sitekey:
            return False
        notes.append(f"captcha: {kind}")
        try:
            if kind == "recaptcha":
                token = await self.capsolver.solve_recaptcha_v2(
                    page.url, sitekey, proxy=proxy
                )
            elif kind == "hcaptcha":
                token = await self.capsolver.solve_hcaptcha(page.url, sitekey, proxy=proxy)
            else:
                return False
        except CapsolverError as exc:
            notes.append(f"capsolver failed: {exc}")
            return False

        try:
            await page.evaluate(CAPTCHA_INJECT_JS, token)
            await page.wait_for_timeout(4000)
        except Exception as exc:  # noqa: BLE001
            notes.append(f"inject failed: {exc}")
            return False
        return True

    def _backoff(self, attempt: int) -> float:
        base = random.uniform(self.settings.scrape_delay_min, self.settings.scrape_delay_max)
        return base * attempt


async def _abort_assets(route) -> None:
    try:
        if route.request.resource_type in ("image", "media", "font"):
            await route.abort()
        else:
            await route.continue_()
    except Exception:
        pass


async def polite_delay(settings: Settings, factor: float = 1.0) -> None:
    await asyncio.sleep(random.uniform(settings.scrape_delay_min, settings.scrape_delay_max) * factor)
