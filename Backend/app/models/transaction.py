from datetime import datetime
from enum import Enum
from models.service import Service

from pydantic import BaseModel, Field

# modell für die Transaktionen

class PaymentMethod(str, Enum):
    CASH = "cash"
    ONLINE = "online"


class TransactionCreate(BaseModel):
    customer_id: str
    amount_cents: int = Field(gt=0)
    payment_method: PaymentMethod
    service_id: str
    note: str | None = None
    occurred_at: datetime | None = None


class Transaction(BaseModel):
    id: str
    customer_id: str
    amount_cents: int = Field(gt=0)
    payment_method: PaymentMethod
    service_id: str
    note: str | None = None
    occurred_at: datetime
    created_at: datetime
    status: str
    receipt_number: str


