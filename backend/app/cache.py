"""In-memory TTL cache (cachetools). If REDIS_URL is set and the `redis` package is installed,
Redis is used as a shared second layer. Only JSON-serialisable values are cached."""
import functools
import json
import logging
import threading

from cachetools import TTLCache

from app.config import settings

log = logging.getLogger(__name__)
_MISS = object()
_stores: dict[int, TTLCache] = {}
_lock = threading.Lock()
_redis = None  # None = not tried, False = unavailable


def _get_redis():
    global _redis
    if _redis is None:
        if not settings.redis_url:
            _redis = False
        else:
            try:
                import redis.asyncio as aioredis

                _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
            except Exception as e:  # pragma: no cover
                log.warning("Redis unavailable (%s) - using in-memory cache only", e)
                _redis = False
    return _redis or None


def _store(ttl: int) -> TTLCache:
    with _lock:
        if ttl not in _stores:
            _stores[ttl] = TTLCache(maxsize=4096, ttl=ttl)
        return _stores[ttl]


def clear_all() -> None:
    with _lock:
        for s in _stores.values():
            s.clear()


def cached(ttl: int, prefix: str):
    """Cache an async function's result for `ttl` seconds. Exceptions are never cached."""

    def deco(fn):
        @functools.wraps(fn)
        async def wrapper(*args, **kwargs):
            key = f"{prefix}:{args!r}:{sorted(kwargs.items())!r}"
            store = _store(ttl)
            with _lock:
                hit = store.get(key, _MISS)
            if hit is not _MISS:
                return hit
            r = _get_redis()
            if r is not None:
                try:
                    raw = await r.get("nf:" + key)
                    if raw is not None:
                        value = json.loads(raw)
                        with _lock:
                            store[key] = value
                        return value
                except Exception as e:  # pragma: no cover
                    log.debug("redis get failed: %s", e)
            value = await fn(*args, **kwargs)
            with _lock:
                store[key] = value
            if r is not None:
                try:
                    await r.set("nf:" + key, json.dumps(value, default=str), ex=ttl)
                except Exception as e:  # pragma: no cover
                    log.debug("redis set failed: %s", e)
            return value

        return wrapper

    return deco
