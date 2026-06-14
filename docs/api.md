# API Documentation

## Общая информация

**Base URL:** `/api`

**Content-Type:** `application/json`

Для авторизованных запросов используется заголовок:

```http
X-Token: <username>
```

Токеном является имя пользователя, полученное при входе.

---

##  Аутентификация

### POST /api/login

#### Request Body
```json
{
  "username": "ivan",
  "password": "password123"
}
```

#### Response 200
```json
{
  "token": "ivan",
  "is_admin": false
}
```

#### Response 400
```json
{
  "detail": "Неверный логин или пароль"
}
```

---

##  Бронирование комнат

### GET /api/booking-rooms
Получить список всех бронирований.

#### Response 200
```json
[
  {
    "id": "e4eaaaf2-d142-11e1-b3e4-080027620cdd",
    "room": "Конференц-зал",
    "username": "ivan",
    "booking_date": "2026-06-14",
    "start_time": "14:00:00",
    "end_time": "15:30:00",
    "participants": ["alex", "maria"]
  }
]
```

---

### GET /api/booking-rooms/{room}
Получить все бронирования конкретной комнаты.

#### Path Parameters

| Поле | Тип |
| :--- | :--- |
| room | string |

#### Response 200
```json
[
  {
    "id": "e4eaaaf2-d142-11e1-b3e4-080027620cdd",
    "room": "Конференц-зал",
    "username": "ivan",
    "booking_date": "2026-06-14",
    "start_time": "14:00:00",
    "end_time": "15:30:00",
    "participants": ["alex", "maria"]
  }
]
```

---

### POST /api/booking-rooms
Создать новое бронирование комнаты.

#### Headers

| Поле | Значение |
| :--- | :--- |
| X-Token | ivan |

#### Request Body
```json
{
  "room": "Конференц-зал",
  "booking_date": "2026-06-14",
  "start_time": "14:00:00",
  "end_time": "15:30:00",
  "participants": ["alex", "maria"]
}
```

#### Response 200
```json
{
  "id": "e4eaaaf2-d142-11e1-b3e4-080027620cdd",
  "room": "Конференц-зал",
  "username": "ivan",
  "booking_date": "2026-06-14",
  "start_time": "14:00:00",
  "end_time": "15:30:00",
  "participants": ["alex", "maria"]
}
```

#### Response 400 (Если время окончания раньше или равно времени начала)
```json
{
  "detail": "Время окончания должно быть позже начала"
}
```

#### Response 400 (Если кого-то из участников нет в базе данных)
```json
{
  "detail": "Пользователи не найдены: maria"
}
```

#### Response 400 (Если выбранное время на эту дату уже забронировано)
```json
{
  "detail": "Это время уже занято"
}
```

---

### DELETE /api/booking-rooms/{booking_id}
Удалить существующее бронирование комнаты.

#### Headers

| Поле | Значение |
| :--- | :--- |
| X-Token | ivan |

#### Path Parameters

| Поле | Тип |
| :--- | :--- |
| booking_id | string |

#### Response 200
```json
{
  "message": "Бронь удалена"
}
```

#### Response 403 (Если обычный пользователь пытается удалить чужую бронь)
```json
{
  "detail": "Вы не можете удалить чужую бронь"
}
```

#### Response 404 (Если бронирования с таким ID вообще нет в базе данных)
```json
{
  "detail": "Бронь не найдена"
}
```
---

##  Бронирование рабочих мест

### GET /api/booking-workspace
Получить список всех бронирований рабочих мест.

#### Response 200
```json
[
  {
    "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "workspace": "Стол №5",
    "username": "ivan",
    "booking_date": "2026-06-14",
    "start_time": "09:00:00",
    "end_time": "18:00:00"
  }
]
```

---

### GET /api/booking-workspace/{workspace}
Получить все бронирования конкретного рабочего места.

#### Path Parameters

| Поле | Тип |
| :--- | :--- |
| workspace | string |

