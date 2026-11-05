import json
import logging
import sys
import time

from app.config import settings


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(record.created)),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)  # server logs only, never sent to clients
        return json.dumps(payload, ensure_ascii=False)


def setup_logging() -> None:
    h = logging.StreamHandler(sys.stdout)
    h.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers = [h]
    root.setLevel(settings.log_level.upper())
    for noisy in ("httpx", "httpcore", "yfinance", "peewee", "urllib3"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
