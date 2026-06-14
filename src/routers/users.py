import sqlite3
from datetime import date, time
from fastapi import APIRouter, HTTPException, Header
from schemas import UserCreate, BookingResponse, UserResponse
from typing import List
from config import DB_FILE
from security import hash_password
import json

router = APIRouter(tags=["Users"])

@router.get("/api/users", response_model=List[UserResponse])
def get_users():
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT username, full_name, email FROM users WHERE username != 'admin'")
        return [{"username": row[0], "full_name": row[1], "email": row[2]} for row in cursor.fetchall()]

@router.post("/api/users/add")
def admin_register(user: UserCreate, x_token: str = Header(...)):
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT is_admin FROM users WHERE username = ?", (x_token,))
        user_row = cursor.fetchone()
        is_admin = user_row[0] if user_row else 0

        if not is_admin:
            raise HTTPException(status_code=403, detail="Доступ запрещен. Только для администраторов")

        cursor.execute("SELECT 1 FROM users WHERE username = ?", (user.username,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Пользователь уже существует")

        cursor.execute(
            "INSERT INTO users (username, password, full_name, email) VALUES (?, ?, ?, ?)",
            (user.username, hash_password(user.password), user.full_name, user.email)
        )
        conn.commit()

        return {"message": f"Пользователь {user.username} успешно зарегистрирован администратором"}


@router.get("/api/users/{username}/bookings", response_model=List[BookingResponse])
def get_user_bookings(username: str):
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT 1 FROM users WHERE username = ?", (username,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Пользователь не найден")

        cursor.execute(
            """
            SELECT id, room, username, booking_date, start_time, end_time, participants 
            FROM bookings 
            WHERE username = ? OR participants LIKE ?
            """,
            (username, f'%"{username}"%')
        )
        rows = cursor.fetchall()
        return [
            {
                "id": r[0],
                "room": r[1],
                "username": r[2],
                "booking_date": date.fromisoformat(r[3]),
                "start_time": time.fromisoformat(r[4]),
                "end_time": time.fromisoformat(r[5]),
                "participants": json.loads(r[6]) if r[6] else [],
            }
            for r in rows
        ]