"""
database.py
Handles all SQLite database operations for the AI Face Recognition System:
- User registration records
- Attendance records
- CSV export of attendance
"""

import os
import re
import sqlite3
import csv
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_DIR = os.path.join(BASE_DIR, "database")
DB_PATH = os.path.join(DB_DIR, "face_recognition.db")
ATTENDANCE_DIR = os.path.join(BASE_DIR, "attendance")
ATTENDANCE_CSV = os.path.join(ATTENDANCE_DIR, "attendance.csv")


def sanitize(value):
    """Remove unsafe characters so the value is safe to use in folder names."""
    value = str(value).strip()
    value = re.sub(r"[^A-Za-z0-9_\-]+", "_", value)
    return value.strip("_") or "user"


def get_connection():
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create tables if they do not exist yet. Safe to call on every app start."""
    os.makedirs(DB_DIR, exist_ok=True)
    os.makedirs(ATTENDANCE_DIR, exist_ok=True)
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            department TEXT NOT NULL,
            folder TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            db_id INTEGER NOT NULL,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            department TEXT NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()


class DuplicateUserError(Exception):
    pass


def get_user_by_userid(user_id):
    conn = get_connection()
    row = conn.execute("SELECT * FROM users WHERE user_id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_dbid(db_id):
    conn = get_connection()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (db_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_all_users():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM users ORDER BY id DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def add_user(user_id, name, department):
    """Insert a new user and return dict with id + folder name (folder embeds the db id
    so the LBPH label used during training is always consistent and unique)."""
    if get_user_by_userid(user_id):
        raise DuplicateUserError(f"A user with ID '{user_id}' is already registered.")

    conn = get_connection()
    cur = conn.cursor()
    created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cur.execute(
        "INSERT INTO users (user_id, name, department, folder, created_at) VALUES (?, ?, ?, ?, ?)",
        (user_id, name, department, "", created_at),
    )
    new_id = cur.lastrowid
    folder = f"{new_id}_{sanitize(user_id)}_{sanitize(name)}"
    cur.execute("UPDATE users SET folder = ? WHERE id = ?", (folder, new_id))
    conn.commit()
    conn.close()
    return {"id": new_id, "user_id": user_id, "name": name, "department": department, "folder": folder}


def delete_user(db_id):
    conn = get_connection()
    conn.execute("DELETE FROM users WHERE id = ?", (db_id,))
    conn.commit()
    conn.close()


def mark_attendance(db_id, user_id, name, department):
    """Mark attendance only once per user per day. Returns True if a new record was created."""
    today = datetime.now().strftime("%Y-%m-%d")
    now_time = datetime.now().strftime("%H:%M:%S")

    conn = get_connection()
    existing = conn.execute(
        "SELECT id FROM attendance WHERE db_id = ? AND date = ?", (db_id, today)
    ).fetchone()

    if existing:
        conn.close()
        return False

    conn.execute(
        "INSERT INTO attendance (db_id, user_id, name, department, date, time) VALUES (?, ?, ?, ?, ?, ?)",
        (db_id, user_id, name, department, today, now_time),
    )
    conn.commit()
    conn.close()
    return True


def get_today_attendance():
    today = datetime.now().strftime("%Y-%m-%d")
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM attendance WHERE date = ? ORDER BY time DESC", (today,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_all_attendance():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM attendance ORDER BY date DESC, time DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_stats():
    conn = get_connection()
    total_users = conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"]
    today = datetime.now().strftime("%Y-%m-%d")
    today_attendance = conn.execute(
        "SELECT COUNT(*) AS c FROM attendance WHERE date = ?", (today,)
    ).fetchone()["c"]
    conn.close()
    return {"total_users": total_users, "today_attendance": today_attendance}


def export_attendance_csv():
    """Regenerate attendance/attendance.csv from the database and return its path."""
    os.makedirs(ATTENDANCE_DIR, exist_ok=True)
    records = get_all_attendance()
    with open(ATTENDANCE_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Name", "ID", "Department", "Date", "Time"])
        for r in records:
            writer.writerow([r["name"], r["user_id"], r["department"], r["date"], r["time"]])
    return ATTENDANCE_CSV
