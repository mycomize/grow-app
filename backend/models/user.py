from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base

class User(Base):
    """User model for authentication"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False, onupdate=datetime.now)
    
    # Relationship with Grow (one-to-many)
    grows = relationship("Grow", back_populates="user", cascade="all, delete-orphan")
    
    # Relationship with InventoryItem (one-to-many)
    inventory_items = relationship("InventoryItem", back_populates="user", cascade="all, delete-orphan")
    
    # Relationship with IoTGateway (one-to-many)
    iot_gateways = relationship("IoTGateway", back_populates="user", cascade="all, delete-orphan")
    
    # Relationship with MonotubTekTemplate (one-to-many)
    templates = relationship("MonotubTekTemplate", back_populates="creator", cascade="all, delete-orphan")
