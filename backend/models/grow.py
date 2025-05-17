import enum

from sqlalchemy import Column, Integer, String, Date, ForeignKey, Float, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import date
from backend.database import Base

class GrowType(enum.Enum):
    """Enum for grow types"""
    MONOTUB = "monotub"
    
class Grow(Base):
    """Grow model for mushroom cultivation tracking"""
    __tablename__ = "grows"

    id = Column(Integer, primary_key=True, index=True)
    species = Column(String(64), index=True)
    variant = Column(String(64), index=True)
    inoculation_date = Column(Date)
    type = Column(String(64), default=GrowType.MONOTUB.value)  # Default to monotub type
    notes = Column(Text)
    contaminated = Column(Boolean, default=False)
    
    # Harvest fields directly in the Grow model
    harvest_date = Column(Date, nullable=True)
    harvest_dry_weight_grams = Column(Float, default=0)
    harvest_wet_weight_grams = Column(Float, default=0)
    
    # Foreign key to user
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Relationship with User (back reference)
    user = relationship("User", back_populates="grows")
    
    # One-to-many relationship with inventory items (inventory items have a foreign key to grow)
    inventory_items = relationship("InventoryItem", back_populates="grow", cascade="all")
    
    # One-to-many relationship with IoT gateways
    iot_gateways = relationship("IoTGateway", back_populates="grow", cascade="all, delete-orphan")
