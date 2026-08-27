import os
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.database import Database


# Load Backend/.env independently of the current terminal directory.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# Verbindung mit MongoDB herstellen und testen

MongoUrl = os.getenv("MONGO_URL")
DatabaseName = os.getenv("DB_NAME")

if not MongoUrl:
    raise RuntimeError("MONGODB_URL is missing. Add it to Backend/.env.")


client = MongoClient(MongoUrl, serverSelectionTimeoutMS=5_000)
database: Database = client[DatabaseName]


def connect_to_mongodb() -> None:
    """Check that MongoDB can be reached when the backend starts."""
    client.admin.command("ping")
    print(f"Connected to MongoDB database: {DatabaseName}")


def close_mongodb_connection() -> None:
    """Close the database connection when the backend stops."""
    client.close()
