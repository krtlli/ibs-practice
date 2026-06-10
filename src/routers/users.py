import sqlite3
from fastapi import APIRouter
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