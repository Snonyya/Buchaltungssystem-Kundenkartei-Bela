from datetime import datetime, timezone
from fastapi import APIRouter, status, HTTPException
from app.database import database
from app.models.customers import Customer, CustomerCreate, CustomerUpdate, CustomerNoteCreate
from app.services.id_number_gen import get_next_customer_number
from bson import ObjectId
from pymongo import ReturnDocument


# Route festlegen
router = APIRouter(
    prefix="/customers",
    tags=["Customers"],
)

# Die aus MongoDB mitgelieferte _id in id verwandeln, damit das Frontend damit arbeiten kann
def convert_customer(single_customer: dict) -> Customer:
    return Customer(
        id=str(single_customer["_id"]),
        **{key: value for key, value in single_customer.items() if key != "_id"},
    )

# Neuen Customer nehmen und die restlichen Daten angeben -> dann in die Datenbank pushen. Respons ans Frontend muss "Customer" entsprechen
@router.post("", response_model=Customer, status_code=status.HTTP_201_CREATED)
def create_customer(customer: CustomerCreate) -> Customer:
    now = datetime.now(timezone.utc)

    customer_data = customer.model_dump()

    customer_data["customer_number"] = get_next_customer_number()
    customer_data["notes"] = []
    customer_data["created_at"] = now
    customer_data["updated_at"] = now
    customer_data["is_active"] = True

    result = database.customers.insert_one(customer_data)

    return Customer(
        id=str(result.inserted_id),
        **customer_data,
    )

# sucht alle aktiven Kunden ("is_active": True), sortiert die nach dem Nachnamen und fügt die in ein einheitliches Format für das Frontend zusammen
@router.get("", response_model=list[Customer])
def list_customers() -> list[Customer]:
    documents = database.customers.find({"is_active": True}).sort("last_name", 1)

    return [
        convert_customer(document)
        for document in documents
    ] 

# suche alle archivierten Kunden --> muss vor dem router.get("/{customer_id}") stehen, da sonst fastApi das archived als customer_id verstehen könnte
@router.get("/archived", response_model=list[Customer])
def list_archived_customers() -> list[Customer]:
    documents = database.customers.find(
        {"is_active": False}
    ).sort("updated_at", -1)

    return [
        convert_customer(document)
        for document in documents
    ]


# bekommt die customer_id über die url-Anfrage (get "/{customer_id}") sucht dann nacht dem customer falls der kunde Leer ist oder nicht existiert fehler, falls da customer für das Frontend zusammenbauen
@router.get("/{customer_id}", response_model=Customer)
def get_customer(customer_id: str) -> Customer:
    if not ObjectId.is_valid(customer_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kunde nicht gefunden",
        )

    document = database.customers.find_one(
        {
            "_id": ObjectId(customer_id),
            "is_active": True,
        }
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kunde nicht gefunden",
        )

    return convert_customer(document)



@router.patch("/{customer_id}", response_model=Customer)
def update_customer(customer_id: str, customer_update: CustomerUpdate,) -> Customer:
    if not ObjectId.is_valid(customer_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kunde nicht gefunden")
    
    update_data = customer_update.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="keine Daten zum aktualisieren übergeben")

    update_data["updated_at"] = datetime.now(timezone.utc)

    document = database.customers.find_one_and_update(
        {
            "_id":ObjectId(customer_id),
            "is_active":True,
        },
        {
            "$set":update_data,
        },
        return_document = ReturnDocument.AFTER,
    )

    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kein Kunde gefunden")

    return convert_customer(document)



# Kunde "löschen" nicht richtig nur archivieren, mit is_active = False, der Kunde ist noch in der Datenbank, aber wird nicht mehr angezeigt
@router.delete("/{customer_id}", response_model=Customer)
def archive_customer(customer_id: str) -> Customer:
    if not ObjectId.is_valid(customer_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kunde nicht gefunden",)

    document = database.customers.find_one_and_update(
        {
            "_id":ObjectId(customer_id),
            "is_active":True,
        },
        {
            "$set": {"is_active":False},
            "updated_at": datetime.now(timezone.utc),
        },
        return_document=ReturnDocument.AFTER
    )

    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kunde nicht gefunden oder bereits Archiviert")

    return convert_customer(document)


# archivierter Kunde wird wieder reaktiviert, in dem is_active=True
@router.patch("/{customer_id}/restore", response_model=Customer)
def set_customer_active(customer_id: str) -> Customer:
    if not ObjectId.is_valid(customer_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ungültige Kunden-id")

    document = database.customers.find_one_and_update(
               {
                    "_id":ObjectId(customer_id),
                    "is_active":False,
                },
                {
                    "$set": 
                    {
                        "is_active":True, 
                        "updated_at": datetime.now(timezone.utc),
                    }
                },
                return_document=ReturnDocument.AFTER
    )

    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kunde nicht gefunden oder nicht archiviert")

    return convert_customer(document)



@router.post("/{customer_id}/notes", response_model=Customer)
def add_customer_note(customer_id: str, note: CustomerNoteCreate,) -> Customer:
    if not ObjectId.is_valid(customer_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kunde nicht gefunden",
        )

    now = datetime.now(timezone.utc)

    document = database.customers.find_one_and_update(
        {
            "_id": ObjectId(customer_id),
            "is_active": True,
        },
        {
            "$push": {
                "notes": {
                    "text": note.text,
                    "created_at": now,
                }
            },
            "$set": {
                "updated_at": now,
            },
        },
        return_document=ReturnDocument.AFTER,
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kunde nicht gefunden oder archiviert",
        )

    return convert_customer(document)


    