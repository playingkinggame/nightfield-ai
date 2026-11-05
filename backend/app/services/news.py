"""News: Google News RSS (feedparser) + Tavily when available. Keyword sentiment, optional Groq classification."""
import hashlib
import json
import logging
from datetime import datetime, timezone
from urllib.parse import quote_plus

import feedparser

from app.cache import cached
from app.config import settings
from app.errors import ApiError
from app.services import market, search
from app.upstream import fetch_text

log = logging.getLogger(__name__)
RSS = "https://news.google.com/rss/search?q={q}&hl=en-IN&gl=IN&ceid=IN:en"

POS = ("surge", "rally", "gain", "jump", "soar", "beat", "record high", "upgrade", "profit", "growth", "strong",
       "buy", "outperform", "bullish", "wins", "order win", "expansion", "dividend", "bonus", "rises", "climbs")
NEG = ("fall", "plunge", "slump", "drop", "crash", "miss", "downgrade", "loss", "weak", "sell", "underperform",
       "probe", "fraud", "penalty", "default", "raid", "cuts", "decline", "slides", "warning", "lawsuit", "sebi")
HIGH = ("results", "earnings", "profit", "loss", "sebi", "acquisition", "acquire", "merger", "fraud", "probe",
        "raid", "downgrade", "upgrade", "guidance", "dividend", "bonus", "split", "buyback", "penalty", "default",
        "resigns", "ceo")
MED = ("order", "contract", "target", "stake", "launch", "expansion", "deal", "partnership", "rating",
       "forecast", "growth")


def score_sentiment(title: str) -> str:
    t = title.lower()
    s = sum(w in t for w in POS) - sum(w in t for w in NEG)
    return "Bullish" if s >= 1 else "Cautious" if s <= -1 else "Neutral"


def score_impact(title: str) -> str:
    t = title.lower()
    return "High" if any(w in t for w in HIGH) else "Medium" if any(w in t for w in MED) else "Low"


def time_ago(dt: datetime | None) -> str:
    if not dt:
        return "recent"
    s = int((datetime.now(timezone.utc) - dt).total_seconds())
    if s < 60:
        return "just now"
    if s < 3600:
        return f"{s // 60}m ago"
    if s < 86400:
        return f"{s // 3600}h ago"
    if s < 86400 * 30:
        return f"{s // 86400}d ago"
    return f"{s // (86400 * 30)}mo ago"


def _parse_rss(xml: str) -> list[dict]:
    feed = feedparser.parse(xml)
    out = []
    for e in feed.entries[:20]:
        title = e.get("title", "").strip()
        src = (e.get("source") or {}).get("title") if isinstance(e.get("source"), dict) else None
        if " - " in title:
            head, tail = title.rsplit(" - ", 1)
            title, src = head, src or tail
        pub = e.get("published_parsed")
        dt = datetime(*pub[:6], tzinfo=timezone.utc) if pub else None
        if title and e.get("link"):
            out.append({"title": title, "source": src or "Google News", "url": e["link"], "dt": dt})
    return out


async def _groq_labels(titles: list[str]) -> list[str] | None:
    if not (settings.use_groq_sentiment and settings.groq_api_key and titles):
        return None
    try:
        from groq import AsyncGroq

        c = AsyncGroq(api_key=settings.groq_api_key, timeout=10, max_retries=0)
        r = await c.chat.completions.create(
            model=settings.groq_model, temperature=0, response_format={"type": "json_object"},
            messages=[{"role": "user", "content": 'Classify each headline for the stock as "Bullish", "Neutral" or '
                       '"Cautious". Reply JSON {"labels": [...]} with exactly one label per headline, in order.\n'
                       + json.dumps(titles)}])
        labels = json.loads(r.choices[0].message.content)["labels"]
        ok = {"Bullish", "Neutral", "Cautious"}
        return labels if len(labels) == len(titles) and all(l in ok for l in labels) else None
    except Exception as e:  # noqa: BLE001
        log.info("groq sentiment failed, using keyword scoring: %s", e)
        return None


@cached(600, "news")
async def get_news(symbol: str) -> list[dict]:
    sym = await market.resolve_symbol(symbol)
    company = market.company_hint(sym)
    items: list[dict] = []
    try:
        xml = await fetch_text(RSS.format(q=quote_plus(f"{company} stock")), label="Google News")
        items += _parse_rss(xml)
    except ApiError as e:
        log.warning("google news failed: %s", e.detail)
        if not settings.tavily_api_key:
            raise
    if settings.tavily_api_key:
        try:
            for r in await search.tavily_search(f"{company} stock news India", 5, "news"):
                dt = None
                if r.get("published"):
                    try:
                        dt = datetime.strptime(r["published"][:25], "%a, %d %b %Y %H:%M:%S").replace(tzinfo=timezone.utc)
                    except ValueError:
                        dt = None
                items.append({"title": r["title"], "source": r["source"], "url": r["url"], "dt": dt})
        except ApiError as e:
            log.info("tavily news skipped: %s", e.detail)
    seen, uniq = set(), []
    for it in items:
        k = it["title"].lower()[:80]
        if k not in seen:
            seen.add(k)
            uniq.append(it)
    uniq.sort(key=lambda i: i["dt"] or datetime(1970, 1, 1, tzinfo=timezone.utc), reverse=True)
    uniq = uniq[:15]
    labels = await _groq_labels([i["title"] for i in uniq])
    return [{
        "id": hashlib.sha1(i["url"].encode()).hexdigest()[:12], "title": i["title"], "source": i["source"],
        "timeAgo": time_ago(i["dt"]), "url": i["url"],
        "sentiment": labels[n] if labels else score_sentiment(i["title"]),
        "impact": score_impact(i["title"]),
    } for n, i in enumerate(uniq)]
