# API Documentation

## Общая информация

Базовый префикс API: `/api`

Формат обмена данными: `application/json`

---

## Аутентификация

### Login

**Endpoint:** `POST /api/login`

#### Успешный ответ (`200 OK`)

```json
{
  "token": "username",
  "is_admin": false
}
```

#### Ошибка (`400 Bad Request`)

```json
{
  "detail": "Неверный логин или пароль"
}
```

---

## Бронирование комнат

### Получить бронирования комнаты

**Endpoint:** `GET /api/booking-rooms/{room}`

#### Path Parameters

| Параметр | Тип | Описание |
|-----------|------|----------|
| room | string | Название или идентификатор комнаты |

#### Успешный ответ (`200 OK`)

```json
[
  {
    "id": 1,
    "room": "Конференц-зал",
    "username": "ivan",
    "booking_date": "2026-06-10",
    "start_time": "14:00:00",
    "end_time": "15:30:00",
    "participants": ["user1", "user2"]
  }
]
```

Пустой результат:

```json
[]
```

### Создать бронирование комнаты

**Endpoint:** `POST /api/booking-rooms`

#### Успешный ответ

```json
{
  "id": "uuid",
  "room": "Конференц-зал",
  "username": "ivan",
  "booking_date": "2026-06-10",
  "start_time": "14:00:00",
  "end_time": "15:30:00",
  "participants": ["user1", "user2"]
}
```

#### Возможные ошибки

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
  "detail": "Пользователи не найдены: имя1, имя2"
}
```

### Удалить бронирование комнаты

**Endpoint:** `DELETE /api/booking-rooms/{booking_id}`

#### Успешный ответ

```json
{
  "message": "Бронь удалена"
}
```

#### Возможные ошибки

```json
{
  "detail": "Бронь не найдена"
}
```

```json
{
  "detail": "Вы не можете удалить чужую бронь"
}
```

---

## Бронирование рабочих мест

### Получить бронирования рабочего места

**Endpoint:** `GET /api/booking-workspace/{workspace}`

#### Успешный ответ

```json
[
  {
    "id": 1,
    "workspace": "Стол 1",
    "username": "ivan",
    "booking_date": "2026-06-10",
    "start_time": "14:00:00",
    "end_time": "15:30:00"
  }
]
```

Пустой результат:

```json
[]
```

### Создать бронирование рабочего места

**Endpoint:** `POST /api/booking-workspace`

#### Успешный ответ

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

#### Возможные ошибки

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

### Удалить бронирование рабочего места

**Endpoint:** `DELETE /api/booking-workspace/{booking_id}`

#### Успешный ответ

```json
{
  "message": "Бронь удалена"
}
```

#### Возможные ошибки

```json
{
  "detail": "Бронь не найдена"
}
```

```json
{
  "detail": "Вы не можете удалить чужую бронь"
}
```

---

## Справочники

### Получить список комнат

**Endpoint:** `GET /api/rooms`

```json
[
  "Конференц-зал",
  "Переговорная 1"
]
```

### Получить список рабочих мест

**Endpoint:** `GET /api/workspaces`

```json
[
  "Стол 1",
  "Стол 2"
]
```

### Получить список пользователей

**Endpoint:** `GET /api/users`

```json
[
  "ivan_ivanov",
  "alex",
  "maria_p"
]
```

---

## Пользователи

### Регистрация пользователя администратором

**Endpoint:** `POST /api/users/add`

#### Успешный ответ

```json
{
  "message": "Пользователь username успешно зарегистрирован администратором"
}
```

#### Возможные ошибки

```json
{
  "detail": "Доступ запрещен. Только для администраторов"
}
```

```json
{
  "detail": "Пользователь уже существует"
}
```

### Получить бронирования пользователя

**Endpoint:** `GET /api/users/{username}/bookings`

#### Успешный ответ

```json
[
  {
    "id": 1,
    "room": "Конференц-зал",
    "username": "ivan",
    "booking_date": "2026-06-11",
    "start_time": "10:00:00",
    "end_time": "11:00:00",
    "participants": ["user2", "user3"]
  }
]
```

#### Ошибка

```json
{
  "detail": "Пользователь не найден"
}
```
