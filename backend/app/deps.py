"""
FastAPI dependencies for authentication. "Optional" current user is the
default everywhere (guest access), "required" current user is only used
where auth is mandatory (e.g. GET /auth/me).
"""

from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.security import decode_access_token

# auto_error=False: a request with no Authorization header at all is not
# an error here — it just means "anonymous/guest".
_bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> Optional[models.User]:
    if credentials is None:
        return None
    user_id_raw = decode_access_token(credentials.credentials)
    if user_id_raw is None:
        return None
    try:
        user_id = int(user_id_raw)
    except ValueError:
        return None
    return db.get(models.User, user_id)


def get_current_user(
    current_user: Optional[models.User] = Depends(get_current_user_optional),
) -> models.User:
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user
