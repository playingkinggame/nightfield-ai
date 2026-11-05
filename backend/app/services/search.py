"""Web search (Tavily -> SerpApi -> graceful empty result) and an SSRF-safe page reader."""
import asyncio
import ipaddress
import logging
import socket
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

import httpx

from app.cache import cached
from app.config import settings
from app.errors import ApiError, BadRequest
from app.upstream import UA, fetch_json, run_blocking

log = logging.getLogger(__name__)
MAX_CHARS = 4000
MAX_BYTES = 1_500_000


def _domain(url: str) -> str:
    return (urlparse(url).hostname or "").removeprefix("www.")


def _tavily_blocking(q: str, n: int, topic: str) -> list[dict]:
    from tavily import TavilyClient

    res = TavilyClient(api_key=settings.tavily_api_key).search(query=q, max_results=n, topic=topic)
    return [{"title": r.get("title", ""), "url": r.get("url", ""), "content": (r.get("content") or "")[:500],
             "source": _domain(r.get("url", "")), "published": r.get("published_date")}
            for r in res.get("results", []) if r.get("url")]


@cached(600, "tavily")
async def tavily_search(q: str, n: int = 5, topic: str = "general") -> list[dict]:
    return await run_blocking(_tavily_blocking, q, n, topic, label="Tavily search")


@cached(600, "serpapi")
async def serpapi_search(q: str, n: int = 5) -> list[dict]:
    data = await fetch_json("https://serpapi.com/search.json", label="SerpApi",
                            params={"q": q, "api_key": settings.serpapi_key, "engine": "google", "num": n})
    return [{"title": r.get("title", ""), "url": r.get("link", ""), "content": (r.get("snippet") or "")[:500],
             "source": _domain(r.get("link", "")), "published": None}
            for r in (data.get("organic_results") or [])[:n] if r.get("link")]


async def web_search(query: str, max_results: int = 5) -> dict:
    """Never raises: returns {"results": [], "error": "..."} if every provider fails."""
    q = (query or "").strip()[:300]
    if not q:
        return {"provider": None, "results": [], "error": "Empty query."}
    errors: list[str] = []
    if settings.tavily_api_key:
        try:
            r = await tavily_search(q, max_results)
            if r:
                return {"provider": "tavily", "results": r, "error": None}
            errors.append("Tavily returned no results")
        except ApiError as e:
            errors.append(f"Tavily: {e.detail}")
    if settings.serpapi_key:
        try:
            r = await serpapi_search(q, max_results)
            if r:
                return {"provider": "serpapi", "results": r, "error": None}
            errors.append("SerpApi returned no results")
        except ApiError as e:
            errors.append(f"SerpApi: {e.detail}")
    if not errors:
        errors.append("No search provider configured (set TAVILY_API_KEY or SERPAPI_KEY).")
    return {"provider": None, "results": [], "error": "; ".join(errors)}


# ---------------- SSRF-safe page reader ----------------
def _ip_blocked(ip: ipaddress._BaseAddress) -> bool:
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
        ip = ip.ipv4_mapped
    return (not ip.is_global) or ip.is_multicast


async def assert_public_url(url: str) -> None:
    p = urlparse(url)
    if p.scheme not in ("http", "https"):
        raise BadRequest("Only http/https URLs are allowed.")
    host = p.hostname
    if not host:
        raise BadRequest("URL has no host.")
    try:
        port = p.port or (443 if p.scheme == "https" else 80)
    except ValueError:
        raise BadRequest("Invalid port.")
    if port not in (80, 443):
        raise BadRequest("Only ports 80 and 443 are allowed.")
    try:
        ips = [ipaddress.ip_address(host)]
    except ValueError:
        try:
            infos = await asyncio.to_thread(socket.getaddrinfo, host, port, proto=socket.IPPROTO_TCP)
        except socket.gaierror:
            raise BadRequest("Host could not be resolved.")
        ips = [ipaddress.ip_address(i[4][0]) for i in infos]
    if not ips or any(_ip_blocked(ip) for ip in ips):
        raise BadRequest("URL points to a private or non-public address and is blocked.")


class _Text(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts: list[str] = []
        self.title = ""
        self._skip = 0
        self._in_title = False

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "noscript", "svg", "nav", "footer", "header", "form"):
            self._skip += 1
        if tag == "title":
            self._in_title = True

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript", "svg", "nav", "footer", "header", "form") and self._skip:
            self._skip -= 1
        if tag == "title":
            self._in_title = False

    def handle_data(self, data):
        if self._in_title:
            self.title += data
        elif not self._skip and data.strip():
            self.parts.append(data.strip())


async def read_webpage(url: str) -> dict:
    url = (url or "").strip()
    if len(url) > 2000:
        raise BadRequest("URL too long.")
    current = url
    async with httpx.AsyncClient(timeout=8, follow_redirects=False, headers={"User-Agent": UA}) as c:
        for _ in range(4):  # follow up to 3 redirects, re-validating every hop
            await assert_public_url(current)
            async with c.stream("GET", current) as r:
                if r.status_code in (301, 302, 303, 307, 308) and r.headers.get("location"):
                    current = urljoin(current, r.headers["location"])
                    continue
                r.raise_for_status()
                ctype = r.headers.get("content-type", "").lower()
                if not any(t in ctype for t in ("text/", "json", "xml")):
                    raise BadRequest(f"Unsupported content type: {ctype or 'unknown'}")
                buf = b""
                async for chunk in r.aiter_bytes():
                    buf += chunk
                    if len(buf) > MAX_BYTES:
                        break
                body = buf.decode(r.encoding or "utf-8", errors="replace")
                break
        else:
            raise BadRequest("Too many redirects.")
    if "html" in ctype:
        p = _Text()
        p.feed(body)
        text, title = " ".join(p.parts), p.title.strip()
    else:
        text, title = body, ""
    return {"url": current, "title": title, "content": " ".join(text.split())[:MAX_CHARS]}
