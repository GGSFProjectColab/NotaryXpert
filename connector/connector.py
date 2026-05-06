#!/usr/bin/env python3

"""Local Flask connector for Mantra MFS100 fingerprint scanner.

Provides two simple HTTP endpoints:
  GET  /status   – health check, returns {"status": "online"}
  POST /capture  – triggers a fingerprint capture via the SDK wrapper and returns
                    a JSON payload containing the base64‑encoded fingerprint template
                    and optionally a preview image.

Configuration is driven by environment variables:
  CONNECTOR_PORT          – Port to listen on (default 5000)
  FRONTEND_ORIGIN         – Allowed CORS origin for the hosted React app
  BACKEND_API_URL         – URL of the cloud backend that receives the template
  ENABLE_LOGGING          – Set to "1" to enable verbose file logging

The actual scanner interaction lives in ``sdk_wrapper.py``.  This file contains
only glue code, error handling and a tiny logging shim so the connector can be
built into a self‑contained Windows executable with PyInstaller.
"""

import os
import json
import logging
from typing import Dict, Any
from flask import Flask, jsonify, request
from flask_cors import CORS

# Import placeholder SDK wrapper – replace with real implementation later.
from sdk_wrapper import initialize_scanner, get_device_info, capture_fingerprint

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
CONNECTOR_PORT = int(os.getenv("CONNECTOR_PORT", "5000"))
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "*")
BACKEND_API_URL = os.getenv("BACKEND_API_URL", "")
ENABLE_LOGGING = os.getenv("ENABLE_LOGGING", "0") == "1"

# ---------------------------------------------------------------------------
# Logging setup (writes to connector.log in the same folder as the exe)
# ---------------------------------------------------------------------------
log_level = logging.DEBUG if ENABLE_LOGGING else logging.INFO
logging.basicConfig(
    filename=os.path.join(os.path.dirname(__file__), "connector.log"),
    level=log_level,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Flask app
# ---------------------------------------------------------------------------
app = Flask(__name__)
# CORS – only allow the configured origin for production, "*" useful for dev.
CORS(app, resources={r"/*": {"origins": FRONTEND_ORIGIN}})

@app.route("/status", methods=["GET"])
def status() -> Any:
    logger.debug("Health check received")
    return jsonify({"status": "online"})

@app.route("/capture", methods=["POST"])
def capture() -> Any:
    logger.info("Capture request received from %s", request.remote_addr)
    try:
        # Initialise scanner (placeholder – may be a no‑op if already initialised)
        initialize_scanner()
        device_info = get_device_info()
        logger.debug("Device info: %s", device_info)

        # Perform the actual fingerprint capture
        payload = capture_fingerprint()
        # payload is expected to be a dict like {"template": "<base64>", "preview": "<base64 jpeg>"}
        logger.info("Capture succeeded, returning template")

        # Optionally forward to backend – keep it non‑blocking for now
        if BACKEND_API_URL:
            try:
                import requests
                resp = requests.post(
                    BACKEND_API_URL,
                    json={
                        "template": payload["template"],
                        "deviceInfo": device_info,
                    },
                    timeout=5,
                )
                logger.debug("Backend responded with %s", resp.status_code)
            except Exception as e:
                logger.warning("Failed to forward template to backend: %s", e)

        return jsonify({
            "success": True,
            "template": payload.get("template"),
            "preview": payload.get("preview"),
            "deviceInfo": device_info,
        })
    except Exception as exc:
        logger.exception("Capture failed")
        return (
            jsonify({"success": False, "error": str(exc)}),
            500,
        )

# Graceful shutdown – Flask will stop when the process exits.
if __name__ == "__main__":
    logger.info("Starting Fingerprint Connector on 127.0.0.1:%s", CONNECTOR_PORT)
    app.run(host="127.0.0.1", port=CONNECTOR_PORT, debug=False)
