from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.database import close_mongodb_connection, connect_to_mongodb
from Backend.app.routes import customers

# FastApi (backend server) aufrufen + MongoDB verbindung herstellen bei beenden des Backends sauber schließen

@asynccontextmanager
async def lifespan(_: FastAPI):
    """Run setup on backend start and cleanup on backend shutdown."""
    connect_to_mongodb()
    yield
    close_mongodb_connection()

app = FastAPI(
    title="Bela Buchhaltung",
    version="0.1.0",
    lifespan=lifespan,
)
app.include_router(customers.router, prefix="/api")

@app.get("/", tags=["System"])
async def health_check() -> dict[str, str]:
    return {"status": "Backend läuft"}
