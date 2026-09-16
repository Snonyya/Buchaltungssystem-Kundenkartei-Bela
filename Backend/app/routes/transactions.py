from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, status
from pymongo import ReturnDocument
from app.database import database
from app.models.transaction import Transaction, TransactionCreate, PaymentMethod, TransactionCancel
from app.services.id_number_gen import get_next_receipt_number
from typing import Literal
from fastapi import APIRouter, HTTPException, Query, status
import re
from typing import Literal
from app.models.settings import BusinessProfileInput, TaxationMode


router = APIRouter(
    prefix="/transaction",
    tags=["Transaction"]
)


def convert_transaction(single_transaction: dict) -> Transaction:
    return Transaction(
        id=str(single_transaction["_id"]),
        **{key: value for key, value in single_transaction.items() if key !="_id"},
    )


@router.get("", response_model= list[Transaction])
def list_all_transaction(customer_id: str | None = None, start: datetime | None = None, end: datetime | None = None, payment_method: PaymentMethod | None = None, service_id:str | None = None, search: str | None = None,
                         transaction_status: Literal["booked", "cancelled", "all"] = Query(
                             default="booked",
                             alias="status",
                         ), sort_by: Literal[
                             "occurred_at",
                             "amount_cents",
                             "receipt_number",
                             "customer_name",
                             "service_name",
                         ] = "occurred_at", sort_direction: Literal["asc", "desc"] = "desc",) -> list[Transaction]:
    query: dict = {}

    if  transaction_status !="all":
        query["status"] = transaction_status

    if service_id is not None:
        query["service_id"] = service_id

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

    if search and search.strip():
        search_text = re.escape(search.strip())

        query["$or"] = [
            {"receipt_number": {"$regex": search_text, "$options": "i"}},
            {"customer_name": {"$regex": search_text, "$options": "i"}},
            {"customer_number": {"$regex": search_text, "$options": "i"}},
            {"service_name": {"$regex": search_text, "$options": "i"}},
        ]
    sort_value = 1 if sort_direction == "asc" else -1

    documents = database.transactions.find(query).sort(
        sort_by,
        sort_value,
    )
    return [
        convert_transaction(document)
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


    if not ObjectId.is_valid(transaction.service_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dienstleistung nicht gefunden")


    service = database.services.find_one(
        {
            "_id": ObjectId(transaction.service_id),
            "is_active": True,
         }
    )

    if service is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service nicht gefunden")

    business_profile = database.business_settings.find_one(
        {
            "_id": "business_profile",
        },
    )

    if business_profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profil nicht gefunden, hinterlege ein Business Profil in den Einstellungen")

    business_profile_snapshot = BusinessProfileInput.model_validate(
        {
            key: value
            for key, value in business_profile.items()
            if key not in {"_id", "created_at", "updated_at"}
        }
    )
    
    occurred_at = transaction.occurred_at or now

    transaction_data = transaction.model_dump()

    transaction_data["customer_name"] = (f"{customer['first_name']} {customer['last_name']}")
    transaction_data["customer_number"] = customer["customer_number"]
    transaction_data["service_name"] = service["service_name"]
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Buchung nicht gefunden")

    document = database.transactions.find_one(
        {
            "_id": ObjectId(transaction_id),
        }
    )

    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Buchung nicht gefunden oder Archiviert")

    return convert_transaction(document)




@router.patch("/{transaction_id}/cancel", response_model=Transaction)
def cancel_transaction(transaction_id:str, cancellation:TransactionCancel) -> Transaction:
    if not ObjectId.is_valid(transaction_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaktion nicht gefunden")

    now = datetime.now(timezone.utc)

    document = database.transactions.find_one_and_update(
        {
            "_id": ObjectId(transaction_id),
            "status": "booked",
        },
        {
            "$set": 
            {
                "cancellation_reason": cancellation.reason,
                "cancelled_at": now,
                "status": "cancelled",
            }
        },
        return_document = ReturnDocument.AFTER
    )
    return convert_transaction(document)