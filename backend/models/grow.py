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
    species = Column(String(64), nullable=True)
    variant = Column(String(64), nullable=True)
    inoculation_date = Column(Date, nullable=True)
    tek = Column(String(64), default=GrowTek.MONOTUB.value)
    stage = Column(String(64), default=GrowStage.SPAWN_COLONIZATION.value)
    notes = Column(Text, nullable=True)
    status = Column(String(64), default=GrowStatus.GROWING.value)
    cost = Column(Float, default=0.0)
    
    # Harvest fields
    harvest_date = Column(Date, nullable=True)
    harvest_dry_weight_grams = Column(Float, default=0)
    harvest_wet_weight_grams = Column(Float, default=0)
    
    # Syringe fields
    syringe_vendor = Column(String(128), nullable=True)
    syringe_volume_ml = Column(Float, nullable=True)
    syringe_cost = Column(Float, nullable=True)
    syringe_created_at = Column(Date, nullable=True)
    syringe_expiration_date = Column(Date, nullable=True)
    
    # Spawn fields
    spawn_type = Column(String(128), nullable=True)
    spawn_weight_lbs = Column(Float, nullable=True)
    spawn_cost = Column(Float, nullable=True)
    spawn_vendor = Column(String(128), nullable=True)
    
    # Bulk substrate fields
    bulk_type = Column(String(128), nullable=True)
    bulk_weight_lbs = Column(Float, nullable=True)
    bulk_cost = Column(Float, nullable=True)
    bulk_vendor = Column(String(128), nullable=True)
    bulk_created_at = Column(Date, nullable=True)
    bulk_expiration_date = Column(Date, nullable=True)
    
    # Fruiting fields
    fruiting_start_date = Column(Date, nullable=True)
    fruiting_pin_date = Column(Date, nullable=True)
    fruiting_mist_frequency = Column(String(64), nullable=True)
    fruiting_fan_frequency = Column(String(64), nullable=True)
    
    # Foreign key to user
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Relationship with User (back reference)
    user = relationship("User", back_populates="grows")
    
    # One-to-many relationship with IoT gateways
    iot_gateways = relationship("IoTGateway", back_populates="grow", cascade="all, delete-orphan")
