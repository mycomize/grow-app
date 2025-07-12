from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, Float, JSON, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from backend.database import Base

class MonotubTekTemplate(Base):
    """Template model for monotub bulk substrate tek templates"""
    __tablename__ = "monotub_tek_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    species = Column(String(64), nullable=False, index=True)  # Indexed for search
    variant = Column(String(64), nullable=True)
    
    # Tek type - matches frontend field name
    type = Column(String(64), nullable=False, default="Monotub", index=True)
    tags = Column(JSON, nullable=True)  # Array of tags
    
    # Privacy and ownership - matches frontend field name
    is_public = Column(Boolean, default=False, index=True)  # Indexed for search
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Stage-based data structure (JSON for flexibility)
    stages = Column(JSON, nullable=True)
    # Expected structure:
    # {
    #   "inoculation": {
    #     "items": [{"id": "...", "description": "...", "vendor": "...", "quantity": "...", "url": "..."}],
    #     "environmentalConditions": [{"id": "...", "name": "...", "type": "...", "lowerBound": 0, "upperBound": 0, "unit": "..."}],
    #     "tasks": [{"id": "...", "action": "...", "frequency": "...", "daysAfterStageStart": 0}],
    #     "notes": "..."
    #   },
    #   "spawnColonization": {...},
    #   "bulkColonization": {...},
    #   "fruiting": {...},
    #   "harvest": {...}
    # }
    
    # Usage statistics (for template popularity)
    usage_count = Column(Integer, default=0)
    
    # Relationships
    creator = relationship("User", back_populates="templates")

# Add relationship to User model (this would need to be added to the User model)
# templates = relationship("GrowTemplate", back_populates="creator")
