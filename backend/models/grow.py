import enum
from datetime import date, datetime

from sqlalchemy import Column, Integer, String, Date, ForeignKey, Float, Text, Boolean, func
from sqlalchemy.orm import relationship
from datetime import date
from backend.database import Base

class GrowTek(enum.Enum):
    """Enum for grow techniques"""
    MONOTUB = "Monotub"

class GrowStage(enum.Enum):
    """Enum for grow stages"""
    SPAWN_COLONIZATION = "spawn_colonization"
    BULK_COLONIZATION = "bulk_colonization"
    FRUITING = "fruiting"
    HARVEST = "harvest"

class GrowStatus(enum.Enum):
    """Enum for grow status"""
    GROWING = "growing"
    CONTAMINATED = "contaminated"
    HARVESTED = "harvested"
    
class Grow(Base):
    """Grow model for mushroom cultivation tracking"""
    __tablename__ = "grows"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=True)
    species = Column(String(64), index=True)
    variant = Column(String(64), index=True)
    inoculation_date = Column(Date)
    tek = Column(String(64), default=GrowTek.MONOTUB.value)  # Default to monotub tek
    stage = Column(String(64), default=GrowStage.SPAWN_COLONIZATION.value)  # Default to spawn colonization
    notes = Column(Text)
    status = Column(String(64), default=GrowStatus.GROWING.value)
    cost = Column(Float, default=0.0)
    
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
