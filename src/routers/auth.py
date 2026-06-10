import sqlite3
from fastapi import APIRouter, HTTPException
from schemas import UserAuth
from config import DB_FILE

router = APIRouter(tags=["Authentication"])

# @router.post("/api/register")
# def register(user: UserAuth):
#     with sqlite3.connect(DB_FILE) as conn:
#         cursor = conn.cursor()
#         cursor.execute("SELECT 1 FROM users WHERE username = ?", (user.username,))
#         if cursor.fetchone():
#             raise HTTPException(status_code=400, detail="Пользователь уже существует")
#         cursor.execute("INSERT INTO users (username, password) VALUES (?, ?)", (user.username, user.password))
#         conn.commit()
#     return {"message": "Успешная регистрация"}

@router.post("/api/login")
def login(user: UserAuth):
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT password, is_admin FROM users WHERE username = ?", (user.username,))
        row = cursor.fetchone()
        if not row or row[0] != user.password:
            raise HTTPException(status_code=400, detail="Неверный логин или пароль")
        return {"token": user.username, "is_admin": bool(row[1])}