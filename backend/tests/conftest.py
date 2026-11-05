import os

os.environ["DATABASE_URL"] = "sqlite://"          # in-memory
os.environ["JWT_SECRET"] = "test-secret"
for k in ("GROQ_API_KEY", "GEMINI_API_KEY", "TAVILY_API_KEY", "SERPAPI_KEY", "REDIS_URL"):
    os.environ[k] = ""

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app import cache  # noqa: E402
from app.main import app  # noqa: E402
from app.ratelimit import chat_limiter  # noqa: E402


@pytest.fixture(autouse=True)
def _reset():
    cache.clear_all()
    chat_limiter.reset()
    yield


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c
