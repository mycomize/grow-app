import enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON
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
    entity_id = Column(String(256), nullable=False, index=True)
    entity_type = Column(String(64), nullable=False)
    friendly_name = Column(String(256), nullable=True)
    is_enabled = Column(Boolean, default=True)
    last_state = Column(String(64), nullable=True)
    last_attributes = Column(JSON, nullable=True)
    last_updated = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    
    # Relationship with IoTGateway
    gateway = relationship("IoTGateway", back_populates="entities")

    class Config:
        from_attributes = True
