from datetime import datetime
from fastapi import APIRouter, HTTPException, status
from app.database import database
from app.models.dashboard import DashboardSummary

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)

# zusammenrechnung der Einträge in "Transaktionen"
# alle passenden einträge werden zusammengezählt und dann werden berechnungen ausgeführt mit speziellen Mongo codes. die pipeline wird dann in results als liste gespeichert mit einer stelle (0)

@router.get("", response_model=DashboardSummary)
def get_dashboard_summary(start: datetime, end: datetime) -> DashboardSummary:
    if end <= start:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Das Enddatum liegt vor dem Startdatum")


    date_filter = {
        "occurred_at": {
            "$gte": start,
            "$lt":end,
        },
    }
    
    income_pipeline = [
        {
            "$match": {
                "status": "booked",
                   **date_filter
            }
        },
        {
            "$group": {
                "_id": None,
                "transaction_count": {"$sum": 1},
                "total_cents": {"$sum": "$amount_cents"},
                "cash_total_cents": {
                    "$sum": {
                        "$cond": [
                            {"$eq": ["$payment_method", "cash"]},
                            "$amount_cents",
                            0,
                        ]
                    }
                },
                "online_total_cents": {
                    "$sum": {
                        "$cond": [
                            {"$eq": ["$payment_method", "online"]},
                            "$amount_cents",
                            0,
                        ]
                    }
                },
                "average_cents": {"$avg": "$amount_cents"},
                "highest_transaction_cents": {"$max": "$amount_cents"},
                "lowest_transaction_cents": {"$min": "$amount_cents"},
            }
        },
    ]

    expense_pipeline = [
        {
            "$match": {
                "status": "booked",
                **date_filter,
            }
        },
        {
            "$group": {
                "_id": None,
                "expense_count": {"$sum": 1},
                "expense_total_cents": {"$sum": "$amount_cents"},
                "expense_cash_total_cents": {
                    "$sum": {
                        "$cond": [
                            {"$eq": ["$payment_method", "cash"]},
                            "$amount_cents",
                            0,
                        ]
                    }
                },
                "expense_online_total_cents": {
                    "$sum": {
                        "$cond": [
                            {"$eq": ["$payment_method", "online"]},
                            "$amount_cents",
                            0,
                        ]
                    }
                },
            }
        },
    ]

    income_results =  list(database.transactions.aggregate(income_pipeline))
    expense_results = list(database.expenses.aggregate(expense_pipeline))

    income_summary = income_results[0] if income_results else {}
    expense_summary = expense_results[0] if expense_results else {}

    total_cents = income_summary.get("total_cents", 0)
    expense_total_cents = expense_summary.get("expense_total_cents", 0)
    
# falls es ausgaben gibt, werden die Ergebnisse hier in die classen attribute reingegeben
    return DashboardSummary(
        start=start,
        end=end,

        transaction_count=income_summary.get("transaction_count", 0),
        total_cents=total_cents,
        cash_total_cents=income_summary.get("cash_total_cents", 0),
        online_total_cents=income_summary.get("online_total_cents", 0),
        average_cents=income_summary.get("average_cents", 0),
        highest_transaction_cents=income_summary.get(
            "highest_transaction_cents",
        ),
        lowest_transaction_cents=income_summary.get(
            "lowest_transaction_cents",
        ),

        expense_count=expense_summary.get("expense_count", 0),
        expense_total_cents=expense_total_cents,
        expense_cash_total_cents=expense_summary.get(
            "expense_cash_total_cents",
            0,
        ),
        expense_online_total_cents=expense_summary.get(
            "expense_online_total_cents",
            0,
        ),

        profit_loss_cents=total_cents - expense_total_cents,
    ) 