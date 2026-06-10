import sqlite3
from config import DB_FILE

def init_db():
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        #Пользователи
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                username TEXT PRIMARY KEY,
                password TEXT,
                is_admin INTEGER DEFAULT 0
            )
        """)
        #Админ
        cursor.execute("INSERT OR IGNORE INTO users (username, password, is_admin) VALUES (?, ?, ?)", ("admin", "admin", 1))
        #Переговорные
        cursor.execute("CREATE TABLE IF NOT EXISTS rooms (name TEXT PRIMARY KEY)")
        for room in ["Переговорная 1", "Переговорная 2", "Переговорная 3"]:
            cursor.execute("INSERT OR IGNORE INTO rooms (name) VALUES (?)", (room,))
        cursor.execute("CREATE TABLE IF NOT EXISTS workspaces (name TEXT PRIMARY KEY)")
        for workspace in ["Комп 1", "Комп 2", "Комп 3"]:
            cursor.execute("INSERT OR IGNORE INTO workspaces (name) VALUES (?)", (workspace,))
        conn.commit()
        #Брони переговорных
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS bookings (
                id TEXT PRIMARY KEY,
                room TEXT,
                username TEXT,
                booking_date TEXT,
                start_time TEXT,
                end_time TEXT,
                participants TEXT DEFAULT '[]'
            )
        """)

        #Брони рабочих мест
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS workspace_bookings (
                id TEXT PRIMARY KEY,
                workspace TEXT,
                username TEXT,
                booking_date TEXT,
                start_time TEXT,
                end_time TEXT
            )
        """)