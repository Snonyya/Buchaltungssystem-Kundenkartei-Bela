from datetime import datetime, timezone
from fastapi import APIRouter
from pymongo import ReturnDocument
from app.database import database
from app.models.settings import BusinessProfile, BusinessProfileInput
from app.services.audit_log import write_audit_log

router = APIRouter(
    prefix="/settings",
    tags=["Settings"]
)

def convert_business_profile(document: dict) -> BusinessProfile:
    return BusinessProfile(
        **{key: value for key, value in document.items() if key !="_id"}
    )


@router.get("/business_profile", response_model = BusinessProfile | None)
def get_business_profile() -> BusinessProfile | None:
    document = database.business_settings.find_one(
        {
            "_id":"business_profile"
        }
    )

    if document is None:
        return None

    return convert_business_profile(document)

@router.put("/business_profile", response_model=BusinessProfile)
def save_business_profile(profile: BusinessProfileInput) -> BusinessProfile:
    now = datetime.now(timezone.utc)
    profile_data = profile.model_dump()

    document = database.business_settings.find_one_and_update(
        {
            "_id": "business_profile",
        },
        {
            "$set": {
                **profile_data,
                "updated_at": now,
            },
            "$setOnInsert":{
                "created_at": now,
            },
        },
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )

    write_audit_log(
        action="business_profile.saved",
        entity_type="business_profile",
        entity_id="business_profile",
        summary="Unternehmensdaten gespeichert",
        details={
            "taxation_mode": profile.taxation_mode.value,
        },
    )

    return convert_business_profile(document)