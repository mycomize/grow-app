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
    
    # Tek abstraction - allows for different cultivation techniques
    tek_type = Column(String(64), nullable=False, default="monotub_bulk", index=True)
    difficulty = Column(String(32), nullable=True, default="Beginner")
    estimated_timeline = Column(Integer, nullable=True)  # days
    tags = Column(JSON, nullable=True)  # Array of tags
    
    # Required user inputs
    spawn_type = Column(String(128), nullable=False)
    spawn_amount = Column(Float, nullable=False)  # in lbs
    bulk_type = Column(String(128), nullable=False)
    bulk_amount = Column(Float, nullable=False)  # in lbs
    
    # Privacy and ownership
    is_public = Column(Boolean, default=False, index=True)  # Indexed for search
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # AI Generated Environmental Conditions (JSON for flexibility)
    environmental_conditions = Column(JSON, nullable=True)
    # Expected structure:
    # {
    #   "spawn_temp_range": [min, max],
    #   "bulk_temp_range": [min, max],
    #   "fruiting_temp_range": [min, max],
    #   "humidity_ranges": {
    #     "bulk": [min, max],
    #     "fruiting": [min, max]
    #   },
    #   "co2_targets": {
    #     "colonization": value,
    #     "fruiting": value
    #   },
    #   "voc_targets": {
    #     "colonization": value,
    #     "fruiting": value
    #   },
    #   "ph_ranges": {
    #     "bulk": [min, max],
    #     "fruiting": [min, max]
    #   },
    #   "lighting_schedule": {
    #     "colonization": {"hours": n, "intensity": n},
    #     "fruiting": {"hours": n, "intensity": n}
    #   }
    # }
    
    # Environmental sensor parameters (user definable)
    environmental_sensors = Column(JSON, nullable=True)
    # Expected structure: Array of
    # {
    #   "name": "VOC",
    #   "target_range": [min, max],
    #   "unit": "ppm",
    #   "stage_specific": false
    # }
    
    # AI Generated Schedule
    scheduled_actions = Column(JSON, nullable=True)
    # Expected structure: Array of
    # {
    #   "stage": "spawn_colonization",
    #   "day_offset": 7,
    #   "action_type": "check",
    #   "description": "Check colonization progress",
    #   "frequency": "daily",
    #   "is_critical": true
    # }
    
    # AI Generated or calculated stage durations
    stage_durations = Column(JSON, nullable=True)
    # Expected structure:
    # {
    #   "spawn_colonization": [min_days, max_days],
    #   "bulk_colonization": [min_days, max_days],
    #   "pinning": [min_days, max_days],
    #   "fruiting": [min_days, max_days]
    # }
    
    # Usage statistics (for template popularity)
    usage_count = Column(Integer, default=0)
    
    # Relationships
    creator = relationship("User", back_populates="templates")

# Add relationship to User model (this would need to be added to the User model)
# templates = relationship("GrowTemplate", back_populates="creator")
