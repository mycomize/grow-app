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

    # Backend generated fields are unencrypted
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id")) # Foreign key to user

    # All user data fields encrypted
    name = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    species = Column(Text, nullable=True)
    variant = Column(Text, nullable=True)
    location = Column(Text, nullable=True)
    tags = Column(Text, nullable=True)

    # Stage specific fields that are above and beyond what is included
    # in each stage's lists (items, env conditions, tasks) and notes
    # All are encrypted
    inoculation_date = Column(Text, nullable=True)
    inoculation_status = Column(Text, nullable=True)
    spawn_start_date = Column(Text, nullable=True)
    spawn_colonization_status = Column(Text, nullable=True)
    bulk_start_date = Column(Text, nullable=True)
    bulk_colonization_status = Column(Text, nullable=True)
    fruiting_start_date = Column(Text, nullable=True)
    fruiting_status = Column(Text, nullable=True)
    full_spawn_colonization_date = Column(Text, nullable=True)
    full_bulk_colonization_date = Column(Text, nullable=True)
    fruiting_pin_date = Column(Text, nullable=True)
    harvest_completion_date = Column(Text, nullable=True)
    s2b_ratio = Column(Text, nullable=True)
    current_stage = Column(Text, nullable=True)  # Track current stage in timeline
    status = Column(Text, nullable=True)
    total_cost = Column(Text, nullable=True)

    # Stage-based data structure (JSON for flexibility)
    # Stages include: inoculation, spawn colonization, bulk colonization, fruiting, and harvest
    # Each stage has: Item list, EnvironmentalConditions list, Task list, and notes. These
    # lists and notes are optional though. See backend/schemas/bulk_stage.py for definitions.
    # Always encrypted
    stages = Column(Text, nullable=True)


    # Relationship with User (back reference)
    user = relationship("User", back_populates="bulk_grows")

    # One-to-many relationship with flushes
    flushes = relationship("BulkGrowFlush", back_populates="bulk_grow", cascade="all, delete-orphan")
    
    # One-to-many relationship with linked IoT entities
    iot_entities = relationship("IoTEntity", foreign_keys="IoTEntity.linked_grow_id", back_populates="linked_grow")
    
    # One-to-many relationship with calendar tasks
    calendar_tasks = relationship("CalendarTask", back_populates="grow", cascade="all, delete-orphan")

class BulkGrowFlush(Base):
    """Model for individual flushes within a bulk grow"""
    __tablename__ = "flushes"

    # Backend generated fields are unencrypted
    id = Column(Integer, primary_key=True, index=True)
    bulk_grow_id = Column(Integer, ForeignKey("bulk_grows.id"), nullable=False)

    # All user data fields encrypted
    harvest_date = Column(Text, nullable=True)
    wet_yield_grams = Column(Text, nullable=True)
    dry_yield_grams = Column(Text, nullable=True)
    concentration_mg_per_gram = Column(Text, nullable=True)

    # Relationship back to grow
    bulk_grow = relationship("BulkGrow", back_populates="flushes")
