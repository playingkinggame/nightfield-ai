import json

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.errors import validate_symbol
from app.models import ChatMessage, User
from app.ratelimit import chat_limiter
from app.schemas import ChatHistoryPost, ChatIn, ChatMessageIn, ChatMessageOut
from app.security import get_current_user
from app.services import agent

router = APIRouter(prefix="/api/chat", tags=["chat"])
SSE_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"}


@router.post("")
async def chat(body: ChatIn, request: Request, _: None = Depends(chat_limiter)):
    """Guest-friendly (no auth needed). Streams Server-Sent Events."""
    symbol = validate_symbol(body.symbol) if body.symbol else None
    chain = agent.build_llm_chain()
    return StreamingResponse(agent.stream_chat(body.message, symbol, body.history, chain),
                             media_type="text/event-stream", headers=SSE_HEADERS)


def _out(m: ChatMessage) -> dict:
    meta = json.loads(m.meta) if m.meta else {}
    return {"id": m.id, "role": m.role, "content": m.content, "symbol": m.symbol,
            "citations": meta.get("citations", []), "keyData": meta.get("keyData", []),
            "tools": meta.get("tools", []), "createdAt": m.created_at.isoformat()}


@router.get("/history", response_model=list[ChatMessageOut])
async def get_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(ChatMessage).where(ChatMessage.user_id == user.id)
                      .order_by(ChatMessage.id.desc()).limit(200)).all()
    return [_out(m) for m in reversed(rows)]


@router.post("/history", response_model=list[ChatMessageOut])
async def save_history(body: ChatHistoryPost | ChatMessageIn, user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    """Accepts {messages:[...]} or a single message object."""
    msgs = body.messages if isinstance(body, ChatHistoryPost) else [body]
    saved = []
    for m in msgs:
        row = ChatMessage(user_id=user.id, role=m.role, content=m.content, symbol=m.symbol,
                          meta=json.dumps({"citations": m.citations or [], "keyData": m.key_data or [],
                                           "tools": m.tools or []}))
        db.add(row)
        saved.append(row)
    db.commit()
    return [_out(r) for r in saved]
