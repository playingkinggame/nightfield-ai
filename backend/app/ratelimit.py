import time
from collections import defaultdict, deque

from fastapi import Request

from app.config import settings
from app.errors import ApiError


def client_ip(request: Request) -> str:
    if settings.trust_proxy:
        fwd = request.headers.get("x-forwarded-for")
        if fwd:
            return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class RateLimiter:
    """Simple in-memory sliding-window limiter (per process, per IP)."""

    def __init__(self, limit: int, window: int = 60):
        self.limit, self.window = limit, window
        self.hits: dict[str, deque] = defaultdict(deque)

    def reset(self) -> None:
        self.hits.clear()

    async def __call__(self, request: Request) -> None:
        ip, now = client_ip(request), time.monotonic()
        q = self.hits[ip]
        while q and now - q[0] > self.window:
            q.popleft()
        if len(q) >= self.limit:
            retry = max(1, int(self.window - (now - q[0])))
            raise ApiError(f"Limit is {self.limit} chat requests per minute. Retry in ~{retry}s.",
                           status=429, error="rate_limited", headers={"Retry-After": str(retry)})
        q.append(now)
        if len(self.hits) > 5000:  # prune idle IPs
            for k in [k for k, v in self.hits.items() if not v or now - v[-1] > self.window]:
                self.hits.pop(k, None)


chat_limiter = RateLimiter(settings.chat_rate_limit)
