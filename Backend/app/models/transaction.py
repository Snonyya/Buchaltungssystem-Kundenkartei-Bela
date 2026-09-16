from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field
from app.models.settings import BusinessProfileInput, TaxationMode

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
    customer_name: str | None = None
    customer_number: str | None = None
    business_profile_snapshot: BusinessProfileInput | None = None
    taxation_mode: TaxationMode | None = None
    vat_rate_percent: int | None = None
    net_amount_cents: int | None = None
    tax_amount_cents: int | None = None
    amount_cents: int = Field(gt=0)
    payment_method: PaymentMethod
    service_id: str
    service_name:str | None = None
    note: str | None = None
    occurred_at: datetime
    created_at: datetime
    status: str
    receipt_number: str
    cancelled_at: datetime | None = None
    cancellation_reason: str | None = None



class TransactionCancel(BaseModel):
    reason: str = Field(min_length=1)