import sqlite3
from fastapi import APIRouter
from typing import List
from config import DB_FILE

router = APIRouter(tags=["Workspaces"])

@router.get("/api/workspaces", response_model=List[str])
def get_workspaces():
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM workspaces")
        return [row[0] for row in cursor.fetchall()]