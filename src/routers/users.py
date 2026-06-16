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
    # Открываем соединение и получаем список юзеров
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT username, full_name, email FROM users")
        return [{"username": row[0], "full_name": row[1], "email": row[2]} for row in cursor.fetchall()]

@router.post("/api/users/add")
def admin_register(user: UserCreate, x_token: str = Header(alias="x-token")):
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

@router.delete("/api/users/{username_to_delete}")
def delete_user(username_to_delete: str, x_token: str = Header(alias="x-token")):
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT is_admin FROM users WHERE username = ?", (x_token,))
        user_row = cursor.fetchone()
        if not user_row or not user_row[0]:
            raise HTTPException(status_code=403, detail="Доступ запрещен. Только для администраторов")
        cursor.execute("SELECT 1 FROM users WHERE username = ?", (username_to_delete,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Пользователь не найден")
        
        cursor.execute(
            "SELECT is_admin FROM users WHERE username = ?",
            (username_to_delete,)
        )
        target_row = cursor.fetchone()

        if target_row and target_row[0] and username_to_delete == x_token:
            raise HTTPException(
                status_code=400,
                detail="Администратор не может удалить собственную учетную запись"
            )
        
        cursor.execute("SELECT id, participants FROM bookings WHERE username = ?", (username_to_delete,))
        own_bookings = cursor.fetchall()
        for booking_id, raw_participants in own_bookings:
            try:
                participants = json.loads(raw_participants) if raw_participants else []
            except Exception:
                participants = []
            if not isinstance(participants, list):
                participants = []
            participants = [p for p in participants if p != username_to_delete]
            if participants:
                new_owner = participants.pop(0)
                cursor.execute(
                    "UPDATE bookings SET username = ?, participants = ? WHERE id = ?",
                    (new_owner, json.dumps(participants, ensure_ascii=False), booking_id)
                )
            else:
                cursor.execute("DELETE FROM bookings WHERE id = ?", (booking_id,))

        cursor.execute("SELECT id, participants FROM bookings WHERE username != ?", (username_to_delete,))
        other_bookings = cursor.fetchall()
        for booking_id, raw_participants in other_bookings:
            try:
                participants = json.loads(raw_participants) if raw_participants else []
            except Exception:
                participants = []
            if isinstance(participants, list) and username_to_delete in participants:
                participants = [p for p in participants if p != username_to_delete]
                cursor.execute(
                    "UPDATE bookings SET participants = ? WHERE id = ?",
                    (json.dumps(participants, ensure_ascii=False), booking_id)
                )
        conn.commit()

        cursor.execute("DELETE FROM workspace_bookings WHERE username = ?", (username_to_delete,))
        cursor.execute("DELETE FROM users WHERE username = ?", (username_to_delete,))
        conn.commit()
    return {"message": f"Пользователь {username_to_delete} успешно удален, его личные бронирования переоформлены на коллег"}
