from datetime import datetime, timezone
import re
from typing import Literal

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query, status
from pymongo import ReturnDocument

from app.database import database
from app.models.expense import (
    Expense,
    ExpenseCancel,
    ExpenseCreate,
    ExpenseStatus,
)
from app.models.transaction import PaymentMethod
from app.services.audit_log import write_audit_log


router = APIRouter(
    prefix="/expense",
    tags=["Expense"],
)


def convert_expenses(expense):
    return Expense(
        id=str(expense["_id"]),
        **{
            key: value
            for key, value in expense.items()
            if key != "_id"
        },
    )

@router.get("", response_model=list[Expense])
def list_all_expenses(
    start: datetime | None = None,
    end: datetime | None = None,
    payment_method: PaymentMethod | None = None,
    category: str | None = None,
    search: str | None = None,
    vendor: str | None = None,
    expense_status: Literal["booked", "cancelled", "all"] = Query(
        default= "all",
        alias="status"
    ),
    sort_by: Literal[
        "occurred_at",
        "created_at",
        "amount_cents",
        "category",
        "vendor",
    ] = "occurred_at",
    sort_direction: Literal["asc", "desc"] = "desc",
) -> list[Expense]:
    query: dict = {}

    if expense_status != "all":
        query["status"] = expense_status

    if start is not None or end is not None:
        query["occurred_at"] = {}

        if start is not None:
            query["occurred_at"]["$gte"] = start

        if end is not None:
            query["occurred_at"]["$lt"] = end

    if payment_method != None:
        query["payment_method"] = payment_method.value

    if category and category.strip():
        query["category"] = {
            "$regex": re.escape(category.strip()),
            "$options": "i"
        }

    if search and search.strip():
        search_text = re.escape(search.strip())
        query["$or"] = [
            {"category": {"$regex": search_text, "$options": "i"}},
            {"vendor": {"$regex": search_text, "$options": "i"}},
            {"receipt_reference": {"$regex": search_text, "$options": "i"}},
            {"note": {"$regex": search_text, "$options": "i"}},
        ]

    if vendor and vendor.strip():
        query["vendor"] = {
            "$regex": re.escape(vendor.strip()),
            "$options": "i"
        }

    sort_value = 1 if sort_direction == "asc" else -1

    documents = database.expenses.find(query).sort(
        sort_by,
        sort_value
    )

    return [
        convert_expenses(document)
        for document in documents
    ]

@router.post("", response_model=Expense, status_code=status.HTTP_201_CREATED)
def create_expense(expense: ExpenseCreate) -> Expense:
    now = datetime.now(timezone.utc)
    occurred_at = expense.occurred_at or now

    expense_data = expense.model_dump()

    expense_data["payment_method"] = expense.payment_method.value
    expense_data["occurred_at"] = occurred_at
    expense_data["created_at"] = now
    expense_data["status"] = ExpenseStatus.BOOKED.value

    result = database.expenses.insert_one(expense_data)

    expense_id = str(result.inserted_id)

    write_audit_log(
        action="expense.created",
        entity_type="expense",
        entity_id=expense_id,
        summary=f"Ausgabe in Kategorie {expense_data['category']} erstellt",
        details={
            "amount_cents": expense_data["amount_cents"],
            "payment_method": expense_data["payment_method"],
        },
    )

    return Expense(
        id=expense_id,
        **expense_data,
    )


@router.get("/{expense_id}", response_model=Expense)
def get_expense(expense_id: str) -> Expense:
    if not ObjectId.is_valid(expense_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ausgabe nicht gefunden")

    document = database.expenses.find_one(
        {
            "_id": ObjectId(expense_id),
        },
    )

    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ausgabe nicht gefunden")

    return (convert_expenses(document))

@router.patch("/{expense_id}/cancel", response_model=Expense)
def cancel_expense(expense_id: str, cancellation: ExpenseCancel) -> Expense:
    if not ObjectId.is_valid(expense_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ausgabe nicht gefunden")

    now = datetime.now(timezone.utc)

    document = database.expenses.find_one_and_update(
        {
            "_id": ObjectId(expense_id),
            "status": ExpenseStatus.BOOKED.value,
        },
        {
            "$set": {
                "status": ExpenseStatus.CANCELLED.value,
                "cancelled_at": now,
                "cancellation_reason": cancellation.reason,
            },
        },
        return_document = ReturnDocument.AFTER,
    )

    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ausgabe nicht gefunden oder bereits storniert")

    write_audit_log(
        action="expense.cancelled",
        entity_type="expense",
        entity_id=str(document["_id"]),
        summary=f"Ausgabe in Kategorie {document['category']} storniert",
        details={
            "amount_cents": document["amount_cents"],
            "cancellation_reason": document["cancellation_reason"],
        },
    )

    return convert_expenses(document)


