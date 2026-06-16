import os
import uvicorn
from pathlib import Path
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

CURRENT_FILE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = (CURRENT_FILE_DIR / "../frontend/").resolve()
# Монтирование фронтенда
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")


current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)

cert_path = os.path.join(project_root, "cert/server.crt")
key_path = os.path.join(project_root, "cert/server.key")

uvicorn.run(
    "main:app",
    host="127.0.0.1",
    port=8000,
    app_dir=current_dir,
    reload=False,
    # ssl_certfile=cert_path if os.path.exists(cert_path) else None,
    # ssl_keyfile=key_path if os.path.exists(key_path) else None
)