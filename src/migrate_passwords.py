import sqlite3
from config import DB_FILE
from security import hash_password


def is_bcrypt_hash(value: str) -> bool:
    return isinstance(value, str) and value.startswith(("$2a$", "$2b$", "$2y$"))


def migrate():
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT username, password FROM users")
        users = cursor.fetchall()

        updated = 0
        for username, password in users:
            if is_bcrypt_hash(password):
                continue
            new_hash = hash_password(password)
            cursor.execute(
                "UPDATE users SET password = ? WHERE username = ?",
                (new_hash, username),
            )
            updated += 1
            print(f"Пароль пользователя '{username}' захеширован")

        conn.commit()
        print(f"Готово. Обновлено паролей: {updated}")


if __name__ == "__main__":
    migrate()