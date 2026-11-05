import asyncio
import logging
import time

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.errors import ApiError, validate_symbol
from app.services import market

log = logging.getLogger(__name__)
router = APIRouter(tags=["ws"])
MAX_SYMBOLS = 10


@router.websocket("/ws/prices")
async def prices(ws: WebSocket, symbols: str = ""):
    try:
        syms = list(dict.fromkeys(validate_symbol(s) for s in symbols.split(",") if s.strip()))[:MAX_SYMBOLS]
    except ApiError:
        syms = []
    if not syms:
        await ws.close(code=1008)  # policy violation: missing/invalid symbols
        return
    await ws.accept()
    try:
        while True:
            res = await asyncio.gather(*[market.quick_quote(s) for s in syms], return_exceptions=True)
            for s, r in zip(syms, res):
                if isinstance(r, dict):
                    await ws.send_json({"symbol": s, "price": r["price"], "changePercent": r["changePercent"],
                                        "ts": int(time.time()), "delayed": True, "note": "delayed ~15 min"})
                else:
                    await ws.send_json({"symbol": s, "error": getattr(r, "detail", "price unavailable"),
                                        "ts": int(time.time())})
            try:  # doubles as disconnect detection; client messages are ignored
                await asyncio.wait_for(ws.receive_text(), timeout=5)
            except asyncio.TimeoutError:
                pass
    except WebSocketDisconnect:
        pass
    except Exception:  # noqa: BLE001
        log.exception("ws error")
    finally:
        try:
            await ws.close()
        except Exception:  # noqa: BLE001
            pass
