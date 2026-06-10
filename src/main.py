from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from db import init_db
from routers.auth import router as auth_router
from routers.rooms import router as rooms_router
from routers.bookings_rooms import router as rooms_bookings_router
from routers.workspaces import router as workspaces_router
from routers.bookings_workspaces import router as workspace_bookings_router
from routers.users import router as users_router

app = FastAPI(title="Сервис бронирования переговорных")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

app.include_router(auth_router)
app.include_router(rooms_router)
app.include_router(rooms_bookings_router)
app.include_router(users_router)
app.include_router(workspaces_router)
app.include_router(workspace_bookings_router)

# Монтирование фронтенда
app.mount("/", StaticFiles(directory="../frontend/", html=True), name="frontend")