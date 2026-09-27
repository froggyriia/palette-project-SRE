from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/palettes", tags=["palettes"])


def _get_palette_or_404(db: Session, palette_id: int) -> models.Palette:
    palette = db.get(models.Palette, palette_id)
    if palette is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Palette not found")
    return palette


@router.post("", response_model=schemas.PaletteOut, status_code=status.HTTP_201_CREATED)
def create_palette(payload: schemas.PaletteCreate, db: Session = Depends(get_db)):
    # No auth yet (Этап 5 adds it): every palette is created as a guest
    # palette, user_id stays null regardless of who's asking.
    palette = models.Palette(
        user_id=None,
        name=payload.name,
        base_color=payload.base_color,
        scheme_type=payload.scheme_type,
    )
    palette.colors = [
        models.Color(hex=c.hex, position=c.position) for c in payload.colors
    ]
    db.add(palette)
    db.commit()
    db.refresh(palette)
    return palette


@router.get("", response_model=list[schemas.PaletteOut])
def list_palettes(db: Session = Depends(get_db)):
    return db.query(models.Palette).order_by(models.Palette.id).all()


@router.get("/{palette_id}", response_model=schemas.PaletteOut)
def get_palette(palette_id: int, db: Session = Depends(get_db)):
    return _get_palette_or_404(db, palette_id)


@router.patch("/{palette_id}", response_model=schemas.PaletteOut)
def update_palette(palette_id: int, payload: schemas.PaletteUpdate, db: Session = Depends(get_db)):
    palette = _get_palette_or_404(db, palette_id)
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(palette, field, value)
    db.commit()
    db.refresh(palette)
    return palette


@router.delete("/{palette_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_palette(palette_id: int, db: Session = Depends(get_db)):
    palette = _get_palette_or_404(db, palette_id)
    db.delete(palette)
    db.commit()
