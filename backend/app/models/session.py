from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import db


class PracticeSession(db.Model):
    __tablename__ = "practice_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    mode: Mapped[str] = mapped_column(String(40), nullable=False)
    difficulty: Mapped[str] = mapped_column(String(40), nullable=False)
    prompt_id: Mapped[str] = mapped_column(String(80), nullable=False)
    prompt_title: Mapped[str] = mapped_column(String(255), nullable=False)
    prompt_text: Mapped[str] = mapped_column(Text, nullable=False)
    transcript: Mapped[str] = mapped_column(Text, nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    stopped_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    coaching_source: Mapped[str] = mapped_column(String(20), nullable=False)
    coaching_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship("User", back_populates="sessions")

    def coaching(self) -> dict:
        try:
            payload = json.loads(self.coaching_json)
        except json.JSONDecodeError:
            return {}
        return payload if isinstance(payload, dict) else {}

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "mode": self.mode,
            "difficulty": self.difficulty,
            "prompt": {
                "id": self.prompt_id,
                "title": self.prompt_title,
                "text": self.prompt_text,
            },
            "transcript": self.transcript,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "stopped_at": self.stopped_at.isoformat() if self.stopped_at else None,
            "submitted_at": self.submitted_at.isoformat() if self.submitted_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "coaching_source": self.coaching_source,
            "coaching": self.coaching(),
        }

    def to_summary(self) -> dict:
        coaching = self.coaching()
        return {
            "id": self.id,
            "mode": self.mode,
            "difficulty": self.difficulty,
            "prompt_title": self.prompt_title,
            "submitted_at": self.submitted_at.isoformat() if self.submitted_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "coaching_source": self.coaching_source,
            "summary": str(coaching.get("summary") or "")[:220],
            "word_count": (coaching.get("metrics") or {}).get("word_count"),
        }
