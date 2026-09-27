from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas

# Colors are created/listed in the context of a palette (nested resource),
# but updated/deleted by their own id (flat resource) — that's the more
# convenient shape for a client that's already showing one color's row.
palette_colors_router = APIRouter(prefix="/palettes/{palette_id}/colors", tags=["colors"])
colors_router = APIRouter(prefix="/colors", tags=["colors"])


def _get_palette_or_404(db: Session, palette_id: int) -> models.Palette:
    palette = db.get(models.Palette, palette_id)
    if palette is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Palette not found")
    return palette


def _get_color_or_404(db: Session, color_id: int) -> models.Color:
    color = db.get(models.Color, color_id)
    if color is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Color not found")
    return color


@palette_colors_router.post("", response_model=schemas.ColorOut, status_code=status.HTTP_201_CREATED)
def add_color(palette_id: int, payload: schemas.ColorCreate, db: Session = Depends(get_db)):
    _get_palette_or_404(db, palette_id)
    color = models.Color(palette_id=palette_id, hex=payload.hex, position=payload.position)
    db.add(color)
    db.commit()
    db.refresh(color)
    return color


@palette_colors_router.get("", response_model=list[schemas.ColorOut])
def list_colors(palette_id: int, db: Session = Depends(get_db)):
    _get_palette_or_404(db, palette_id)
    return (
        db.query(models.Color)
        .filter(models.Color.palette_id == palette_id)
        .order_by(models.Color.position)
        .all()
    )


@colors_router.patch("/{color_id}", response_model=schemas.ColorOut)
def update_color(color_id: int, payload: schemas.ColorUpdate, db: Session = Depends(get_db)):
    color = _get_color_or_404(db, color_id)
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(color, field, value)
    db.commit()
    db.refresh(color)
    return color


@colors_router.delete("/{color_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_color(color_id: int, db: Session = Depends(get_db)):
    color = _get_color_or_404(db, color_id)
    db.delete(color)
    db.commit()
