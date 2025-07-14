from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, Float, JSON, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from backend.database import Base

class BulkGrowTek(Base):
    """Model for bulk grow teks"""
    __tablename__ = "bulk_grow_teks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    species = Column(String(64), nullable=False, index=True)
    variant = Column(String(64), nullable=True, index=True)

    # Bulk grow tek type
    tags = Column(JSON, nullable=True) # array of strings

    # Privacy and ownership
    is_public = Column(Boolean, default=False, index=True)  # Indexed for search
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Stage-based data structure (JSON for flexibility)
    # Stages include: inoculation, spawn colonization, bulk colonization, fruiting, and harvest
    # Each stage has: Item list, EnvironmentalConditions list, Task list, and notes. These
    # lists and notes are optional though (lists may be empty, notes may be empty). See
    # backend/schemas/bulk_stage.py for definitions.
    stages = Column(JSON, nullable=True)

    # Usage statistics (for tek popularity)
    usage_count = Column(Integer, default=0)

    # Relationships
    creator = relationship("User", back_populates="bulk_grow_teks")
