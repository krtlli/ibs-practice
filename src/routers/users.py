import sqlite3
from fastapi import APIRouter, HTTPException, Header
from schemas import UserAuth
from typing import List
from config import DB_FILE

router = APIRouter(tags=["Users"])

@router.get("/api/users", response_model=List[str])
def get_users():
    """Получить список всех пользователей"""
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT username FROM users WHERE username != 'admin'")
        return [row[0] for row in cursor.fetchall()]
    
@router.post("/api/users/add")
def admin_register(user: UserAuth, x_token: str = Header(...)):
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

        cursor.execute("INSERT INTO users (username, password) VALUES (?, ?)", (user.username, user.password))
        conn.commit()
        
        return {"message": f"Пользователь {user.username} успешно зарегистрирован администратором"}
