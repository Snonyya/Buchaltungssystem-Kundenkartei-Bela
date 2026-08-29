from pymongo import ReturnDocument
from app.database import database
from datetime import datetime

# Value der Kundennummer atomar erhöhen und damit dann die "customer_number" erzeugen.

def get_next_customer_number() -> str:
    counter = database.counters.find_one_and_update(
        {"_id": "customer_number_counter"},
        {"$inc": {"value":1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )

    return f"K-{counter['value']:06d}"


def get_next_receipt_number(occured_at: datetime) -> str:
    year = occured_at.year
    counter = database.counters.find_one_and_update(
        {
            "_id": f"receipt_number_{year}",
        },
        {
            "$inc": {"value": 1},
        },
        upsert = True,
        return_document=ReturnDocument.AFTER,
    )
    return f"BEL-{year}-{counter['value']:06d}"
