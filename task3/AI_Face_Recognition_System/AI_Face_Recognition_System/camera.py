"""
camera.py
Utility helpers for image handling and face detection using OpenCV's
Haar Cascade classifier (ships with opencv-contrib-python, no dlib / face_recognition
library involved anywhere in this project).
"""

import base64
import os
import cv2
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

_face_cascade = None


class CameraError(Exception):
    pass


def get_face_cascade():
    """Lazily load and cache the Haar Cascade frontal face classifier."""
    global _face_cascade
    if _face_cascade is None:
        cascade_path = os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")
        if not os.path.isfile(cascade_path):
            raise CameraError(
                "Haar Cascade file not found. Your OpenCV installation may be corrupted. "
                "Try reinstalling with: pip install --force-reinstall opencv-contrib-python"
            )
        classifier = cv2.CascadeClassifier(cascade_path)
        if classifier.empty():
            raise CameraError("Failed to load the face detection classifier.")
        _face_cascade = classifier
    return _face_cascade


def detect_faces(gray_img, scale_factor=1.1, min_neighbors=5, min_size=(60, 60)):
    """Detect faces in a grayscale image. Returns a list of (x, y, w, h) tuples."""
    cascade = get_face_cascade()
    faces = cascade.detectMultiScale(
        gray_img, scaleFactor=scale_factor, minNeighbors=min_neighbors, minSize=min_size
    )
    return list(faces)


def decode_base64_image(data_url):
    """Decode a base64 data URL (e.g. from an HTML5 canvas) into an OpenCV BGR image."""
    if not data_url:
        raise CameraError("No image data received from the camera.")
    try:
        if "," in data_url:
            _, encoded = data_url.split(",", 1)
        else:
            encoded = data_url
        binary = base64.b64decode(encoded)
        arr = np.frombuffer(binary, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise CameraError("Could not decode the captured image.")
        return img
    except CameraError:
        raise
    except Exception as exc:
        raise CameraError(f"Invalid image data received: {exc}")


def encode_image_to_base64(img, ext=".jpg"):
    """Encode an OpenCV image to a base64 data URL for sending back to the browser."""
    success, buffer = cv2.imencode(ext, img)
    if not success:
        raise CameraError("Failed to encode processed image.")
    b64 = base64.b64encode(buffer).decode("utf-8")
    mime = "image/jpeg" if ext.lower() in (".jpg", ".jpeg") else "image/png"
    return f"data:{mime};base64,{b64}"


def to_gray(img):
    return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)


def crop_and_resize_face(gray_img, rect, size=(200, 200)):
    x, y, w, h = rect
    face = gray_img[y : y + h, x : x + w]
    face = cv2.resize(face, size, interpolation=cv2.INTER_LINEAR)
    return face


def decode_upload_to_image(file_storage):
    """Decode a Flask FileStorage (uploaded file) into an OpenCV BGR image."""
    data = file_storage.read()
    if not data:
        raise CameraError("The uploaded file is empty.")
    arr = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise CameraError("Invalid image file. Please upload a valid JPG or PNG image.")
    return img
