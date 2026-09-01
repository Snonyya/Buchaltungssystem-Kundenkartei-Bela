from datetime import datetime, timezone
from fastapi import APIRouter, status, HTTPException
from database import database
from models.service import Service, ServiceCreate, ServiceUpdate
from bson import ObjectId
from pymongo import ReturnDocument


router = APIRouter(
    prefix="/service",
    tags=["Service"],
)

def conver_service(single_service: dict) -> Service:
    return Service(
        id=str(single_service["_id"]),
        **{key: value for key, value in single_service.items() if key !="_id"},
    )


@router.get("", response_model=Service)
def get_all_services() -> list[Service]:
    query = [
        {
            "is_active": True
        }
    ]

    document = database.services.find(query).sort("service_name", 1)

    return conver_service(document)

    

@router.post("", response_model=Service, status_code = status.HTTP_201_CREATED)
def create_service(service: ServiceCreate) -> Service:

    service_data = service.model_dump()

    service_data["is_active"] = True

    result = database.services.insert_one(service_data)

    return Service(
        id=str(result.inserted_id),
        **service_data
    )


@router.patch("/{service_id}", response_model=Service)
def update_service(service_id, update_service: ServiceUpdate) -> Service:

    if not ObjectId.is_valid(service_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service nicht gefunden")

    update_data = update_service.model_dump(exclude_unset = True)

    if update_data is None:
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

    return conver_service(document)



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

    return conver_service(document)
    