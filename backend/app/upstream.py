"""Timeout + retry wrappers for every external call (8s timeout, 2 retries)."""
import asyncio
import logging

import httpx

from app.config import settings
from app.errors import ApiError, BadRequest, NotFoundError, UpstreamError

log = logging.getLogger(__name__)
UA = "Mozilla/5.0 (compatible; NightfieldBot/1.0; +educational-research)"


async def with_retries(factory, *, label: str, retries: int | None = None, timeout: float | None = None):
    retries = settings.http_retries if retries is None else retries
    timeout = timeout or settings.http_timeout
    last: Exception | None = None
    for attempt in range(retries + 1):
        try:
            return await asyncio.wait_for(factory(), timeout)
        except asyncio.CancelledError:
            raise
        except (NotFoundError, BadRequest):
            raise
        except Exception as e:  # noqa: BLE001
            last = e
            log.warning("%s attempt %d/%d failed: %s: %s", label, attempt + 1, retries + 1, type(e).__name__, e)
            if attempt < retries:
                await asyncio.sleep(0.4 * (2 ** attempt))
    reason = type(last).__name__ if last else "unknown"
    raise UpstreamError(f"{label} is unavailable right now ({reason}). The data provider may be rate-limiting "
                        f"or down - please retry in a moment.")


async def run_blocking(fn, *args, label: str, **kwargs):
    """Run a blocking function (e.g. yfinance) in a thread with timeout + retries."""
    return await with_retries(lambda: asyncio.to_thread(fn, *args, **kwargs), label=label)


async def fetch_json(url: str, *, params: dict | None = None, label: str, headers: dict | None = None):
    async def _go():
        async with httpx.AsyncClient(timeout=settings.http_timeout, follow_redirects=True,
                                     headers={"User-Agent": UA, **(headers or {})}) as c:
            r = await c.get(url, params=params)
            if r.status_code == 404:
                raise NotFoundError(f"{label}: resource not found")
            r.raise_for_status()
            return r.json()

    return await with_retries(_go, label=label)


async def fetch_text(url: str, *, params: dict | None = None, label: str) -> str:
    async def _go():
        async with httpx.AsyncClient(timeout=settings.http_timeout, follow_redirects=True,
                                     headers={"User-Agent": UA}) as c:
            r = await c.get(url, params=params)
            r.raise_for_status()
            return r.text

    return await with_retries(_go, label=label)


__all__ = ["with_retries", "run_blocking", "fetch_json", "fetch_text", "ApiError"]
