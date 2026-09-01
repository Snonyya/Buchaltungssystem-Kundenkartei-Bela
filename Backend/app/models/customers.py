from pydantic import BaseModel, Field
from datetime import datetime
from models.service import Service

# Modelle für customer erstellen

class CustomerNoteCreate(BaseModel):
    text: str

class NoteUpdate(BaseModel):
    note: str
    updated_at: datetime


class CustomerNote(BaseModel):
    text: str
    created_at: datetime

class CustomerCreate(BaseModel):
    first_name: str
    last_name: str
    street: str
    city: str
    postal_code: str
    notes: str | None = None
    service_type: Service | None = None
    phone: str | None = None
    email: str | None = None


class Customer(BaseModel):
        id: str
        customer_number: str
        first_name: str
        last_name: str
        street: str
        postal_code: str
        city: str
        email: str | None = None
        phone: str | None = None
        service_type: str | None = None
        notes: list[CustomerNote] = Field(default_factory=list)
        created_at: datetime
        updated_at: datetime
        is_active: bool = True


class CustomerUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    street: str | None = None
    city: str | None = None
    postal_code: str | None = None
    note: str | None = None
    service_type: str | None = None
    phone: str | None = None
    email: str | None = None