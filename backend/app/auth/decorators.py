from __future__ import annotations

from functools import wraps
from flask import g, jsonify, session

from app.models.base import db
from app.models.user import User


def login_required(f):
    """Ensure the user is authenticated via session."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = session.get("user_id")
        if not user_id:
            return (
                jsonify(
                    {"error": "unauthorized", "message": "Authentication required."}
                ),
                401,
            )

        user = db.session.get(User, user_id)
        if not user:
            session.clear()
            return (
                jsonify(
                    {"error": "unauthorized", "message": "User session is invalid."}
                ),
                401,
            )

        g.current_user = user
        return f(*args, **kwargs)

    return decorated_function


def require_ownership(user_id_param: str = "user_id"):
    """
    Ensure the logged-in user matches the resource's owner ID.
    Prevents cross-user data access (IDOR / unauthorized data access).
    """
    def decorator(f):
        @wraps(f)
        @login_required
        def decorated_function(*args, **kwargs):
            target_user_id = kwargs.get(user_id_param)
            if target_user_id is not None and g.current_user.id != int(target_user_id):
                return (
                    jsonify(
                        {
                            "error": "forbidden",
                            "message": "You do not have permission to access another user's data.",
                        }
                    ),
                    403,
                )
            return f(*args, **kwargs)

        return decorated_function

    return decorator
