from datetime import datetime, timezone
from fastapi import APIRouter, status
from app.database import database
from app.models.customers import Customer, CustomerCreate


# Route festlegen
router = APIRouter(
    prefix="/customers",
    tags=["Customers"],
)

# Neuen Customer nehmen und die restlichen Daten angeben -> dann in die Datenbank pushen. Respons ans Frontend muss "Customer" entsprechen
@router.post("", response_model=Customer, status_code=status.HTTP_201_CREATED)
def create_customer(customer: CustomerCreate) -> Customer:
    now = datetime.now(timezone.utc)

    customer_data = customer.model_dump()

    customer_data["customer_number"] = "K-000001"
    customer_data["notes"] = []
    customer_data["created_at"] = now
    customer_data["updated_at"] = now
    customer_data["is_active"] = True

    result = database.customers.insert_one(customer_data)

    return Customer(
        id=str(result.inserted_id),
        **customer_data,
    )