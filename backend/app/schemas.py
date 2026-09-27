import re
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

HEX_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


def _validate_hex(value: str) -> str:
    if not HEX_RE.match(value):
        raise ValueError("must be a hex color like #a1b2c3")
    return value.lower()


# --- Color ---

class ColorBase(BaseModel):
    hex: str
    position: int = 0

    @field_validator("hex")
    @classmethod
    def _hex_format(cls, v: str) -> str:
        return _validate_hex(v)


class ColorCreate(ColorBase):
    pass


class ColorUpdate(BaseModel):
    hex: Optional[str] = None
    position: Optional[int] = None

    @field_validator("hex")
    @classmethod
    def _hex_format(cls, v: Optional[str]) -> Optional[str]:
        return _validate_hex(v) if v is not None else v


class ColorOut(ColorBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    palette_id: int


# --- Palette ---

class PaletteBase(BaseModel):
    name: str = "Untitled palette"
    base_color: str
    scheme_type: Optional[str] = None

    @field_validator("base_color")
    @classmethod
    def _base_color_format(cls, v: str) -> str:
        return _validate_hex(v)


class PaletteCreate(PaletteBase):
    colors: list[ColorCreate] = []


class PaletteUpdate(BaseModel):
    name: Optional[str] = None
    base_color: Optional[str] = None
    scheme_type: Optional[str] = None

    @field_validator("base_color")
    @classmethod
    def _base_color_format(cls, v: Optional[str]) -> Optional[str]:
        return _validate_hex(v) if v is not None else v


class PaletteOut(PaletteBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: Optional[int]
    created_at: datetime
    colors: list[ColorOut] = []


# --- Generate (Этап 4: theory module -> API) ---

class SchemeType(str, Enum):
    complementary = "complementary"
    analogous = "analogous"
    triadic = "triadic"
    tetradic = "tetradic"


class PaletteGenerateRequest(BaseModel):
    base_color: str
    scheme: SchemeType
    name: Optional[str] = None
    # Only used when scheme == analogous; how far the two neighbors sit
    # from the base color, in degrees.
    analogous_angle: float = 30

    @field_validator("base_color")
    @classmethod
    def _base_color_format(cls, v: str) -> str:
        return _validate_hex(v)


# --- Contrast (Этап 4: contrast module -> API) ---

class ColorPairContrast(BaseModel):
    color_a: str
    color_b: str
    ratio: float
    meets_aa_normal: bool
    meets_aa_large: bool


class BackgroundContrast(BaseModel):
    color: str
    against_white: float
    against_black: float


class PaletteContrastReport(BaseModel):
    palette_id: int
    pairs: list[ColorPairContrast]
    backgrounds: list[BackgroundContrast]


# --- Auth (Этап 5) ---

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
