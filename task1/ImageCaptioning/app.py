"""
app.py
------
Flask web application for the AI Image Caption Generator.

Uses the free Hugging Face BLIP model (via caption_generator.py) to
generate captions for user-uploaded images. No API keys, no paid
services, no training - pure inference.
"""

import os
import uuid
import logging

from flask import (
    Flask,
    render_template,
    request,
    jsonify,
    url_for,
)
from werkzeug.utils import secure_filename
from werkzeug.exceptions import RequestEntityTooLarge

from caption_generator import get_generator, CaptionGeneratorError

# --------------------------------------------------------------------------
# App configuration
# --------------------------------------------------------------------------
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
MAX_CONTENT_LENGTH = 8 * 1024 * 1024  # 8 MB max upload size

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH
app.config["SECRET_KEY"] = "codsoft-image-captioning-secret-key"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
def allowed_file(filename: str) -> bool:
    """Check whether the uploaded file has an allowed image extension."""
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
    )


# --------------------------------------------------------------------------
# Routes
# --------------------------------------------------------------------------
@app.route("/")
def index():
    """Render the landing page."""
    return render_template("index.html")


@app.route("/upload", methods=["POST"])
def upload():
    """
    Handle image upload + caption generation.

    Expects a multipart/form-data POST with a single file field named
    'image'. Returns JSON:
        success -> { "success": true, "caption": "...", "image_url": "..." }
        failure -> { "success": false, "error": "..." }, HTTP 4xx/5xx
    """
    if "image" not in request.files:
        return jsonify({"success": False, "error": "No image file was provided."}), 400

    file = request.files["image"]

    if file.filename == "":
        return jsonify({"success": False, "error": "No file was selected."}), 400

    if not allowed_file(file.filename):
        return (
            jsonify(
                {
                    "success": False,
                    "error": "Unsupported file type. Please upload a PNG, JPG, JPEG, or WEBP image.",
                }
            ),
            400,
        )

    # Build a safe, unique filename to avoid collisions/overwrites
    original_name = secure_filename(file.filename)
    extension = original_name.rsplit(".", 1)[1].lower()
    unique_name = f"{uuid.uuid4().hex}.{extension}"
    save_path = os.path.join(app.config["UPLOAD_FOLDER"], unique_name)

    try:
        file.save(save_path)
    except OSError as exc:
        logger.error("Failed to save uploaded file: %s", exc)
        return (
            jsonify({"success": False, "error": "Could not save the uploaded file. Please try again."}),
            500,
        )

    try:
        generator = get_generator()
        caption = generator.generate_caption(save_path)
    except CaptionGeneratorError as exc:
        logger.warning("Caption generation error: %s", exc)
        # Clean up the bad file so uploads/ doesn't fill with junk
        _safe_remove(save_path)
        return jsonify({"success": False, "error": str(exc)}), 422
    except Exception as exc:  # noqa: BLE001 - final safety net, app must never crash
        logger.exception("Unexpected server error during caption generation")
        _safe_remove(save_path)
        return (
            jsonify(
                {
                    "success": False,
                    "error": "An unexpected server error occurred while generating the caption.",
                }
            ),
            500,
        )

    image_url = url_for("static_uploads", filename=unique_name)
    return jsonify({"success": True, "caption": caption, "image_url": image_url})


@app.route("/uploads/<path:filename>")
def static_uploads(filename):
    """Serve uploaded images back to the browser for preview."""
    from flask import send_from_directory

    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)


def _safe_remove(path: str) -> None:
    """Remove a file if it exists, never raising on failure."""
    try:
        if os.path.exists(path):
            os.remove(path)
    except OSError:
        pass


# --------------------------------------------------------------------------
# Error handlers - the app must NEVER crash with a raw traceback
# --------------------------------------------------------------------------
@app.errorhandler(413)
@app.errorhandler(RequestEntityTooLarge)
def handle_file_too_large(_error):
    return (
        jsonify(
            {
                "success": False,
                "error": "The uploaded image is too large. Maximum allowed size is 8 MB.",
            }
        ),
        413,
    )


@app.errorhandler(404)
def handle_not_found(_error):
    return render_template("index.html"), 404


@app.errorhandler(500)
def handle_server_error(_error):
    return (
        jsonify(
            {
                "success": False,
                "error": "Something went wrong on the server. Please try again shortly.",
            }
        ),
        500,
    )


# --------------------------------------------------------------------------
# Entry point
# --------------------------------------------------------------------------
if __name__ == "__main__":
    logger.info("Starting AI Image Caption Generator...")
    logger.info("Pre-loading BLIP model (this may take a moment on first run)...")
    try:
        get_generator().load_model()
        logger.info("Model loaded successfully. Ready to caption images!")
    except CaptionGeneratorError as exc:
        # We still start the app so the user gets a friendly error page
        # instead of a crash; the model will retry loading on first request.
        logger.error("Model failed to pre-load: %s", exc)

    app.run(debug=True, host="127.0.0.1", port=5000)
