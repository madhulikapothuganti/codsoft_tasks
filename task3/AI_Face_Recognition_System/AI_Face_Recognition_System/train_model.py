"""
train_model.py
Trains OpenCV's LBPH (Local Binary Patterns Histograms) Face Recognizer on the
images captured during registration. No dlib, no face_recognition library.

Training runs in a background thread so the frontend can poll /api/train_status
and display real progress to the user.
"""

import os
import threading
import cv2
import numpy as np

from camera import get_face_cascade, CameraError

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")
TRAINER_DIR = os.path.join(BASE_DIR, "trainer")
MODEL_PATH = os.path.join(TRAINER_DIR, "trainer.yml")

TRAIN_STATUS = {
    "running": False,
    "progress": 0,
    "total": 0,
    "message": "Idle",
    "done": False,
    "error": None,
    "success": False,
}
_lock = threading.Lock()


def _set_status(**kwargs):
    with _lock:
        TRAIN_STATUS.update(kwargs)


def get_status():
    with _lock:
        return dict(TRAIN_STATUS)


def reset_status():
    _set_status(running=False, progress=0, total=0, message="Idle", done=False, error=None, success=False)


def count_images():
    total = 0
    if not os.path.isdir(DATASET_DIR):
        return 0
    for folder in os.listdir(DATASET_DIR):
        folder_path = os.path.join(DATASET_DIR, folder)
        if os.path.isdir(folder_path):
            total += len([f for f in os.listdir(folder_path) if f.lower().endswith((".jpg", ".jpeg", ".png"))])
    return total


def count_registered_folders():
    if not os.path.isdir(DATASET_DIR):
        return 0
    return len([f for f in os.listdir(DATASET_DIR) if os.path.isdir(os.path.join(DATASET_DIR, f))])


def model_exists():
    return os.path.isfile(MODEL_PATH)


def _train():
    try:
        _set_status(running=True, progress=0, done=False, error=None, success=False, message="Preparing dataset...")
        os.makedirs(TRAINER_DIR, exist_ok=True)

        if not os.path.isdir(DATASET_DIR) or not os.listdir(DATASET_DIR):
            raise RuntimeError("No registered faces found. Please register at least one user before training.")

        total = count_images()
        if total == 0:
            raise RuntimeError("Dataset folders are empty. Please register users with captured face images first.")

        _set_status(total=total)

        try:
            cascade = get_face_cascade()
        except CameraError as exc:
            raise RuntimeError(str(exc))

        faces = []
        labels = []
        processed = 0

        for folder in sorted(os.listdir(DATASET_DIR)):
            folder_path = os.path.join(DATASET_DIR, folder)
            if not os.path.isdir(folder_path):
                continue
            try:
                label = int(folder.split("_")[0])
            except (ValueError, IndexError):
                continue

            image_files = sorted(
                f for f in os.listdir(folder_path) if f.lower().endswith((".jpg", ".jpeg", ".png"))
            )
            for img_name in image_files:
                img_path = os.path.join(folder_path, img_name)
                gray = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
                processed += 1
                if gray is None:
                    _set_status(progress=processed, message=f"Processing images... ({processed}/{total})")
                    continue

                detected = cascade.detectMultiScale(gray, 1.1, 5, minSize=(60, 60))
                if len(detected) > 0:
                    x, y, w, h = detected[0]
                    face_img = cv2.resize(gray[y : y + h, x : x + w], (200, 200))
                else:
                    # Image was already a cropped face captured during registration
                    face_img = cv2.resize(gray, (200, 200))

                faces.append(face_img)
                labels.append(label)
                _set_status(progress=processed, message=f"Processing images... ({processed}/{total})")

        if len(faces) == 0:
            raise RuntimeError("No valid face images could be processed for training.")

        _set_status(message="Training LBPH recognizer model...")

        recognizer = cv2.face.LBPHFaceRecognizer_create()
        recognizer.train(faces, np.array(labels))
        recognizer.save(MODEL_PATH)

        _set_status(
            running=False,
            done=True,
            success=True,
            progress=total,
            message=f"Training complete! {len(faces)} face images from {len(set(labels))} user(s) processed.",
        )
    except Exception as exc:
        _set_status(running=False, done=True, success=False, error=str(exc), message=f"Training failed: {exc}")


def start_training_thread():
    """Start training in a background thread. Returns False if training is already running."""
    if TRAIN_STATUS["running"]:
        return False
    reset_status()
    thread = threading.Thread(target=_train, daemon=True)
    thread.start()
    return True


def train_synchronously():
    """Blocking version, used after deleting a user so the model is retrained immediately."""
    if TRAIN_STATUS["running"]:
        return get_status()
    _train()
    return get_status()


def remove_model():
    if os.path.isfile(MODEL_PATH):
        os.remove(MODEL_PATH)
    reset_status()
