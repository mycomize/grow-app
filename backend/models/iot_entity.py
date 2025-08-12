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
    """
    IoTEntity model for managing IoT gateway entities with linkable/linked states.
    
    Each IoTEntity corresponds to a Home Assistant entity. HA entities are the authoritative source for
    entity existence and metadata. DB entities store assignment/linking information and user customizations
    
    Entity States:
      linkable: linked_grow_id is NULL (entity exists but not assigned to a grow)
      linked: linked_grow_id is NOT NULL (entity is assigned to a specific grow/stage)
    
    Entity sets:
      newEntities: HA entities without corresponding DB entities -> create as linkable
      orphanedEntities: DB entities without corresponding HA entities -> delete from DB
      linkableEntities: newEntities + existing DB entities where linked_grow_id is NULL
      linkedEntities: existing DB entities where linked_grow_id is NOT NULL
    """
    __tablename__ = "iot_entities"

    # Backend generated values remain unencrypted
    id = Column(Integer, primary_key=True, index=True)
    gateway_id = Column(Integer, ForeignKey("iot_gateways.id"), nullable=False)
    linked_grow_id = Column(Integer, ForeignKey("bulk_grows.id"), nullable=True)  # NULL = linkable, NOT NULL = linked

    # All user data fields encrypted
    entity_name = Column(Text, nullable=False)    # Matches HAEntity.entity_id
    entity_type = Column(Text, nullable=False)    # HA entity type
    friendly_name = Column(Text, nullable=True)   # HA friendly name
    domain = Column(Text, nullable=False)         # Extracted from entity_id (before first '.')
    device_class = Column(Text, nullable=False)   # From HA attributes.device_class or empty string
    linked_stage = Column(Text, nullable=True)    # NULL = linkable, NOT NULL = linked
    
    # Relationship with IoTGateway
    gateway = relationship("IoTGateway", back_populates="entities")
    
    # Relationship with BulkGrow for linking
    linked_grow = relationship("BulkGrow", foreign_keys=[linked_grow_id], back_populates="iot_entities")

    class Config:
        from_attributes = True
