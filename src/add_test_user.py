import sqlite3
from config import DB_FILE
from security import hash_password

USERNAME = "test_user"
PASSWORD = "test12345"
FULL_NAME = "Test User"
EMAIL = "test_user@example.com"


def main():
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT 1 FROM users WHERE username = ?", (USERNAME,))
        if cursor.fetchone():
            print(f"Пользователь '{USERNAME}' уже существует, ничего не делаю.")
            return

        hashed = hash_password(PASSWORD)
        cursor.execute(
            "INSERT INTO users (username, password, is_admin, full_name, email) VALUES (?, ?, ?, ?, ?)",
            (USERNAME, hashed, 0, FULL_NAME, EMAIL),
        )
        conn.commit()

        print(f"Пользователь '{USERNAME}' добавлен.")
        print(f"Пароль (для входа):  {PASSWORD}")
        print(f"Хеш в БД:            {hashed}")


if __name__ == "__main__":
    main()