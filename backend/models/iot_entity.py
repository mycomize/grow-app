import enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base

class EntityType(enum.Enum):
    """Enum for entity types"""
    SWITCH = "switch"
    SENSOR = "sensor"
    LIGHT = "light"
    CLIMATE = "climate"
    COVER = "cover"
    FAN = "fan"
    LOCK = "lock"
    BINARY_SENSOR = "binary_sensor"

class IoTEntity(Base):
    """IoTEntity model for managing enabled Home Assistant entities"""
    __tablename__ = "iot_entities"

    id = Column(Integer, primary_key=True, index=True)
    gateway_id = Column(Integer, ForeignKey("iot_gateways.id"), nullable=False)
    # All user data fields converted to TEXT to support encryption
    entity_id = Column(Text, nullable=False)  # Removed index - can't index encrypted data
    entity_type = Column(String(64), nullable=False)
    friendly_name = Column(Text, nullable=True)
    is_enabled = Column(Boolean, default=True)
    last_state = Column(Text, nullable=True)
    last_attributes = Column(Text, nullable=True)  # JSON stored as encrypted string
    last_updated = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    
    # Relationship with IoTGateway
    gateway = relationship("IoTGateway", back_populates="entities")

    class Config:
        from_attributes = True
