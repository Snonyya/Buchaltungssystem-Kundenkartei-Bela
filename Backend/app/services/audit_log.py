from datetime import datetime, timezone
from typing import Any

from app.database import database

def write_audit_log(
    *,
    action: str,
    entity_type: str,
    entity_id: str,
    summary: str,
    details: dict[str, Any] | None = None,
) -> None:
    database.audit_logs.insert_one(
        {
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "summary": summary,
            "details": details or {},
            "occurred_at": datetime.now(timezone.utc),
        }
    )