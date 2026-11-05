import re

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.errors import ApiError
from app.models import User
from app.schemas import AuthOut, LoginIn, SignupIn, UserOut
from app.security import create_token, get_current_user, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _out(u: User) -> dict:
    return {"token": create_token(u.id), "user": {"id": u.id, "email": u.email, "name": u.name}}


@router.post("/signup", response_model=AuthOut)
async def signup(body: SignupIn, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    if not EMAIL_RE.match(email) or len(email) > 255:
        raise ApiError("Enter a valid email address.", status=422, error="validation_error")
    if db.scalar(select(User).where(User.email == email)):
        raise ApiError("An account with this email already exists.", status=409, error="conflict")
    u = User(email=email, name=body.name.strip(), password_hash=hash_password(body.password))
    db.add(u)
    db.commit()
    return _out(u)


@router.post("/login", response_model=AuthOut)
async def login(body: LoginIn, db: Session = Depends(get_db)):
    u = db.scalar(select(User).where(User.email == body.email.strip().lower()))
    if not u or not verify_password(body.password, u.password_hash):
        raise ApiError("Incorrect email or password.", status=401, error="unauthorized")
    return _out(u)


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return {"id": user.id, "email": user.email, "name": user.name}
