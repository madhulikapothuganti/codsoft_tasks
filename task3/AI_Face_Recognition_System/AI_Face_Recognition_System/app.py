"""
app.py
AI Face Detection and Recognition System - Flask application entry point.

Built for the CodSoft Artificial Intelligence Internship.
Tech: Flask + OpenCV (LBPH Face Recognizer, opencv-contrib-python) + SQLite.
No dlib. No face_recognition library.
"""

import os
import shutil
import traceback
from datetime import datetime

from flask import (
    Flask,
    render_template,
    request,
    jsonify,
    redirect,
    url_for,
    flash,
    send_file,
)

import cv2

import database as db
import camera
import train_model
import recognizer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")
TRAINER_DIR = os.path.join(BASE_DIR, "trainer")
ATTENDANCE_DIR = os.path.join(BASE_DIR, "attendance")

REQUIRED_CAPTURES = 30

app = Flask(__name__)
app.config["SECRET_KEY"] = "codsoft-ai-face-recognition-secret-key"
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB upload limit

for folder in (DATASET_DIR, TRAINER_DIR, ATTENDANCE_DIR):
    os.makedirs(folder, exist_ok=True)

db.init_db()


# ---------------------------------------------------------------------------
# Page routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    stats = db.get_stats()
    model_ready = recognizer.is_model_ready()
    total_images = train_model.count_images()
    return render_template(
        "index.html",
        active="dashboard",
        stats=stats,
        model_ready=model_ready,
        total_images=total_images,
    )


@app.route("/register")
def register_page():
    return render_template("register.html", active="register", required_captures=REQUIRED_CAPTURES)


@app.route("/train")
def train_page():
    return render_template(
        "train.html",
        active="train",
        model_ready=recognizer.is_model_ready(),
        total_images=train_model.count_images(),
        total_users=train_model.count_registered_folders(),
    )


@app.route("/detect")
def detect_page():
    return render_template("detect.html", active="detect")


@app.route("/recognize")
def recognize_page():
    return render_template("recognize.html", active="recognize", model_ready=recognizer.is_model_ready())


@app.route("/users")
def users_page():
    users = db.get_all_users()
    return render_template("users.html", active="users", users=users)


@app.route("/attendance")
def attendance_page():
    records = db.get_all_attendance()
    stats = db.get_stats()
    return render_template("attendance.html", active="attendance", records=records, stats=stats)


# ---------------------------------------------------------------------------
# API: Registration
# ---------------------------------------------------------------------------

@app.route("/api/register_user", methods=["POST"])
def api_register_user():
    try:
        data = request.get_json(force=True, silent=True) or {}
        name = (data.get("name") or "").strip()
        user_id = (data.get("user_id") or "").strip()
        department = (data.get("department") or "").strip()

        if not name or not user_id or not department:
            return jsonify(success=False, message="Name, ID and Department are all required."), 400

        user = db.add_user(user_id, name, department)
        folder_path = os.path.join(DATASET_DIR, user["folder"])
        os.makedirs(folder_path, exist_ok=True)

        return jsonify(success=True, db_id=user["id"], folder=user["folder"])

    except db.DuplicateUserError as exc:
        return jsonify(success=False, message=str(exc)), 409
    except Exception as exc:
        traceback.print_exc()
        return jsonify(success=False, message=f"Registration failed: {exc}"), 500


@app.route("/api/capture_face", methods=["POST"])
def api_capture_face():
    try:
        data = request.get_json(force=True, silent=True) or {}
        folder = data.get("folder")
        image_data = data.get("image")
        index = data.get("index", 0)

        if not folder:
            return jsonify(success=False, error="bad_request", message="Missing registration folder."), 400

        folder_path = os.path.join(DATASET_DIR, folder)
        if not os.path.isdir(folder_path):
            return jsonify(
                success=False, error="missing_folder", message="Registration session not found. Please restart registration."
            ), 400

        try:
            img = camera.decode_base64_image(image_data)
        except camera.CameraError as exc:
            return jsonify(success=False, error="bad_image", message=str(exc)), 400

        gray = camera.to_gray(img)
        faces = camera.detect_faces(gray)

        if len(faces) == 0:
            return jsonify(
                success=False, error="no_face", message="No face detected. Please look directly at the camera."
            )
        if len(faces) > 1:
            return jsonify(
                success=False,
                error="multiple_faces",
                message="Multiple faces detected. Please make sure only one person is in frame.",
            )

        face_crop = camera.crop_and_resize_face(gray, faces[0])
        image_path = os.path.join(folder_path, f"img_{int(index):03d}.jpg")
        cv2.imwrite(image_path, face_crop)

        return jsonify(success=True, index=index)

    except Exception as exc:
        traceback.print_exc()
        return jsonify(success=False, error="server_error", message=f"Capture failed: {exc}"), 500


# ---------------------------------------------------------------------------
# API: Training
# ---------------------------------------------------------------------------

@app.route("/api/train_start", methods=["POST"])
def api_train_start():
    try:
        if train_model.count_registered_folders() == 0:
            return jsonify(success=False, message="No registered users found. Please register a face first."), 400

        started = train_model.start_training_thread()
        if not started:
            return jsonify(success=False, message="Training is already in progress.")
        return jsonify(success=True, message="Training started.")
    except Exception as exc:
        traceback.print_exc()
        return jsonify(success=False, message=f"Could not start training: {exc}"), 500


