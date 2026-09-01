from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, HTTPException, status

from database import database
from models.transaction import Transaction, TransactionCreate, PaymentMethod
from services.id_number_gen import get_next_receipt_number


router = APIRouter(
    prefix="/transaction",
    tags=["Transaction"]
)


def conver_transaction(single_transaction: dict) -> Transaction:
    return Transaction(
        id=str(single_transaction["_id"]),
        **{key: value for key, value in single_transaction.items() if key !="_id"},
    )


@router.get("", response_model= list[Transaction])
def list_all_transaction(customer_id: str | None = None, start: datetime | None = None, end: datetime | None = None, payment_method: PaymentMethod | None = None) -> list[Transaction]:
    query = {
        "status": "booked",
    }

    if customer_id is not None:
        query["customer_id"] = customer_id

    if start is not None or end is not None:
        query["occurred_at"] = {}

        if start is not None:
            query["occurred_at"]["$gte"] = start

        if end is not None:
            query["occurred_at"]["$lt"] = end

    if payment_method is not None:
        query["payment_method"] = payment_method.value

    documents = database.transactions.find(query).sort(
        "occurred_at",
        -1,
        )
    return [
        conver_transaction(document)
        for document in documents
    ]


@router.post("", response_model=Transaction, status_code=status.HTTP_201_CREATED)
def create_transaction(transaction: TransactionCreate) -> Transaction:
    if not ObjectId.is_valid(transaction.customer_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kunde nicht gefunden")

    customer = database.customers.find_one(
        {
            "_id": ObjectId(transaction.customer_id),
            "is_active": True,
        },
    )

    if customer is None:
        raise HTTPException (status_code=status.HTTP_404_NOT_FOUND, detail="Kunde nicht gefunden oder Archiviert")


    now = datetime.now(timezone.utc)
    occurred_at = transaction.occurred_at or now

    transaction_data = transaction.model_dump()
    transaction_data["occurred_at"] = occurred_at
    transaction_data["receipt_number"] = get_next_receipt_number(occurred_at)
    transaction_data["created_at"] = now
    transaction_data["status"] = "booked"

    result = database.transactions.insert_one(transaction_data)

    return Transaction(
        id=str(result.inserted_id),
        **transaction_data
    )


@router.get("/{transaction_id}", response_model=Transaction,)
def get_transaction(transaction_id: str) -> Transaction:
    if not ObjectId.is_valid(transaction_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kunde nicht gefunden")

    document = database.transactions.find_one(
        {
            "_id": ObjectId(transaction_id),
        }
    )

    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kunde nicht gefunden oder Archiviert")

    return conver_transaction(document)