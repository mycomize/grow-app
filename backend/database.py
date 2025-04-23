from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Create database directory if it doesn't exist
os.makedirs("./data", exist_ok=True)

# Create Base class
Base = declarative_base()

# Function to create a database engine and session for a specific database
def create_db_engine(db_name):
    # SQLite database URL with the mycomize- prefix
    database_url = f"sqlite:///./data/mycomize-{db_name}.db"
    
    # Create SQLAlchemy engine
    engine = create_engine(
        database_url, connect_args={"check_same_thread": False}
    )
    
    # Create SessionLocal class
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    return engine, session_local

# Create user database engine and session
user_engine, UserSessionLocal = create_db_engine("user")

# Create grow database engine and session
grow_engine, GrowSessionLocal = create_db_engine("grow")

# Dependency to get user DB session
def get_user_db():
    db = UserSessionLocal()
    try:
        yield db
    finally:
        db.close()

# Dependency to get grow DB session
def get_grow_db():
    db = GrowSessionLocal()
    try:
        yield db
    finally:
        db.close()
