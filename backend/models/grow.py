import enum
from datetime import date, datetime

from sqlalchemy import Column, Integer, String, Date, ForeignKey, Float, Text, Boolean, func, JSON
from sqlalchemy.orm import relationship
from datetime import date
from backend.database import Base

class BulkGrowStage(enum.Enum):
    """Enum for bulk grow stages"""
    INOCULATION = "inoculation"
    SPAWN_COLONIZATION = "spawn_colonization"
    BULK_COLONIZATION = "bulk_colonization"
    FRUITING = "fruiting"
    HARVEST = "harvest"

class BulkGrowStatus(enum.Enum):
    """Enum for overall grow status"""
    HEALTHY = "healthy"
    SUSPECT = "suspect"
    CONTAMINATED = "contaminated"
    HARVESTED = "harvested"

class BulkGrowStageStatus(enum.Enum):
    """Enum for section status (inoculation, spawn colonization, bulk colonization, fruiting)"""
    HEALTHY = "Healthy"
    SUSPECT = "Suspect"
    CONTAMINATED = "Contaminated"

class BulkGrow(Base):
    """Model for bulk mushroom grows"""
    __tablename__ = "bulk_grows"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=True)
    description = Column(Text, nullable=True)
    species = Column(String(64), nullable=True, index=True)
    variant = Column(String(64), nullable=True, index=True)
    location = Column(String(128), nullable=True)
    tags = Column(JSON, nullable=True) # array of strings

    # Stage specific fields that are above and beyond what is included
    # in each stage's lists (items, env conditions, tasks) and notes
    inoculation_date = Column(Date, nullable=True)
    inoculation_status = Column(String(32), nullable=True)
    spawn_colonization_status = Column(String(32), nullable=True)
    bulk_colonization_status = Column(String(32), nullable=True)
    full_spawn_colonization_date = Column(Date, nullable=True)
    full_bulk_colonization_date = Column(Date, nullable=True)
    fruiting_pin_date = Column(Date, nullable=True)
    fruiting_status = Column(String(32), nullable=True)

    current_stage = Column(String(64), nullable=True)  # Track current stage in timeline
    status = Column(String(64), nullable=True)
    total_cost = Column(Float, default=0.0)

    # Stage-based data structure (JSON for flexibility)
    # Stages include: inoculation, spawn colonization, bulk colonization, fruiting, and harvest
    # Each stage has: Item list, EnvironmentalConditions list, Task list, and notes. These
    # lists and notes are optional though. See backend/schemas/bulk_stage.py for definitions.
    stages = Column(JSON, nullable=True)

    # Foreign key to user
    user_id = Column(Integer, ForeignKey("users.id"))

    # Relationship with User (back reference)
    user = relationship("User", back_populates="bulk_grows")

    # One-to-many relationship with IoT gateways
    iot_gateways = relationship("IoTGateway", back_populates="bulk_grow")

    # One-to-many relationship with flushes
    flushes = relationship("BulkGrowFlush", back_populates="bulk_grow", cascade="all, delete-orphan")

class BulkGrowFlush(Base):
    """Model for individual flushes within a bulk grow"""
    __tablename__ = "flushes"

    id = Column(Integer, primary_key=True, index=True)
    bulk_grow_id = Column(Integer, ForeignKey("bulk_grows.id"), nullable=False)
    harvest_date = Column(Date, nullable=True)
    wet_yield_grams = Column(Float, nullable=True)
    dry_yield_grams = Column(Float, nullable=True)
    concentration_mg_per_gram = Column(Float, nullable=True)

    # Relationship back to grow
    bulk_grow = relationship("BulkGrow", back_populates="flushes")
