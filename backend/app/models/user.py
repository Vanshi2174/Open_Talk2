from __future__ import annotations

from datetime import datetime, timezone
import re
from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from werkzeug.security import check_password_hash, generate_password_hash

from app.models.base import db

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class User(db.Model):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    sessions = relationship("PracticeSession", back_populates="user", cascade="all, delete-orphan")
    trainer_sessions = relationship("TrainerSession", back_populates="user", cascade="all, delete-orphan")

    @staticmethod
    def normalize_email(email: str | None) -> str:
        if not email:
            return ""
        return email.strip().lower()

    @classmethod
    def find_by_email(cls, email: str | None) -> User | None:
        normalized = cls.normalize_email(email)
        if not normalized:
            return None
        return db.session.execute(
            db.select(cls).where(cls.email == normalized)
        ).scalar_one_or_none()

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        if not self.password_hash or not password:
            return False
        return check_password_hash(self.password_hash, password)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
