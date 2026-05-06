# sdk_wrapper.py

"""Placeholder wrapper for the Mantra MFS100 fingerprint scanner SDK.

The real implementation should import the vendor‑provided DLL (e.g., MFS100.dll)
using ``ctypes`` or the official Python bindings if they exist.

This file provides three functions that the Flask connector calls:
  * ``initialize_scanner()`` – initialise the device (no‑op for the placeholder)
  * ``get_device_info()`` – return a dict with basic device information
  * ``capture_fingerprint()`` – perform a capture and return a dict with a
    base64‑encoded template and an optional preview image (mock data).

Replace the bodies of these functions with the actual SDK calls before
building the production executable.
"""

import base64
import os
from typing import Dict

# ---------------------------------------------------------------------------
# Helper to load the DLL – in production you would load the real Mantra DLL.
# ---------------------------------------------------------------------------
def _load_dll() -> None:
    # Example (adjust path as needed):
    # dll_path = os.path.join(os.path.dirname(__file__), "MFS100.dll")
    # global _dll
    # _dll = ctypes.WinDLL(dll_path)
    # For the placeholder we simply pass.
    pass

# ---------------------------------------------------------------------------
# Public API expected by the Flask connector
# ---------------------------------------------------------------------------
def initialize_scanner() -> None:
    """Initialise the Mantra scanner.

    In the real implementation this would call the SDK's init function and
    raise an exception if the device is not found.
    """
    _load_dll()
    # TODO: call the real SDK initialise method, e.g. ``_dll.Initialize()``
    # For now we assume success.
    return None


def get_device_info() -> Dict[str, str]:
    """Return basic information about the connected scanner.

    The real SDK typically provides model, serial number, firmware version, etc.
    """
    # TODO: query the SDK for actual device info.
    return {
        "model": "Mantra MFS100",
        "serial": "UNKNOWN",
        "firmware": "0.0",
    }


def capture_fingerprint() -> Dict[str, str]:
    """Capture a fingerprint and return a base64‑encoded template.

    The real SDK call will return raw bytes (ISO/ANSI template). Here we generate
    dummy data so the rest of the system can be exercised without hardware.
    """
    # Generate 256 random bytes as a mock template.
    dummy_template = os.urandom(256)
    template_b64 = base64.b64encode(dummy_template).decode("utf-8")

    # Optional preview image – a tiny 1x1 PNG (transparent) encoded as base64.
    # This avoids breaking UI code that expects a preview.
    tiny_png_b64 = (
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8"
        "+w8AAwMB/6V6Lk8AAAAASUVORK5CYII="
    )

    return {"template": template_b64, "preview": tiny_png_b64}
