import enum

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base

class IoTGatewayType(enum.Enum):
    """Enum for IoT gateway types"""
    HASS = "home_assistant"

class IoTGateway(Base):
    """IoTGateway model for managing IoT-enhanced grows"""
    __tablename__ = "iot_gateways"

    # Backend generated fields are unencrypted
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    # All user data fields encrypted
    name = Column(Text, nullable=False)
    type = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    api_url = Column(Text, nullable=False)
    api_key = Column(Text, nullable=False)
    linked_entities_count = Column(Text, nullable=True)
    linkable_entities_count = Column(Text, nullable=True)

    # Relationship with User (back reference)
    user = relationship("User", back_populates="iot_gateways")

    # Relationship with IoTEntities
    entities = relationship("IoTEntity", back_populates="gateway", cascade="all, delete-orphan")
