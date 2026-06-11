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

## Аутентификация

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

## Бронирование комнат

### GET /api/booking-rooms/{room}

Получить все бронирования комнаты.

#### Path Parameters

| Поле | Тип |
|--------|--------|
| room | string |

#### Response 200

```json
[
  {
    "id": "e4eaaaf2-d142-11e1-b3e4-080027620cdd",
    "room": "Конференц-зал",
    "username": "ivan",
    "booking_date": "2026-06-10",
    "start_time": "14:00:00",
    "end_time": "15:30:00",
    "participants": ["alex", "maria"]
  }
]
```

### POST /api/booking-rooms

#### Headers

```http
X-Token: ivan
```

#### Request Body

```json
{
  "room": "Конференц-зал",
  "booking_date": "2026-06-10",
  "start_time": "14:00:00",
  "end_time": "15:30:00",
  "participants": ["alex", "maria"]
}
```

#### Response 200

```json
{
  "id": "uuid",
  "room": "Конференц-зал",
  "username": "ivan",
  "booking_date": "2026-06-10",
  "start_time": "14:00:00",
  "end_time": "15:30:00",
  "participants": ["alex", "maria"]
}
```

#### Response 400

```json
{
  "detail": "Время окончания должно быть позже начала"
}
```

```json
{
  "detail": "Это время уже занято"
}
```

```json
{
  "detail": "Пользователи не найдены: alex, maria"
}
```

### DELETE /api/booking-rooms/{booking_id}

#### Headers

```http
X-Token: ivan
```

#### Response 200

```json
{
  "message": "Бронь удалена"
}
```

#### Response 403

```json
{
  "detail": "Вы не можете удалить чужую бронь"
}
```

#### Response 404

```json
{
  "detail": "Бронь не найдена"
}
```

---

## Бронирование рабочих мест

### GET /api/booking-workspace/{workspace}

#### Path Parameters

| Поле | Тип |
|--------|--------|
| workspace | string |

#### Response 200

```json
[
  {
    "id": "uuid",
    "workspace": "Стол 1",
    "username": "ivan",
    "booking_date": "2026-06-10",
    "start_time": "14:00:00",
    "end_time": "15:30:00"
  }
]
```

### POST /api/booking-workspace

#### Headers

```http
X-Token: ivan
```

#### Request Body

```json
{
  "workspace": "Стол 1",
  "booking_date": "2026-06-10",
  "start_time": "14:00:00",
  "end_time": "15:30:00"
}
```

#### Response 200

```json
{
  "id": "uuid",
  "workspace": "Стол 1",
  "username": "ivan",
  "booking_date": "2026-06-10",
  "start_time": "14:00:00",
  "end_time": "15:30:00"
}
```

#### Response 400

```json
{
  "detail": "Время окончания должно быть позже начала"
}
```

```json
{
  "detail": "Это время уже занято"
}
```

### DELETE /api/booking-workspace/{booking_id}

#### Headers

```http
X-Token: ivan
```

#### Response 200

```json
{
  "message": "Бронь удалена"
}
```

#### Response 403

```json
{
  "detail": "Вы не можете удалить чужую бронь"
}
```

#### Response 404

```json
{
  "detail": "Бронь не найдена"
}
```

---

## Справочники

### GET /api/rooms

```json
["Конференц-зал", "Переговорная 1"]
```

### GET /api/workspaces

```json
["Стол 1", "Стол 2"]
```

### GET /api/users

```json
["ivan", "alex", "maria"]
```

---

## Пользователи

### POST /api/users/add

Создание пользователя администратором.

#### Headers

```http
X-Token: admin
```

#### Request Body

```json
{
  "username": "new_user",
  "password": "password123"
}
```

#### Response 200

```json
{
  "message": "Пользователь new_user успешно зарегистрирован администратором"
}
```

#### Response 400

```json
{
  "detail": "Пользователь уже существует"
}
```

#### Response 403

```json
{
  "detail": "Доступ запрещен. Только для администраторов"
}
```

### GET /api/users/{username}/bookings

#### Path Parameters

| Поле     | Тип    |
|----------|--------|
| username | string |

#### Response 200

```json
[
  {
    "id": "uuid",
    "room": "Конференц-зал",
    "username": "ivan",
    "booking_date": "2026-06-11",
    "start_time": "10:00:00",
    "end_time": "11:00:00",
    "participants": ["alex"]
  }
]
```

#### Response 404

```json
{
  "detail": "Пользователь не найден"
}
```
