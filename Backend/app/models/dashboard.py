from datetime import datetime
from pydantic import BaseModel


# Modell für die dashboard übersicht der einnahmen
class DashboardSummary(BaseModel):
    start: datetime
    end: datetime
    transaction_count: int
    total_cents: int
    cash_total_cents: int
    online_total_cents: int
    average_cents: float
    lowest_transaction_cents: int
    highest_transaction_cents: int