from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, model_validator


class TaxationMode(str, Enum):
    STANDARD = "standard"
    SMALL_BUSINESS = "small_business"


class BusinessProfileInput(BaseModel):
    legal_name: str = Field(min_length=1)
    owner_name: str | None = None

    street: str = Field(min_length=1)
    postal_code: str = Field(min_length=1)
    city: str = Field(min_length=1)
    country: str = "Deutschland"

    phone: str | None = None
    email: str | None = None

    tax_number: str | None = None
    vat_id: str | None = None

    taxation_mode: TaxationMode
    vat_rate_percent: int | None = Field(default=None, ge=0, le=100)
    small_business_notice: str | None = None

    @model_validator(mode="after")
    def validate_taxation_mode(self):
        if (
            self.taxation_mode == TaxationMode.STANDARD
            and self.vat_rate_percent is None
        ):
            raise ValueError(
                "Bei regulärer Umsatzsteuer muss ein Steuersatz angegeben werden."
            )

        return self


class BusinessProfile(BusinessProfileInput):
    created_at: datetime
    updated_at: datetime