from datetime import datetime
from pydantic import BaseModel


class ServiceCreate(BaseModel):
    service_name: str
    service_description: str
    default_price_cents: int | None = None


class Service(BaseModel):
    id: str
    service_name: str
    service_description: str
    default_price_cents: int | None = None
    is_active: bool


class ServiceUpdate(BaseModel):
    service_name: str | None = None
    service_description:str | None = None
    default_price_cents: int | None = None
