from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.database import close_mongodb_connection, connect_to_mongodb
from app.routes import customers, transactions, dashboard, service
from fastapi.middleware.cors import CORSMiddleware

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(customers.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(service.router, prefix="/api")

@app.get("/", tags=["System"])
async def health_check() -> dict[str, str]:
    return {"status": "Backend läuft"}