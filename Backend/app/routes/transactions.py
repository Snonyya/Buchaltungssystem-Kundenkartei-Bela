from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, HTTPException, status

from app.database import database
from app.models.transaction import Transaction, TransactionCreate
from app.services.id_number_gen import get_next_receipt_number


router = APIRouter(
    prefix="/transaction",
    tags=["Transaction"]
)


@router.post("", response_model=Transaction, status_code=status.HTTP_201_CREATED)
def create_transaction(transaction: TransactionCreate) -> Transaction:
    if not ObjectId.is_valid:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kunde nicht gefunden")

    customer = database.customer.find_one(
        {
            "_id": ObjectId(transaction.customer_id),
            "is_active": True,
        },
    )

    if customer is None:
        raise HTTPException (status_code=status.HTTP_404_NOT_FOUND, detail="Kunde nicht gefunden oder Archiviert")


    now = datetime.now(timezone.utc)
    occurred_at = transaction.occured_at or now

    transaction_data = transaction.model_dump()
    transaction_data["occurred_at"] = occurred_at
    transaction_data["receipt_number"] = get_next_receipt_number(occurred_at)
    transaction_data["created_at"] = now
    transaction_data["status"] = "booked"

    result = database.transaction.insert_one

    return Transaction(
        id=str(result.inserted_id),
        **transaction_data
    )