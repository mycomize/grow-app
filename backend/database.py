from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Create database directory if it doesn't exist
os.makedirs("./data", exist_ok=True)

# Create Base class
Base = declarative_base()

# Single database configuration
DATABASE_URL = "sqlite:///./data/mycomize.db"

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Dependency to get DB session
def get_mycomize_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
