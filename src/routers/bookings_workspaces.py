import sqlite3
import uuid
from datetime import date, time
from fastapi import APIRouter, HTTPException, Header
from typing import List
from schemas import WorkspaceBookingCreate, WorkspaceBookingResponse
from config import DB_FILE

router = APIRouter(tags=["WorkspaceBookings"])

@router.get("/api/booking-workspace/{workspace}", response_model=List[WorkspaceBookingResponse])
def get_workspace_bookings(workspace: str):
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, workspace, username, booking_date, start_time, end_time FROM workspace_bookings WHERE workspace = ?", (workspace,))
        rows = cursor.fetchall()
        return [{
            "id": r[0], "workspace": r[1], "username": r[2],
            "booking_date": date.fromisoformat(r[3]),
            "start_time": time.fromisoformat(r[4]),
            "end_time": time.fromisoformat(r[5])
        } for r in rows]

@router.post("/api/booking-workspace", response_model=WorkspaceBookingResponse)
def create_workspace_booking(booking: WorkspaceBookingCreate, x_token: str = Header(...)):
    if booking.start_time >= booking.end_time:
        raise HTTPException(status_code=400, detail="Время окончания должно быть позже начала")

    b_date = booking.booking_date.isoformat()
    b_start = booking.start_time.isoformat()
    b_end = booking.end_time.isoformat()

    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT start_time, end_time FROM workspace_bookings WHERE workspace = ? AND booking_date = ?",
            (booking.workspace, b_date)
        )
        for ex_start, ex_end in cursor.fetchall():
            if not (b_end <= ex_start or b_start >= ex_end):
                raise HTTPException(status_code=400, detail="Это время уже занято")
        
        booking_id = str(uuid.uuid4())
        cursor.execute(
            "INSERT INTO workspace_bookings VALUES (?, ?, ?, ?, ?, ?)",
            (booking_id, booking.workspace, x_token, b_date, b_start, b_end)
        )
        conn.commit()

    return {
        "id": booking_id,
        "workspace": booking.workspace,
        "username": x_token,
        "booking_date": booking.booking_date,
        "start_time": booking.start_time,
        "end_time": booking.end_time
    }

@router.delete("/api/booking-workspace/{booking_id}")
def delete_workspace_booking(booking_id: str, x_token: str = Header(...)):
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT is_admin FROM users WHERE username = ?", (x_token,))
        user_row = cursor.fetchone()
        is_admin = user_row[0] if user_row else 0

        cursor.execute("SELECT username FROM workspace_bookings WHERE id = ?", (booking_id,))
        booking_row = cursor.fetchone()
        if not booking_row:
            raise HTTPException(status_code=404, detail="Бронь не найдена")

        if booking_row[0] != x_token and not is_admin:
            raise HTTPException(status_code=403, detail="Вы не можете удалить чужую бронь")

        cursor.execute("DELETE FROM workspace_bookings WHERE id = ?", (booking_id,))
        conn.commit()
    return {"message": "Бронь удалена"}