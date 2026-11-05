import re

SYMBOL_RE = re.compile(r"^[A-Za-z0-9.&^-]{1,20}$")


class ApiError(Exception):
    status = 500
    error = "internal_error"

    def __init__(self, detail: str = "", *, status: int | None = None, error: str | None = None,
                 headers: dict | None = None):
        super().__init__(detail)
        self.detail = detail
        if status:
            self.status = status
        if error:
            self.error = error
        self.headers = headers or {}


class BadRequest(ApiError):
    status = 400
    error = "bad_request"


class NotFoundError(ApiError):
    status = 404
    error = "not_found"


class UpstreamError(ApiError):
    status = 502
    error = "upstream_error"


def validate_symbol(raw) -> str:
    if not isinstance(raw, str) or not SYMBOL_RE.match(raw.strip()):
        raise BadRequest("Invalid symbol. Use 1-20 characters from A-Z, 0-9, '.', '&', '^', '-'.")
    return raw.strip().upper()
