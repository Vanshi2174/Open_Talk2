from flask import Flask, jsonify
from flask_cors import CORS
from flask_sock import Sock

from app.auth.csrf import check_csrf
from app.auth.routes import auth_bp
from app.config import Config
from app.models.base import db
from app.models.session import PracticeSession  # noqa: F401
from app.models.trainer_session import TrainerSession  # noqa: F401
from app.routes.health import health_bp
from app.routes.sessions import sessions_bp
from app.routes.trainer import register_trainer_websocket, trainer_bp


def create_app(config_object: type[Config] | None = None) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_object or Config)

    # Initialize extensions
    db.init_app(app)
    sock = Sock(app)

    import os
    import re

    allowed_origins = list(
        set(
            app.config.get("ALLOWED_ORIGINS", [])
            + [o.strip() for o in app.config.get("FRONTEND_ORIGIN", "").split(",") if o.strip()]
        )
    )
    if app.debug or os.getenv("FLASK_ENV") == "development" or app.config.get("ENV") == "development":
        allowed_origins.append(re.compile(r"^https?://(localhost|127\.0\.0\.1|.*\.loca\.lt|.*\.ngrok.*)(:\d+)?$"))

    CORS(
        app,
        origins=allowed_origins,
        supports_credentials=True,
    )

    # CSRF protection
    @app.before_request
    def handle_csrf():
        return check_csrf()

    # Blueprints
    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(sessions_bp)
    app.register_blueprint(trainer_bp)

    # Register WebSocket handler
    register_trainer_websocket(sock, app)

    # Create tables
    with app.app_context():
        db.create_all()

    @app.errorhandler(400)
    def bad_request(error):
        message = getattr(error, "description", "Bad request.")
        return jsonify({"error": "bad_request", "message": message}), 400

    @app.errorhandler(401)
    def unauthorized(error):
        message = getattr(error, "description", "Unauthorized.")
        return jsonify({"error": "unauthorized", "message": message}), 401

    @app.errorhandler(403)
    def forbidden(error):
        message = getattr(error, "description", "Forbidden.")
        return jsonify({"error": "forbidden", "message": message}), 403

    @app.errorhandler(404)
    def not_found(_error):
        return jsonify({"error": "not_found", "message": "Resource not found."}), 404

    @app.errorhandler(405)
    def method_not_allowed(_error):
        return jsonify(
            {"error": "method_not_allowed", "message": "Method not allowed."}
        ), 405

    @app.errorhandler(500)
    def server_error(_error):
        return jsonify(
            {"error": "server_error", "message": "An unexpected error occurred."}
        ), 500

    return app
