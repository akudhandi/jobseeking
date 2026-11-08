"""CapSolver client for reCAPTCHA / hCaptcha tokens."""

from __future__ import annotations

import time
from typing import Any

import httpx

from .proxy import Proxy

API_BASE = "https://api.capsolver.com"


class CapsolverError(RuntimeError):
    pass


class CapsolverClient:
    def __init__(self, api_key: str, *, timeout: float = 120.0, poll_interval: float = 3.0):
        if not api_key:
            raise CapsolverError("CAPSOLVER_API_KEY is not set")
        self.api_key = api_key
        self.timeout = timeout
        self.poll_interval = poll_interval

    async def balance(self) -> float:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(f"{API_BASE}/getBalance", json={"clientKey": self.api_key})
            data = r.json()
        if data.get("errorId"):
            raise CapsolverError(data.get("errorDescription") or "balance error")
        return float(data.get("balance", 0.0))

    async def solve_recaptcha_v2(
        self,
        website_url: str,
        website_key: str,
        *,
        proxy: Proxy | None = None,
        enterprise: bool = False,
    ) -> str:
        task: dict[str, Any] = {
            "type": "ReCaptchaV2EnterpriseTask" if enterprise else "ReCaptchaV2Task",
            "websiteURL": website_url,
            "websiteKey": website_key,
        }
        if proxy is None:
            task["type"] += "Proxyless"
        else:
            task.update(proxy.capsolver())
        return await self._solve(task)

    async def solve_recaptcha_v3(
        self,
        website_url: str,
        website_key: str,
        *,
        page_action: str = "verify",
        min_score: float = 0.7,
        proxy: Proxy | None = None,
    ) -> str:
        task: dict[str, Any] = {
            "type": "ReCaptchaV3Task",
            "websiteURL": website_url,
            "websiteKey": website_key,
            "pageAction": page_action,
            "minScore": min_score,
        }
        if proxy is None:
            task["type"] = "ReCaptchaV3TaskProxyless"
        else:
            task.update(proxy.capsolver())
        return await self._solve(task)

    async def solve_hcaptcha(
        self,
        website_url: str,
        website_key: str,
        *,
        proxy: Proxy | None = None,
    ) -> str:
        task: dict[str, Any] = {
            "type": "HCaptchaTask",
            "websiteURL": website_url,
            "websiteKey": website_key,
        }
        if proxy is None:
            task["type"] += "Proxyless"
        else:
            task.update(proxy.capsolver())
        return await self._solve(task)

    async def _solve(self, task: dict[str, Any]) -> str:
        async with httpx.AsyncClient(timeout=30) as client:
            created = await self._create_task(client, task)
            task_id = created.get("taskId")
            if not task_id:
                raise CapsolverError(f"No taskId in response: {created}")
            return await self._poll(client, task_id)

    async def _create_task(self, client: httpx.AsyncClient, task: dict[str, Any]) -> dict:
        r = await client.post(
            f"{API_BASE}/createTask",
            json={"clientKey": self.api_key, "task": task},
        )
        data = r.json()
        if data.get("errorId"):
            raise CapsolverError(f"createTask failed: {data.get('errorDescription')} ({task['type']})")
        return data

    async def _poll(self, client: httpx.AsyncClient, task_id: str) -> str:
        deadline = time.monotonic() + self.timeout
        while time.monotonic() < deadline:
            r = await client.post(
                f"{API_BASE}/getTaskResult",
                json={"clientKey": self.api_key, "taskId": task_id},
            )
            data = r.json()
            if data.get("errorId"):
                raise CapsolverError(f"getTaskResult error: {data.get('errorDescription')}")
            if data.get("status") == "ready":
                solution = data.get("solution", {})
                token = solution.get("gRecaptchaResponse") or solution.get("token")
                if not token:
                    raise CapsolverError(f"No token in solution: {solution}")
                return token
            await _async_sleep(self.poll_interval)
        raise CapsolverError("CapSolver task timed out")


async def _async_sleep(seconds: float) -> None:
    import asyncio

    await asyncio.sleep(seconds)
