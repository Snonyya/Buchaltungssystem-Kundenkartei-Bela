from fastapi import APIRouter, Query

from app.database import database
from app.models.audit import AuditLog

router = APIRouter(
    prefix="/audit",
    tags=["Audit"],
)

def convertAudit(auditLog: dict) -> AuditLog:
    return AuditLog(
        id=str(auditLog["_id"]),
        **{key: value for key, value in auditLog.items() if key != "_id"},
    )

@router.get("", response_model = list[AuditLog])
def list_audit_log(limit: int = Query(default=100, ge=1, le=999),) -> list[AuditLog]:
    documents = database.audit_logs.find().sort(
        "occurred_at",
        -1,
    ).limit(limit)


    return [
        convertAudit(auditLog)
        for auditLog in documents
    ]