from datetime import datetime, timezone

from sqlalchemy import String, Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    palettes: Mapped[list["Palette"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Palette(Base):
    __tablename__ = "palettes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # Nullable: a palette can be created by a guest (no auth) and only gets
    # attached to a user if they were logged in when they saved it.
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, default="Untitled palette")
    base_color: Mapped[str] = mapped_column(String(7), nullable=False)  # "#rrggbb"
    scheme_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    user: Mapped["User | None"] = relationship(back_populates="palettes")
    colors: Mapped[list["Color"]] = relationship(
        back_populates="palette", cascade="all, delete-orphan", order_by="Color.position"
    )


class Color(Base):
    __tablename__ = "colors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    palette_id: Mapped[int] = mapped_column(
        ForeignKey("palettes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    hex: Mapped[str] = mapped_column(String(7), nullable=False)  # "#rrggbb"
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    palette: Mapped["Palette"] = relationship(back_populates="colors")
