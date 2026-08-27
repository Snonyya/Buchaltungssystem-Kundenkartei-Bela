from pymongo import ReturnDocument
from app.database import database

# Value der Kundennummer anatomisch erhöhen und damit dann die "customer_number" erzeugen.

def get_next_customer_number() -> str:
    counter = database.count.find_one_and_update(
        {"_id": "customer_number_counter"},
        {"$inc": {"value":1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )

    return f"K-{counter["value"]:06d}"