"""
recognizer.py
Loads the trained LBPH model and performs face recognition on incoming frames.
"""

import os
import cv2

from camera import get_face_cascade
from train_model import MODEL_PATH

# LBPH predict() returns a "distance" where LOWER means a better match.
# Below this threshold we consider the face a confident match; otherwise UNKNOWN.
CONFIDENCE_THRESHOLD = 75

_recognizer = None
_recognizer_mtime = None


def is_model_ready():
    return os.path.isfile(MODEL_PATH)


def _load_recognizer():
    global _recognizer, _recognizer_mtime
    if not os.path.isfile(MODEL_PATH):
        return None
    mtime = os.path.getmtime(MODEL_PATH)
    if _recognizer is None or _recognizer_mtime != mtime:
        rec = cv2.face.LBPHFaceRecognizer_create()
        rec.read(MODEL_PATH)
        _recognizer = rec
        _recognizer_mtime = mtime
    return _recognizer


def recognize_faces_in_image(gray_img):
    """
    Detect and recognize all faces in a grayscale image.
    Returns a list of dicts: box, label (db user id or -1), confidence, match_percent, recognized
    """
    cascade = get_face_cascade()
    detected = cascade.detectMultiScale(gray_img, 1.1, 5, minSize=(60, 60))
    recognizer = _load_recognizer()

    results = []
    for (x, y, w, h) in detected:
        face_img = cv2.resize(gray_img[y : y + h, x : x + w], (200, 200))
        if recognizer is not None:
            label, confidence = recognizer.predict(face_img)
            match_percent = max(0.0, round(100 - confidence, 2))
            recognized = confidence < CONFIDENCE_THRESHOLD
        else:
            label, confidence, match_percent, recognized = -1, 999.0, 0.0, False

        results.append(
            {
                "box": (int(x), int(y), int(w), int(h)),
                "label": int(label),
                "confidence": round(float(confidence), 2),
                "match_percent": match_percent,
                "recognized": bool(recognized),
            }
        )
    return results
