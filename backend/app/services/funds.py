"""Mutual funds / index funds / ETFs via https://api.mfapi.in (NAV history) + curated metadata JSON."""
import asyncio
import bisect
import json
import logging
import re
from datetime import datetime
from pathlib import Path

from dateutil.relativedelta import relativedelta

from app.cache import cached
from app.errors import BadRequest, NotFoundError, UpstreamError
from app.upstream import fetch_json

log = logging.getLogger(__name__)
MFAPI = "https://api.mfapi.in"
META_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "funds_meta.json"
CODE_RE = re.compile(r"^\d{3,8}$")
APPROX_NOTE = " AUM, expense ratio and top holdings are approximate curated figures (not live) - verify on the AMC factsheet."


def validate_code(code: str) -> str:
    if not CODE_RE.match(code or ""):
        raise BadRequest("Fund code must be a numeric mfapi scheme code, e.g. 120716.")
    return code


def _load_meta() -> dict:
    try:
        return json.loads(META_PATH.read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        log.warning("could not load funds_meta.json: %s", e)
        return {"funds": [], "holdingsTemplates": {}}


def _risk(category: str) -> str:
    c = (category or "").lower()
    if any(k in c for k in ("debt", "liquid", "overnight", "money market", "gilt", "bond")):
        return "Low"
    if any(k in c for k in ("hybrid", "balanced", "arbitrage", "conservative")):
        return "Moderate"
    return "Very High"


@cached(3600, "mf_search")
async def search_funds(q: str) -> list[dict]:
    data = await fetch_json(f"{MFAPI}/mf/search", params={"q": q}, label="mfapi search")
    return [{"code": str(d["schemeCode"]), "name": d["schemeName"]} for d in (data or []) if "schemeCode" in d]


@cached(3600, "mf_scheme")
async def fetch_scheme(code: str) -> dict:
    data = await fetch_json(f"{MFAPI}/mf/{code}", label="mfapi NAV")
    rows = (data or {}).get("data") or []
    navs = []
    for r in rows:
        try:
            d = datetime.strptime(r["date"], "%d-%m-%Y").date().isoformat()
            navs.append([d, float(r["nav"])])
        except (KeyError, ValueError):
            continue
    if not navs:
        raise NotFoundError(f"No NAV data for scheme {code}.")
    navs.sort(key=lambda x: x[0])
    return {"meta": data.get("meta") or {}, "navs": navs}


def _nav_at_or_before(navs: list, target_iso: str):
    dates = [n[0] for n in navs]
    i = bisect.bisect_right(dates, target_iso) - 1
    return navs[i] if i >= 0 else None


def compute_returns(navs: list) -> dict:
    """1Y absolute return, 3Y/5Y CAGR (percent). 0 when history is too short."""
    latest_date = datetime.fromisoformat(navs[-1][0]).date()
    latest = navs[-1][1]
    first_date = navs[0][0]
    out = {}
    for label, years in (("oneYearReturn", 1), ("threeYearReturn", 3), ("fiveYearReturn", 5)):
        target = (latest_date - relativedelta(years=years)).isoformat()
        past = _nav_at_or_before(navs, target)
        # require history to reach back (within ~10 days) of the target date
        if not past or past[1] <= 0 or (datetime.fromisoformat(first_date) - datetime.fromisoformat(target)).days > 10:
            out[label] = 0.0
            continue
        ratio = latest / past[1]
        out[label] = round(((ratio - 1) if years == 1 else (ratio ** (1 / years) - 1)) * 100, 2)
    return out


async def build_fund(code: str, entry: dict | None = None) -> dict:
    sch = await fetch_scheme(code)
    navs, meta = sch["navs"], sch["meta"]
    nav = navs[-1][1]
    prev = navs[-2][1] if len(navs) > 1 else nav
    category = (entry or {}).get("category") or meta.get("scheme_category") or "Mutual Fund"
    rets = compute_returns(navs)
    tmpl = _load_meta().get("holdingsTemplates", {})
    holdings = (entry or {}).get("topHoldings", [])
    if isinstance(holdings, str):
        holdings = tmpl.get(holdings, [])
    if entry:
        desc = (entry.get("description") or "") + APPROX_NOTE
    else:
        desc = (f"{meta.get('fund_house', 'Mutual fund')} - {meta.get('scheme_type', '')}. "
                "AUM, expense ratio and holdings are not available from mfapi.")
    return {
        "code": str(code),
        "name": (entry or {}).get("name") or meta.get("scheme_name") or f"Scheme {code}",
        "category": category, "nav": round(nav, 4),
        "changePercent": round((nav - prev) / prev * 100, 2) if prev else 0.0,
        "aumCr": float((entry or {}).get("aumCr", 0) or 0),
        "expenseRatio": float((entry or {}).get("expenseRatio", 0) or 0),
        **rets,
        "riskRating": (entry or {}).get("riskRating") or _risk(category),
        "topHoldings": holdings or [], "description": desc.strip(),
    }


@cached(86400, "mf_code")
async def _resolve_code(search_query: str, terms: tuple) -> str | None:
    results = await search_funds(search_query)
    for r in results:
        n = r["name"].lower()
        if all(t in n for t in terms):
            return r["code"]
    return results[0]["code"] if results else None


async def get_fund(code: str) -> dict:
    code = validate_code(code)
    entry = None
    for e in _load_meta().get("funds", []):
        if e.get("code") == code:
            entry = e
    return await build_fund(code, entry)


@cached(3600, "mf_list")
async def list_funds() -> list[dict]:
    entries = _load_meta().get("funds", [])

    async def one(e):
        code = e.get("code") or await _resolve_code(e["searchQuery"], tuple(t.lower() for t in e.get("matchTerms", [])))
        if not code:
            raise NotFoundError(f"scheme not found for {e['searchQuery']}")
        return await build_fund(code, e)

    results = await asyncio.gather(*[one(e) for e in entries], return_exceptions=True)
    ok = [r for r in results if isinstance(r, dict)]
    for e, r in zip(entries, results):
        if isinstance(r, Exception):
            log.warning("fund %s skipped: %s", e.get("searchQuery"), r)
    if entries and not ok:
        raise UpstreamError("mfapi.in is unavailable right now - please retry shortly.")
    return ok


async def lookup_fund(query: str) -> dict:
    """For the AI agent: search by name, return best match (+ alternatives)."""
    results = await search_funds(query.strip()[:100])
    if not results:
        raise NotFoundError(f"No mutual fund matched '{query}'.")
    q_terms = [t for t in re.split(r"\W+", query.lower()) if t]
    best = max(results[:15], key=lambda r: (sum(t in r["name"].lower() for t in q_terms),
                                            "direct" in r["name"].lower(), "growth" in r["name"].lower()))
    fund = await get_fund(best["code"])
    return {"fund": fund, "otherMatches": [r for r in results[:6] if r["code"] != best["code"]]}


async def latest_nav_summary(code: str) -> tuple[float, float]:
    sch = await fetch_scheme(code)
    navs = sch["navs"]
    nav = navs[-1][1]
    prev = navs[-2][1] if len(navs) > 1 else nav
    return round(nav, 4), round((nav - prev) / prev * 100, 2) if prev else 0.0


@cached(300, "search_funds_priced")
async def search_funds_priced(q: str, limit: int = 4) -> list[dict]:
    results = (await search_funds(q))[:limit]
    prices = await asyncio.gather(*[latest_nav_summary(r["code"]) for r in results], return_exceptions=True)
    out = []
    for r, p in zip(results, prices):
        ok = isinstance(p, tuple)
        out.append({"symbol": r["code"], "name": r["name"], "type": "fund", "exchange": "MF",
                    "price": p[0] if ok else 0, "changePercent": p[1] if ok else 0})
    return out
