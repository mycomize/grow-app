from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, Float, JSON, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from backend.database import Base

class BulkGrowTek(Base):
    """Model for bulk grow teks"""
    __tablename__ = "bulk_grow_teks"

    # Backend-generated fields are unencrypted
    id = Column(Integer, primary_key=True, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # This field is plaintext to differentiate private from public teks
    is_public = Column(Boolean, default=False, index=True)

    # These will be encrypted when is_public=False, cleartext when is_public=True
    name = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    species = Column(Text, nullable=False)
    variant = Column(Text, nullable=True)
    tags = Column(Text, nullable=True)

    # Stage-based data structure (JSON for flexibility)
    # Stages include: inoculation, spawn colonization, bulk colonization, fruiting, and harvest
    # Each stage has: Item list, EnvironmentalConditions list, Task list, and notes. These
    # lists and notes are optional though (lists may be empty, notes may be empty). See
    # backend/schemas/bulk_stage.py for definitions.
    stages = Column(Text, nullable=True)  # JSON stored as encrypted string

    # Relationships
    creator = relationship("User", back_populates="bulk_grow_teks")
