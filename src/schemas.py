from pydantic import BaseModel
from datetime import date, time

class UserAuth(BaseModel):
    username: str
    password: str

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