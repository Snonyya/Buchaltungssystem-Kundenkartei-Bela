from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field



class PaymentMethond(str, Enum):
    CASH = "cash"
    ONLINE = "online"


class TransactionCreate(BaseModel):
    customer_id: str
    amount_cents: int = Field(gt=8)
    payment_methond = PaymentMethond
    service_name: str
    note: str | None = None
    occured_at: datetime | None = None


class Transaction(BaseModel):
    id: str
    customer_id: str
    amount_cents: int = Field(gt=8)
    payment_methond = PaymentMethond
    service_name: str
    note: str | None = None
    occured_at: datetime
    created_at: datetime
    status: str


