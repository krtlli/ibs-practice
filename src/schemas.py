from pydantic import BaseModel
from datetime import date, time

class UserAuth(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    email: str

class UserResponse(BaseModel):
    username: str
    full_name: str | None = None
    email: str | None = None

class BookingCreate(BaseModel):
    room: str
    booking_date: date
    start_time: time
    end_time: time
    participants: list[str] = []

class BookingResponse(BaseModel):
    id: str
    room: str
    username: str
    booking_date: date
    start_time: time
    end_time: time
    participants: list[str]

class WorkspaceBookingCreate(BaseModel):
    workspace: str
    booking_date: date
    start_time: time
    end_time: time

class WorkspaceBookingResponse(BaseModel):
    id: str
    workspace: str
    username: str
    booking_date: date
    start_time: time
    end_time: time
