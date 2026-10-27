from __future__ import annotations

import re
from flask import Blueprint, current_app, g, jsonify, make_response, request, session

from app.auth.csrf import (
    CSRF_COOKIE_NAME,
    generate_csrf_token,
    get_or_create_csrf_token,
)
from app.auth.decorators import login_required, require_ownership
from app.models.base import db
from app.models.user import EMAIL_REGEX, User

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

PASSWORD_LETTER_REGEX = re.compile(r"[A-Za-z]")
PASSWORD_NUMBER_REGEX = re.compile(r"[0-9]")


def _set_csrf_cookie(response, token: str):
    response.set_cookie(
        CSRF_COOKIE_NAME,
        token,
        httponly=False,
        samesite=current_app.config.get("SESSION_COOKIE_SAMESITE", "Lax"),
        secure=current_app.config.get("SESSION_COOKIE_SECURE", False),
        path="/",
    )
    return response


@auth_bp.get("/csrf-token")
def get_csrf():
    token = get_or_create_csrf_token()
    response = make_response(jsonify({"csrf_token": token}))
    return _set_csrf_cookie(response, token)


@auth_bp.post("/register")
def register():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "bad_request", "message": "Invalid JSON payload."}), 400

    name = str(payload.get("name", "")).strip()
    raw_email = str(payload.get("email", "")).strip()
    password = str(payload.get("password", ""))
    confirm_password = str(payload.get("confirmPassword", ""))

    field_errors: dict[str, str] = {}

    if not name:
        field_errors["name"] = "Name is required."
    elif len(name) > 100:
        field_errors["name"] = "Name must be 100 characters or fewer."

    normalized_email = User.normalize_email(raw_email)
    if not raw_email:
        field_errors["email"] = "Email is required."
    elif not EMAIL_REGEX.match(normalized_email):
        field_errors["email"] = "Enter a valid email address."

    if not password:
        field_errors["password"] = "Password is required."
    elif len(password) < 8:
        field_errors["password"] = "Password must be at least 8 characters long."
    elif len(password) > 128:
        field_errors["password"] = "Password must be 128 characters or fewer."
    elif not PASSWORD_LETTER_REGEX.search(password) or not PASSWORD_NUMBER_REGEX.search(password):
        field_errors["password"] = "Password must contain at least one letter and one number."

    if password != confirm_password:
        field_errors["confirmPassword"] = "Passwords do not match."

    if field_errors:
        return (
            jsonify(
                {
                    "error": "validation_error",
                    "message": "Please correct the errors in the form.",
                    "field_errors": field_errors,
                }
            ),
            400,
        )

    # Check for duplicate email
    existing_user = User.find_by_email(normalized_email)
    if existing_user is not None:
        return (
            jsonify(
                {
                    "error": "conflict",
                    "message": "An account with this email already exists.",
                    "field_errors": {"email": "An account with this email already exists."},
                }
            ),
            409,
        )

    # Create new user
    user = User(name=name, email=normalized_email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    # Establish session
    session.clear()
    session["user_id"] = user.id
    session.permanent = True
    csrf_token = generate_csrf_token()

    response = make_response(
        jsonify(
            {
                "user": user.to_dict(),
                "message": "Registration successful.",
                "csrf_token": csrf_token,
            }
        ),
        201,
    )
    return _set_csrf_cookie(response, csrf_token)


@auth_bp.post("/login")
def login():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "bad_request", "message": "Invalid JSON payload."}), 400

    raw_email = str(payload.get("email", "")).strip()
    password = str(payload.get("password", ""))

    field_errors: dict[str, str] = {}
    if not raw_email:
        field_errors["email"] = "Email is required."
    if not password:
        field_errors["password"] = "Password is required."

    if field_errors:
        return (
            jsonify(
                {
                    "error": "validation_error",
                    "message": "Please enter both email and password.",
                    "field_errors": field_errors,
                }
            ),
            400,
        )

    user = User.find_by_email(raw_email)
    if user is None or not user.check_password(password):
        return (
            jsonify(
                {
                    "error": "unauthorized",
                    "message": "Invalid email or password.",
                }
            ),
            401,
        )

    # Establish session and rotate session ID & CSRF
    session.clear()
    session["user_id"] = user.id
    session.permanent = True
    csrf_token = generate_csrf_token()

    response = make_response(
        jsonify(
            {
                "user": user.to_dict(),
                "message": "Login successful.",
                "csrf_token": csrf_token,
            }
        ),
        200,
    )
    return _set_csrf_cookie(response, csrf_token)


@auth_bp.post("/logout")
def logout():
    session.clear()
    csrf_token = generate_csrf_token()
    response = make_response(
        jsonify({"message": "Logged out successfully.", "csrf_token": csrf_token}),
        200,
    )
    return _set_csrf_cookie(response, csrf_token)


@auth_bp.get("/me")
def current_user():
    user_id = session.get("user_id")
    csrf_token = get_or_create_csrf_token()

    if not user_id:
        response = make_response(
            jsonify(
                {
                    "authenticated": False,
                    "user": None,
                    "csrf_token": csrf_token,
                }
            ),
            401,
        )
        return _set_csrf_cookie(response, csrf_token)

    user = db.session.get(User, user_id)
    if not user:
        session.clear()
        response = make_response(
            jsonify(
                {
                    "authenticated": False,
                    "user": None,
                    "csrf_token": csrf_token,
                }
            ),
            401,
        )
        return _set_csrf_cookie(response, csrf_token)

    response = make_response(
        jsonify(
            {
                "authenticated": True,
                "user": user.to_dict(),
                "csrf_token": csrf_token,
            }
        ),
        200,
    )
    return _set_csrf_cookie(response, csrf_token)


@auth_bp.get("/users/<int:user_id>/profile")
@login_required
@require_ownership("user_id")
def get_user_profile(user_id: int):
    """
    Demonstrates strict user data ownership protection.
    Returns profile data only if the authenticated user owns this resource.
    """
    return jsonify({"user": g.current_user.to_dict()}), 200
