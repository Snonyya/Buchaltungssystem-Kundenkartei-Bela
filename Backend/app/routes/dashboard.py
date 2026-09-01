from datetime import datetime
from fastapi import APIRouter, HTTPException, status
from database import database
from models.dashboard import DashboardSummary

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

    pipeline = [
        {
            "$match": {
                "status": "booked",
                "occurred_at": {
                    "$gte": start,
                    "$lt": end,
                },
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

    results =  list(database.transaction.aggregate(pipeline))

# wenn es keine einträge für den eingegebenen zeitraum gibt, werden alle ausgaben auf null gesetzt
    if not results:
        return DashboardSummary(
            start=start,
            end=end,
            transaction_count=0,
            total_cents=0,
            cash_total_cents=0,
            online_total_cents=0,
            average_cents=0,
        )

    summary = results[0]

# falls es ausgaben gibt, werden die Ergebnisse hier in die classen attribute reingegeben
    return DashboardSummary(
        start=start,
        end=end,
        transaction_count=summary["transaction_count"],
        total_cents=summary["total_cents"],
        cash_total_cents=summary["cash_total_cents"],
        online_total_cents=summary["online_total_cents"],
        average_cents=summary["average_cents"],
        highest_transaction_cents=summary["highest_transaction_cents"],
        lowest_transaction_cents=summary["lowest_transaction_cents"],
    )   