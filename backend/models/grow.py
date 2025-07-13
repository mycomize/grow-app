import enum
from datetime import date, datetime

from sqlalchemy import Column, Integer, String, Date, ForeignKey, Float, Text, Boolean, func, JSON
from sqlalchemy.orm import relationship
from datetime import date
from backend.database import Base

class GrowTek(enum.Enum):
    """Enum for grow techniques"""
    BULK_GROW = "BulkGrow"

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

class SectionStatus(enum.Enum):
    """Enum for section status (syringe, spawn, bulk, fruiting)"""
    HEALTHY = "Healthy"
    SUSPECT = "Suspect"
    CONTAMINATED = "Contaminated"
    
class Grow(Base):
    """Grow model for mushroom cultivation tracking"""
    __tablename__ = "grows"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=True)
    description = Column(Text, nullable=True)  # Added description field
    species = Column(String(64), nullable=True)
    variant = Column(String(64), nullable=True)
    tags = Column(JSON, nullable=True)  # Added tags field (array of strings)
    space = Column(String(128), nullable=True)
    inoculation_date = Column(Date, nullable=True)
    tek = Column(String(64), default=GrowTek.BULK_GROW.value)
    stage = Column(String(64), default=GrowStage.SPAWN_COLONIZATION.value)
    current_stage = Column(String(64), nullable=True)  # Track current stage in timeline
    status = Column(String(64), default=GrowStatus.GROWING.value)
    cost = Column(Float, default=0.0)
    
    # Stage date fields for timeline tracking
    spawn_colonization_date = Column(Date, nullable=True)
    bulk_colonization_date = Column(Date, nullable=True)
    
    # Harvest fields
    harvest_date = Column(Date, nullable=True)
    harvest_dry_weight_grams = Column(Float, default=0)
    harvest_wet_weight_grams = Column(Float, default=0)
    
    # Inoculation fields - renamed from syringe_, removed vendor and volume
    inoculation_status = Column(String(64), nullable=True)
    
    # Spawn fields - removed weight_lbs, cost, vendor
    spawn_status = Column(String(64), nullable=True)
    
    # Bulk substrate fields - removed weight_lbs, cost, vendor, created_at, expiration_date
    bulk_status = Column(String(64), nullable=True)
    
    # Fruiting fields - removed start_date, mist_frequency, fan_frequency
    fruiting_pin_date = Column(Date, nullable=True)
    fruiting_status = Column(String(64), nullable=True)
    
    # Predicted milestone fields (cached AI predictions)
    predicted_full_spawn_colonization = Column(Date, nullable=True)
    predicted_full_bulk_colonization = Column(Date, nullable=True)
    predicted_first_harvest_date = Column(Date, nullable=True)
    prediction_inputs_hash = Column(String(64), nullable=True)  # Hash of inputs used for predictions
    
    # Predicted optimal conditions fields (cached AI predictions)
    optimal_spawn_temp_low = Column(Float, nullable=True)
    optimal_spawn_temp_high = Column(Float, nullable=True)
    optimal_bulk_temp_low = Column(Float, nullable=True)
    optimal_bulk_temp_high = Column(Float, nullable=True)
    optimal_bulk_relative_humidity_low = Column(Float, nullable=True)
    optimal_bulk_relative_humidity_high = Column(Float, nullable=True)
    optimal_bulk_co2_low = Column(Float, nullable=True)
    optimal_bulk_co2_high = Column(Float, nullable=True)
    optimal_fruiting_temp_low = Column(Float, nullable=True)
    optimal_fruiting_temp_high = Column(Float, nullable=True)
    optimal_fruiting_relative_humidity_low = Column(Float, nullable=True)
    optimal_fruiting_relative_humidity_high = Column(Float, nullable=True)
    optimal_fruiting_co2_low = Column(Float, nullable=True)
    optimal_fruiting_co2_high = Column(Float, nullable=True)
    optimal_fruiting_light_low = Column(Float, nullable=True)
    optimal_fruiting_light_high = Column(Float, nullable=True)
    conditions_inputs_hash = Column(String(64), nullable=True)  # Hash of inputs used for conditions predictions
    
    # Foreign key to user
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Relationship with User (back reference)
    user = relationship("User", back_populates="grows")
    
    # One-to-many relationship with IoT gateways
    iot_gateways = relationship("IoTGateway", back_populates="grow")
    
    # One-to-many relationship with harvest flushes
    harvest_flushes = relationship("HarvestFlush", back_populates="grow", cascade="all, delete-orphan")

class HarvestFlush(Base):
    """Model for individual harvest flushes within a grow"""
    __tablename__ = "harvest_flushes"

    id = Column(Integer, primary_key=True, index=True)
    grow_id = Column(Integer, ForeignKey("grows.id"), nullable=False)
    harvest_date = Column(Date, nullable=True)
    wet_weight_grams = Column(Float, nullable=True)
    dry_weight_grams = Column(Float, nullable=True)
    concentration_mg_per_gram = Column(Float, nullable=True)
    
    # Relationship back to grow
    grow = relationship("Grow", back_populates="harvest_flushes")
