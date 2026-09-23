from datetime import datetime
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field

from app.models.transaction import PaymentMethod

class ExpenseStatus(str, Enum):
    BOOKED = "booked"
    CANCELLED = "cancelled"


class ExpenseCreate(BaseModel):
    amount_cents: int = Field(gt = 0)
    payment_method: PaymentMethod
    category: str = Field(min_length=1, max_length=100)
    vendor: str | None = Field(default=None, max_length=200)
    note: str | None = Field(default=None, max_length=2_000)
    receipt_reference: str | None = Field(default=None, max_length=100)
    occurred_at: datetime | None = None


class Expense(BaseModel):
    id: str
    amount_cents: int = Field(gt = 0)
    payment_method : PaymentMethod
    category: str
    vendor: str | None = None
    note: str | None = None
    receipt_reference: str | None = None
    occurred_at: datetime
    created_at: datetime
    status: ExpenseStatus
    cancelled_at: datetime | None = None
    cancellation_reason: str | None = None


class ExpenseCancel(BaseModel):
    reason: str = Field(min_length=1, max_length=500)