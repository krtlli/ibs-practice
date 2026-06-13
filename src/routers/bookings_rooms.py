import sqlite3
import uuid
import json
from datetime import date, time
from fastapi import APIRouter, HTTPException, Header
from typing import List
from schemas import BookingCreate, BookingResponse
from config import DB_FILE

router = APIRouter(tags=["Bookings"])

@router.get("/api/booking-rooms/{room}", response_model=List[BookingResponse])
def get_bookings(room: str):
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, room, username, booking_date, start_time, end_time, participants FROM bookings WHERE room = ?", (room,))
        rows = cursor.fetchall()
        result = []
        for r in rows:
            participants = json.loads(r[6]) if r[6] else []
            result.append({
                "id": r[0],
                "room": r[1],
                "username": r[2],
                "booking_date": date.fromisoformat(r[3]),
                "start_time": time.fromisoformat(r[4]),
                "end_time": time.fromisoformat(r[5]),
                "participants": participants
            })
        return result
    
@router.get("/api/booking-rooms", response_model=List[BookingResponse])
def get_bookings(room: str):
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, room, username, booking_date, start_time, end_time, participants FROM bookings", (room,))
        rows = cursor.fetchall()
        result = []
        for r in rows:
            participants = json.loads(r[6]) if r[6] else []
            result.append({
                "id": r[0],
                "room": r[1],
                "username": r[2],
                "booking_date": date.fromisoformat(r[3]),
                "start_time": time.fromisoformat(r[4]),
                "end_time": time.fromisoformat(r[5]),
                "participants": participants
            })
        return result

@router.post("/api/booking-rooms", response_model=BookingResponse)
def create_booking(booking: BookingCreate, x_token: str = Header(...)):
    if booking.start_time >= booking.end_time:
        raise HTTPException(status_code=400, detail="Время окончания должно быть позже начала")

    b_date = booking.booking_date.isoformat()
    b_start = booking.start_time.isoformat()
    b_end = booking.end_time.isoformat()
    participants_list = list(set(booking.participants))

    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()

        #Проверка существования пользователей
        if participants_list:
            placeholders = ','.join(['?'] * len(participants_list))
            cursor.execute(f"SELECT username FROM users WHERE username IN ({placeholders})", participants_list)
            existing = {row[0] for row in cursor.fetchall()}
            missing = set(participants_list) - existing
            if missing:
                raise HTTPException(status_code=400, detail=f"Пользователи не найдены: {', '.join(missing)}")
        #Проверка времени
        cursor.execute("SELECT start_time, end_time FROM bookings WHERE room = ? AND booking_date = ?", (booking.room, b_date))
        for ex_start, ex_end in cursor.fetchall():
            if not (b_end <= ex_start or b_start >= ex_end):
                raise HTTPException(status_code=400, detail="Это время уже занято")

        participants_json = json.dumps(participants_list, ensure_ascii=False)
        booking_id = str(uuid.uuid4())
        cursor.execute(
            "INSERT INTO bookings (id, room, username, booking_date, start_time, end_time, participants) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (booking_id, booking.room, x_token, b_date, b_start, b_end, participants_json)
        )
        conn.commit()

    return {
        "id": booking_id,
        "room": booking.room,
        "username": x_token,
        "booking_date": booking.booking_date,
        "start_time": booking.start_time,
        "end_time": booking.end_time,
        "participants": participants_list
    }

@router.delete("/api/booking-rooms/{booking_id}")
def delete_booking(booking_id: str, x_token: str = Header(...)):
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT is_admin FROM users WHERE username = ?", (x_token,))
        user_row = cursor.fetchone()
        is_admin = user_row[0] if user_row else 0

        cursor.execute("SELECT username FROM bookings WHERE id = ?", (booking_id,))
        booking_row = cursor.fetchone()
        if not booking_row:
            raise HTTPException(status_code=404, detail="Бронь не найдена")

        if booking_row[0] != x_token and not is_admin:
            raise HTTPException(status_code=403, detail="Вы не можете удалить чужую бронь")

        cursor.execute("DELETE FROM bookings WHERE id = ?", (booking_id,))
        conn.commit()
    return {"message": "Бронь удалена"}