#### Response 200
```json
[
  {
    "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "workspace": "Стол №5",
    "username": "ivan",
    "booking_date": "2026-06-14",
    "start_time": "09:00:00",
    "end_time": "18:00:00"
  }
]
```

---

### POST /api/booking-workspace
Создать новое бронирование рабочего места.

#### Headers

| Поле | Значение |
| :--- | :--- |
| X-Token | ivan |

#### Request Body
```json
{
  "workspace": "Стол №5",
  "booking_date": "2026-06-14",
  "start_time": "09:00:00",
  "end_time": "18:00:00"
}
```

#### Response 200
```json
{
  "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "workspace": "Стол №5",
  "username": "ivan",
  "booking_date": "2026-06-14",
  "start_time": "09:00:00",
  "end_time": "18:00:00"
}
```

#### Response 400 (Если время окончания раньше или равно времени начала)
```json
{
  "detail": "Время окончания должно быть позже начала"
}
```

#### Response 400 (Если выбранное рабочее место на это время уже занято)
```json
{
  "detail": "Это время уже занято"
}
```

---

### DELETE /api/booking-workspace/{booking_id}
Удалить существующее бронирование рабочего места.

#### Headers

| Поле | Значение |
| :--- | :--- |
| X-Token | ivan |

#### Path Parameters

| Поле | Тип |
| :--- | :--- |
| booking_id | string |

#### Response 200
```json
{
  "message": "Бронь удалена"
}
```

#### Response 403 (Если обычный пользователь пытается удалить чужую бронь стола)
```json
{
  "detail": "Вы не можете удалить чужую бронь"
}
```

#### Response 404 (Если бронирования стола с таким ID нет в базе данных)
```json
{
  "detail": "Бронь не найдена"
}
```
---

##  Пользователи

### POST /api/users/add
Добавить нового пользователя в систему (доступно только администратору).

#### Headers

| Поле | Значение |
| :--- | :--- |
| X-Token | admin |

#### Request Body
```json
{
  "username": "new_user",
  "password": "securepassword123",
  "full_name": "Пётр Сидоров",
  "email": "sidovov@example.com"
}
```

#### Response 200
```json
{
  "message": "Пользователь new_user успешно зарегистрирован администратором"
}
```

#### Response 400 (Если пользователь с таким username уже есть в базе данных)
```json
{
  "detail": "Пользователь уже существует"
}
```

#### Response 403 (Если эндпоинт вызывает обычный пользователь, а не админ)
```json
{
  "detail": "Доступ запрещен. Только для администраторов"
}
```

---

### GET /api/users/{username}/bookings
Получить все бронирования комнат, в которых пользователь является создателем или участником.

#### Path Parameters

| Поле | Тип |
| :--- | :--- |
| username | string |

#### Response 200
```json
[
  {
    "id": "e4eaaaf2-d142-11e1-b3e4-080027620cdd",
    "room": "Конференц-зал",
    "username": "ivan",
    "booking_date": "2026-06-14",
    "start_time": "14:00:00",
    "end_time": "15:30:00",
    "participants": ["alex", "maria"]
  }
]
```

#### Response 404 (Если пользователя с таким username нет в системе)
```json
{
  "detail": "Пользователь не найден"
}
```

---

##  Справочники

### GET /api/workspaces
Получить список названий всех доступных рабочих мест.

#### Response 200
```json
[
  "Стол №1",
  "Стол №2",
  "Стол №5"
]
```

---

### GET /api/users
Получить список всех пользователей системы (кроме admin).

#### Response 200
```json
[
  {
    "username": "ivan",
    "full_name": "Иван Иванов",
    "email": "ivan@example.com"
  },
  {
    "username": "alex",
    "full_name": "Алексей Петров",
    "email": "alex@example.com"
  }
]
```

---

### GET /api/rooms
Получить список названий всех доступных комнат.

#### Response 200
```json
[
  "Конференц-зал",
  "Переговорная №1",
  "Лекторий"
]
```
