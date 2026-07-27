# SCANNIX — AI Face Detection & Recognition System

A complete, production-ready face detection & recognition system built for the
**CodSoft Artificial Intelligence Internship**.

Built with **Flask + OpenCV (LBPH Face Recognizer) + SQLite** — no `dlib`, no
`face_recognition` library. Everything runs locally on your machine, including
the machine-learning model.

---

## ✨ Features

- **Modern dark-mode UI** — glassmorphism, animated scan-line motifs, fully responsive
- **Register Face** — webcam captures 30 face samples automatically, tied to Name / ID / Department
- **Train Model** — trains OpenCV's LBPH recognizer with a live progress bar
- **Detect Faces** — upload any image, get every face boxed in green with a count
- **Recognize Live** — real-time webcam recognition showing Name, ID, Department & confidence %; unrecognized faces are labelled `UNKNOWN`
- **Attendance** — automatically logged once per person per day, exportable as `attendance.csv`
- **Manage Users** — view & delete registered profiles; deleting a user automatically retrains the model
- **Dashboard** — total users, today's attendance, model status, camera status
- **Friendly error handling** — camera not found, no face detected, multiple faces, training failures, missing files

---

## 🧱 Tech Stack

| Layer          | Technology                              |
|----------------|------------------------------------------|
| Backend        | Python 3.11, Flask                       |
| Face Detection | OpenCV Haar Cascade Classifier           |
| Face Recognition | OpenCV **LBPH** Face Recognizer (`cv2.face`) |
| Database       | SQLite                                   |
| Frontend       | HTML5, CSS3, Vanilla JavaScript          |

> **No `dlib`. No `face_recognition` library.** Face detection uses OpenCV's built-in
> Haar Cascade classifier; face recognition uses OpenCV's built-in LBPH
> (Local Binary Patterns Histograms) algorithm from `opencv-contrib-python`.

---

## 📁 Project Structure

```
AI_Face_Recognition_System/
│
├── app.py                 # Flask application & all routes
├── camera.py               # Image decoding + Haar Cascade face detection helpers
├── database.py              # SQLite operations (users, attendance, CSV export)
├── train_model.py            # LBPH training with background progress tracking
├── recognizer.py             # Loads trained model & performs recognition
├── requirements.txt
├── README.md
│
├── templates/               # Jinja2 HTML templates
├── static/
│   ├── css/style.css          # Design system (dark mode + glassmorphism)
│   └── js/                    # Page-specific JavaScript
│
├── dataset/                 # Captured face images (auto-created, per user folder)
├── trainer/                  # trainer.yml — the trained LBPH model
├── attendance/                # attendance.csv export
└── database/                  # face_recognition.db (SQLite)
```

---

## 💻 Installation — Windows 11 + Python 3.11

### 1. Install Python 3.11
Download from [python.org](https://www.python.org/downloads/) and make sure
**"Add Python to PATH"** is checked during install. Verify:

```powershell
python --version
```

### 2. Extract the project
Unzip `AI_Face_Recognition_System.zip` anywhere, e.g. `C:\Projects\AI_Face_Recognition_System`.

### 3. Open PowerShell in the project folder

```powershell
cd C:\Projects\AI_Face_Recognition_System
```

### 4. Create a virtual environment

```powershell
python -m venv venv
```

### 5. Activate the virtual environment

```powershell
venv\Scripts\activate
```

If PowerShell blocks script execution, run this once (as your normal user, not admin):

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### 6. Install dependencies

```powershell
pip install --upgrade pip
pip install -r requirements.txt
```

> **Important:** Only `opencv-contrib-python` is installed (not `opencv-python`
> alongside it). `opencv-contrib-python` already includes everything from the
> base package **plus** the `cv2.face` module required for LBPH. Installing
> both packages together commonly causes DLL / import conflicts on Windows —
> so this project intentionally installs just the contrib package.

### 7. Run the app

```powershell
python app.py
```

You should see:

```
============================================================
 AI Face Detection & Recognition System - CodSoft Internship
 Starting Flask server at http://127.0.0.1:5000
============================================================
```

### 8. Open in your browser

```
http://127.0.0.1:5000
```

Allow camera permissions when prompted by the browser on the Register / Recognize pages.

---

## 🚀 Usage Walkthrough

1. **Register Face** — enter Name, ID, Department → click **Start Camera & Capture** → hold still and slowly turn your head while 30 samples are captured automatically.
2. **Train Model** — click **Start Training**; watch the live progress bar as OpenCV builds the LBPH model from every captured image.
3. **Recognize Live** — click **Start Camera**; recognized faces show Name / ID / Department / confidence and are logged to attendance automatically (once per day per person). Unrecognized faces are labeled `UNKNOWN`.
4. **Detect Faces** — upload any photo to see every detected face boxed in green with a total count.
5. **Manage Users** — view all registered profiles; delete any user to remove their data and automatically retrain the model.
6. **Attendance** — browse every logged attendance record and export to `attendance.csv` at any time.

---

## 🛠️ Troubleshooting

| Problem | Fix |
|---|---|
| `ImportError: No module named cv2.face` | You likely have both `opencv-python` and `opencv-contrib-python` installed. Run `pip uninstall opencv-python opencv-contrib-python -y` then `pip install opencv-contrib-python==4.10.0.84`. |
| Camera doesn't start | Make sure no other application (Zoom, Teams, another browser tab) is using the webcam, and that you clicked "Allow" on the browser's camera permission prompt. |
| "No face detected" during registration | Ensure good, even lighting and that your face is centered and unobstructed. |
| "Multiple faces detected" during registration | Make sure only one person is in frame while capturing. |
| Training fails with "No registered faces found" | Register at least one user (with captured images) before training. |
| Port 5000 already in use | Edit the last line of `app.py` and change `port=5000` to another port, e.g. `port=5050`. |

---

## 🔒 Notes on Privacy & Data

All face images, the trained model, the SQLite database, and attendance
records are stored **entirely on your local machine** under `dataset/`,
`trainer/`, `database/`, and `attendance/`. Nothing is uploaded anywhere.

---

Built for the **CodSoft Artificial Intelligence Internship**.
