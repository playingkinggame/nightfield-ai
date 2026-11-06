import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.db import init_db
from app.errors import ApiError
from app.logging_setup import setup_logging
from app.routers import auth, backtest, chat, funds, market, portfolio, search, stocks, ws

setup_logging()
log = logging.getLogger("nightfield")

HTTP_NAMES = {400: "bad_request", 401: "unauthorized", 403: "forbidden", 404: "not_found", 405: "method_not_allowed",
              409: "conflict", 422: "validation_error", 429: "rate_limited"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    log.info("NIGHTFIELD backend started (groq=%s gemini=%s tavily=%s)", bool(settings.groq_api_key),
             bool(settings.gemini_api_key), bool(settings.tavily_api_key))
    yield


app = FastAPI(title="NIGHTFIELD API", version="1.0.0", lifespan=lifespan,
              description="Educational research tool. Not financial advice.")
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])


@app.middleware("http")
async def access_log(request: Request, call_next):
    t0, rid = time.perf_counter(), uuid.uuid4().hex[:8]
    response = await call_next(request)
    response.headers["X-Request-ID"] = rid
    log.info("%s %s -> %s %.0fms rid=%s", request.method, request.url.path, response.status_code,
             (time.perf_counter() - t0) * 1000, rid)
    return response


def _err(status: int, error: str, detail: str, headers: dict | None = None) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": error, "detail": detail}, headers=headers)


@app.exception_handler(ApiError)
async def api_error(_: Request, e: ApiError):
    return _err(e.status, e.error, e.detail, e.headers)


@app.exception_handler(StarletteHTTPException)
async def http_error(_: Request, e: StarletteHTTPException):
    return _err(e.status_code, HTTP_NAMES.get(e.status_code, "http_error"), str(e.detail))


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, e: RequestValidationError):
    detail = "; ".join(f"{'.'.join(str(p) for p in x['loc'] if p != 'body')}: {x['msg']}" for x in e.errors())
    return _err(422, "validation_error", detail[:500])


@app.exception_handler(Exception)
async def unhandled(_: Request, e: Exception):
    log.exception("unhandled error")  # stack trace goes to server logs only
    return _err(500, "internal_error", "Unexpected server error. Please try again.")


@app.get("/api/health")
async def health():
    return {"status": "ok"}


for r in (search.router, market.router, stocks.router, funds.router, auth.router, portfolio.router, chat.router,
          backtest.router, ws.router):
    app.include_router(r)
