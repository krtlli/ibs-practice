# Документация проекта

## Инструменты/Стек

### Git

Система управления версиями

[Документация](https://git-scm.com/)  
[Краткий гайд](https://youtu.be/EeARyFrZsnU?si=un0IXEK_3TLu_toN)

### Python

Фреймворк: FastAPI

[Документация](https://fastapi.tiangolo.com/)

вспомогательные инструменты: [uv](https://docs.astral.sh/uv/)  
Нужен для удобства автоматической работы с зависимостями и .venv

Бибоиотеки/Зависимости:
- fastapi
- uvicorn

[Документация](https://caddyserver.com/docs/)

## Модули

- [Фронтенд](./frontend.md)

- [Бэкенд](./backend.md)

- [API](./api.md)

## Запуск

### API

Установите [uv](https://docs.astral.sh/uv/)

запустите командой:
``` bash
uv run src/main
```