from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class AuditLog(BaseModel):
    id: str
    action: str
    entity_type: str
    entity_id: str
    summary: str
    actor: str = "local_operator"
    details: dict[str, Any] = Field(default_factory=dict)
    occurred_at: datetime