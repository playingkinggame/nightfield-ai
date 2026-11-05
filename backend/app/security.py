from datetime import datetime, timedelta, timezone

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.errors import ApiError
from app.models import User

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
_bearer = HTTPBearer(auto_error=False)


def hash_password(p: str) -> str:
    return _pwd.hash(p)


def verify_password(p: str, hashed: str) -> bool:
    try:
        return _pwd.verify(p, hashed)
    except Exception:  # noqa: BLE001
        return False


def create_token(user_id: int) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=settings.jwt_days)
    return jwt.encode({"sub": str(user_id), "exp": exp}, settings.jwt_secret, algorithm="HS256")


def _user_from_creds(creds: HTTPAuthorizationCredentials | None, db: Session) -> User | None:
    if not creds:
        return None
    try:
        payload = jwt.decode(creds.credentials, settings.jwt_secret, algorithms=["HS256"])
        uid = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        return None
    return db.get(User, uid)


def get_current_user(creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
                     db: Session = Depends(get_db)) -> User:
    user = _user_from_creds(creds, db)
    if not user:
        raise ApiError("Missing or invalid token.", status=401, error="unauthorized",
                       headers={"WWW-Authenticate": "Bearer"})
    return user


def get_optional_user(creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
                      db: Session = Depends(get_db)) -> User | None:
    return _user_from_creds(creds, db)
