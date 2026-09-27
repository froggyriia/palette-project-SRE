from itertools import combinations
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app import color_theory, export, models, schemas
from app.contrast import WCAG_AA_LARGE_TEXT, WCAG_AA_NORMAL_TEXT, contrast_ratio
from app.database import get_db

router = APIRouter(prefix="/palettes", tags=["palettes"])

_SCHEME_FUNCTIONS = {
    schemas.SchemeType.complementary: lambda base, angle: color_theory.complementary(base),
    schemas.SchemeType.analogous: lambda base, angle: color_theory.analogous(base, angle),
    schemas.SchemeType.triadic: lambda base, angle: color_theory.triadic(base),
    schemas.SchemeType.tetradic: lambda base, angle: color_theory.tetradic(base),
}


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


@router.post("/generate", response_model=schemas.PaletteOut, status_code=status.HTTP_201_CREATED)
def generate_palette(payload: schemas.PaletteGenerateRequest, db: Session = Depends(get_db)):
    """Generate a palette from a base color using the color_theory module,
    then persist it exactly like a hand-built one."""
    scheme_fn = _SCHEME_FUNCTIONS[payload.scheme]
    hexes = scheme_fn(payload.base_color, payload.analogous_angle)

    palette = models.Palette(
        user_id=None,
        name=payload.name or f"{payload.scheme.value.title()} palette",
        base_color=payload.base_color,
        scheme_type=payload.scheme.value,
    )
    palette.colors = [models.Color(hex=h, position=i) for i, h in enumerate(hexes)]
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


@router.get("/{palette_id}/contrast", response_model=schemas.PaletteContrastReport)
def get_palette_contrast(palette_id: int, db: Session = Depends(get_db)):
    """Pairwise WCAG contrast between every color in the palette, plus
    each color's contrast against plain white/black backgrounds."""
    palette = _get_palette_or_404(db, palette_id)
    hexes = [c.hex for c in palette.colors]

    pairs = [
        schemas.ColorPairContrast(
            color_a=a,
            color_b=b,
            ratio=round(contrast_ratio(a, b), 2),
            meets_aa_normal=contrast_ratio(a, b) >= WCAG_AA_NORMAL_TEXT,
            meets_aa_large=contrast_ratio(a, b) >= WCAG_AA_LARGE_TEXT,
        )
        for a, b in combinations(hexes, 2)
    ]
    backgrounds = [
        schemas.BackgroundContrast(
            color=h,
            against_white=round(contrast_ratio(h, "#ffffff"), 2),
            against_black=round(contrast_ratio(h, "#000000"), 2),
        )
        for h in hexes
    ]

    return schemas.PaletteContrastReport(palette_id=palette_id, pairs=pairs, backgrounds=backgrounds)


@router.get("/{palette_id}/export")
def export_palette(
    palette_id: int,
    format: Literal["json", "css", "scss", "tailwind"] = "json",
    db: Session = Depends(get_db),
):
    palette = _get_palette_or_404(db, palette_id)
    hexes = [c.hex for c in palette.colors]

    if format == "json":
        return {"name": palette.name, **export.to_json_colors(hexes)}
    if format == "css":
        return Response(content=export.to_css_variables(hexes), media_type="text/css")
    if format == "scss":
        return Response(content=export.to_scss_variables(hexes), media_type="text/x-scss")
    return Response(content=export.to_tailwind_config(hexes), media_type="application/javascript")
