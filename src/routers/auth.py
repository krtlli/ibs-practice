import sqlite3
from fastapi import APIRouter, HTTPException
from schemas import UserAuth
from config import DB_FILE
from security import verify_password

router = APIRouter(tags=["Authentication"])

@router.post("/api/login")
def login(user: UserAuth):
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT password, is_admin FROM users WHERE username = ?", (user.username,))
        row = cursor.fetchone()
        if not row or not verify_password(user.password, row[0]):
            raise HTTPException(status_code=400, detail="Неверный логин или пароль")
        return {"token": user.username, "is_admin": bool(row[1])}