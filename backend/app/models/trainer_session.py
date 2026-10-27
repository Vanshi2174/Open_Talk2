from __future__ import annotations

from datetime import datetime, timezone
import json

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import db


class TrainerSession(db.Model):
    __tablename__ = "trainer_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    mode: Mapped[str] = mapped_column(String(40), nullable=False)
    difficulty: Mapped[str] = mapped_column(String(40), nullable=False)
    language: Mapped[str] = mapped_column(String(20), default="English", nullable=False)
    custom_topic: Mapped[str | None] = mapped_column(String(255), nullable=True)
    target_duration_minutes: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    camera_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    transcript: Mapped[str] = mapped_column(Text, nullable=False, default="")
    turns_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    metrics_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    visual_observations_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    coaching_source: Mapped[str] = mapped_column(String(20), nullable=False, default="local")
    coaching_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")

    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship("User", back_populates="trainer_sessions")

    def turns(self) -> list[dict]:
        try:
            data = json.loads(self.turns_json)
            return data if isinstance(data, list) else []
        except Exception:
            return []

    def metrics(self) -> dict:
        try:
            data = json.loads(self.metrics_json)
            return data if isinstance(data, dict) else {}
        except Exception:
            return {}

    def visual_observations(self) -> dict:
        try:
            data = json.loads(self.visual_observations_json)
            return data if isinstance(data, dict) else {}
        except Exception:
            return {}

    def coaching(self) -> dict:
        try:
            data = json.loads(self.coaching_json)
            return data if isinstance(data, dict) else {}
        except Exception:
            return {}

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "mode": self.mode,
            "difficulty": self.difficulty,
            "language": self.language,
            "custom_topic": self.custom_topic,
            "target_duration_minutes": self.target_duration_minutes,
            "duration_seconds": self.duration_seconds,
            "camera_enabled": self.camera_enabled,
            "transcript": self.transcript,
            "turns": self.turns(),
            "metrics": self.metrics(),
            "visual_observations": self.visual_observations(),
            "coaching_source": self.coaching_source,
            "coaching": self.coaching(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def to_summary(self) -> dict:
        coaching = self.coaching()
        return {
            "id": self.id,
            "session_type": "trainer",
            "mode": self.mode,
            "difficulty": self.difficulty,
            "language": self.language,
            "custom_topic": self.custom_topic,
            "duration_seconds": self.duration_seconds,
            "camera_enabled": self.camera_enabled,
            "coaching_source": self.coaching_source,
            "summary": str(coaching.get("summary") or "")[:220],
            "overall_score": (coaching.get("performance_indicators") or {}).get("overall_score"),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
        }
