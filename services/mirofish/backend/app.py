"""Flask application factory."""
from __future__ import annotations

import logging
import os
from typing import Any

from flask import Flask
from flask_cors import CORS


def create_app(config: dict[str, Any] | None = None) -> Flask:
    app = Flask(__name__)

    # CORS: only allow the Next.js origin
    origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    CORS(app, origins=origins, supports_credentials=True)

    # Logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )

    if config:
        app.config.update(config)

    # Blueprints
    from api.internal import internal_bp
    from api.progress import progress_bp

    app.register_blueprint(internal_bp)
    app.register_blueprint(progress_bp)

    @app.get("/health")
    def health():  # type: ignore[return-value]
        return {"ok": True, "service": "mirofish"}

    return app


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    app = create_app()
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG", "0") == "1")
