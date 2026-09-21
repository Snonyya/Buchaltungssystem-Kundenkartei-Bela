from bson import ObjectId
from fastapi import APIRouter, HTTPException, status
from pymongo import ReturnDocument
from app.database import database
from app.models.service import Service, ServiceCreate, ServiceUpdate
from app.services.audit_log import write_audit_log


router = APIRouter(
    prefix="/service",
    tags=["Service"],
)

def convert_service(document: dict) -> Service:
    return Service(
        id=str(document["_id"]),
        **{key: value for key, value in document.items() if key != "_id"},
    )



@router.get("", response_model=list[Service])
def list_services() -> list[Service]:
    documents = database.services.find(

        {
            "is_active": True
            }

    ).sort("service_name", 1)

    return [
        convert_service(document)
        for document in documents
    ]

    

@router.post("", response_model=Service, status_code = status.HTTP_201_CREATED)
def create_service(service: ServiceCreate) -> Service:

    service_data = service.model_dump(exclude_unset = True)

    service_data["is_active"] = True

    result = database.services.insert_one(service_data)

    write_audit_log(
        action="service.created",
        entity_type="service",
        entity_id=str(result.inserted_id),
        summary=f"Dienstleistung {service_data['service_name']} erstellt",
        details={
            "default_price_cents": service_data["default_price_cents"],
        },
    )

    return Service(
        id=str(result.inserted_id),
        **service_data
    )


@router.get("/archived", response_model=list[Service])
def list_archived_services() -> list[Service]:
    documents = database.services.find(
        {
            "is_active": False
            }
    ).sort("service_name", 1)

    return [
        convert_service(document)
        for document in documents
    ]



@router.get("/{service_id}", response_model=Service)
def getService(service_id) -> Service:

    if not ObjectId.is_valid(service_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service nicht gefunden")

    document = database.services.find_one(

        {
            "_id": ObjectId(service_id),
            "is_active": True,
        },
    )

    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service konnte nicht gefunden werden")

    return convert_service(document)




@router.patch("/{service_id}", response_model=Service)
def update_service(service_id, update_service: ServiceUpdate) -> Service:

    if not ObjectId.is_valid(service_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service nicht gefunden")

    update_data = update_service.model_dump(exclude_unset = True)

    if not update_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="keine Daten eingegeben")

    document = database.services.find_one_and_update(
        {
            "_id": ObjectId(service_id),
            "is_active": True,
         },
         {
             "$set": update_data,
         },
         return_document = ReturnDocument.AFTER
    )
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="keine Daten eingegeben")

    write_audit_log(
        action="service.updated",
        entity_type="service",
        entity_id=str(document["_id"]),
        summary=f"Dienstleistung {document['service_name']} bearbeitet",
        details={
            "changed_fields": list(update_data.keys()),
        },
    )

    return convert_service(document)



@router.delete("/{service_id}", response_model=Service)
def delete_service(service_id:str) -> Service:
    if not ObjectId.is_valid(service_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="service nicht gefunden")

    document = database.services.find_one_and_update(
        {
            "_id": ObjectId(service_id),
            "is_active": True,
        },
        {
            "$set": {"is_active": False},
        },
        return_document=ReturnDocument.AFTER
    )
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="service nicht gefunden")

    write_audit_log(
        action="service.archived",
        entity_type="service",
        entity_id=str(document["_id"]),
        summary=f"Dienstleistung {document['service_name']} archiviert",
    )

    return convert_service(document)


@router.patch("/{service_id}/restore", response_model=Service)
def restore_service(service_id: str) -> Service:
    if not ObjectId.is_valid(service_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service nicht gefunden")

    document = database.services.find_one_and_update(
        {
            "_id": ObjectId(service_id),
            "is_active": False,
        },
        {
            "$set": {
                "is_active": True,
            },
        },
        return_document=ReturnDocument.AFTER    
    )

    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="keinen Service gefunden oder nicht archiviert")


    write_audit_log(
        action="service.restored",
        entity_type="service",
        entity_id=str(document["_id"]),
        summary=f"Dienstleistung {document['service_name']} wiederhergestellt",

    )
    return convert_service(document)