@app.route("/api/train_status")
def api_train_status():
    return jsonify(train_model.get_status())


# ---------------------------------------------------------------------------
# API: Face Detection (image upload)
# ---------------------------------------------------------------------------

@app.route("/api/detect_faces", methods=["POST"])
def api_detect_faces():
    try:
        if "image" not in request.files:
            return jsonify(success=False, message="No image file uploaded."), 400

        file = request.files["image"]
        if file.filename == "":
            return jsonify(success=False, message="No file selected."), 400

        allowed_ext = (".jpg", ".jpeg", ".png", ".bmp", ".webp")
        if not file.filename.lower().endswith(allowed_ext):
            return jsonify(success=False, message="Unsupported file type. Please upload a JPG, PNG, BMP or WEBP image."), 400

        try:
            img = camera.decode_upload_to_image(file)
        except camera.CameraError as exc:
            return jsonify(success=False, message=str(exc)), 400

        gray = camera.to_gray(img)
        faces = camera.detect_faces(gray)

        output = img.copy()
        for (x, y, w, h) in faces:
            cv2.rectangle(output, (x, y), (x + w, y + h), (0, 255, 0), 3)

        encoded = camera.encode_image_to_base64(output)

        return jsonify(success=True, image=encoded, face_count=len(faces))

    except Exception as exc:
        traceback.print_exc()
        return jsonify(success=False, message=f"Detection failed: {exc}"), 500


# ---------------------------------------------------------------------------
# API: Face Recognition (webcam) + Attendance
# ---------------------------------------------------------------------------

@app.route("/api/recognize_face", methods=["POST"])
def api_recognize_face():
    try:
        if not recognizer.is_model_ready():
            return jsonify(
                success=False, message="The recognition model has not been trained yet. Please train the model first."
            ), 400

        data = request.get_json(force=True, silent=True) or {}
        image_data = data.get("image")

        try:
            img = camera.decode_base64_image(image_data)
        except camera.CameraError as exc:
            return jsonify(success=False, message=str(exc)), 400

        gray = camera.to_gray(img)
        results = recognizer.recognize_faces_in_image(gray)

        faces_out = []
        for r in results:
            if r["recognized"]:
                user = db.get_user_by_dbid(r["label"])
                if user:
                    marked = db.mark_attendance(user["id"], user["user_id"], user["name"], user["department"])
                    faces_out.append(
                        {
                            "box": r["box"],
                            "status": "known",
                            "name": user["name"],
                            "user_id": user["user_id"],
                            "department": user["department"],
                            "confidence": r["match_percent"],
                            "attendance_marked": marked,
                        }
                    )
                    continue

            faces_out.append(
                {
                    "box": r["box"],
                    "status": "unknown",
                    "name": "UNKNOWN",
                    "user_id": "-",
                    "department": "-",
                    "confidence": r["match_percent"],
                    "attendance_marked": False,
                }
            )

        return jsonify(success=True, faces=faces_out, face_count=len(faces_out))

    except Exception as exc:
        traceback.print_exc()
        return jsonify(success=False, message=f"Recognition failed: {exc}"), 500


# ---------------------------------------------------------------------------
# API: Manage Users
# ---------------------------------------------------------------------------

@app.route("/api/delete_user/<int:db_id>", methods=["POST"])
def api_delete_user(db_id):
    try:
        user = db.get_user_by_dbid(db_id)
        if not user:
            return jsonify(success=False, message="User not found."), 404

        folder_path = os.path.join(DATASET_DIR, user["folder"])
        if os.path.isdir(folder_path):
            shutil.rmtree(folder_path, ignore_errors=True)

        db.delete_user(db_id)

        remaining = train_model.count_registered_folders()
        if remaining > 0:
            train_model.train_synchronously()
            status = train_model.get_status()
            retrained = status.get("success", False)
        else:
            train_model.remove_model()
            retrained = True

        return jsonify(success=True, message="User deleted successfully.", retrained=retrained)

    except Exception as exc:
        traceback.print_exc()
        return jsonify(success=False, message=f"Delete failed: {exc}"), 500


# ---------------------------------------------------------------------------
# API: Attendance export
# ---------------------------------------------------------------------------

@app.route("/attendance/export")
def export_attendance():
    try:
        path = db.export_attendance_csv()
        return send_file(path, as_attachment=True, download_name="attendance.csv", mimetype="text/csv")
    except Exception as exc:
        traceback.print_exc()
        flash(f"Could not export attendance: {exc}", "error")
        return redirect(url_for("attendance_page"))


@app.route("/api/dashboard_stats")
def api_dashboard_stats():
    stats = db.get_stats()
    stats["model_ready"] = recognizer.is_model_ready()
    stats["total_images"] = train_model.count_images()
    return jsonify(stats)


# ---------------------------------------------------------------------------
# Error handlers
# ---------------------------------------------------------------------------

@app.errorhandler(404)
def not_found(e):
    return render_template("404.html"), 404


@app.errorhandler(500)
def server_error(e):
    return render_template("500.html"), 500


@app.errorhandler(413)
def too_large(e):
    return jsonify(success=False, message="The uploaded file is too large. Maximum size is 16 MB."), 413


if __name__ == "__main__":
    print("=" * 60)
    print(" AI Face Detection & Recognition System - CodSoft Internship")
    print(" Starting Flask server at http://127.0.0.1:5000")
    print("=" * 60)
    app.run(debug=True, host="127.0.0.1", port=5000, threaded=True)
