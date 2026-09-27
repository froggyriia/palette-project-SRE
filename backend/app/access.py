"""
Shared ownership check for palettes, used by both the palettes and colors
routers. Kept separate from either router to avoid a circular import.

Rule: a guest palette (user_id is None) is open to everyone — that's the
default "just try it out" experience. A saved palette (user_id is set)
is only visible/editable by its owner.
"""

from typing import Optional

from fastapi import HTTPException, status

from app import models


def check_palette_access(palette: models.Palette, current_user: Optional[models.User]) -> None:
    if palette.user_id is None:
        return  # guest palette: open to anyone
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This palette is saved to an account — log in to access it",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if current_user.id != palette.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your palette")
