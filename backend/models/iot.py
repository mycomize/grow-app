import enum

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base

class IoTGatewayType(enum.Enum):
    """Enum for IoT gateway types"""
    HASS = "home_assistant"

class IoTGateway(Base):
    """IoTGateway model for managing IoT-enhanced grows"""
    __tablename__ = "iot_gateways"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String(64), nullable=False)
    name = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    api_url = Column(String(256), nullable=False)
    api_key = Column(String(256), nullable=False)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    
    # Foreign key to grow (optional)
    grow_id = Column(Integer, ForeignKey("grows.id"), nullable=True)

    # Relationship with User (back reference)
    user = relationship("User", back_populates="iot_gateways")

    # Relationship with Grow (can be associated with at most one grow)
    grow = relationship("Grow", back_populates="iot_gateways", foreign_keys=[grow_id])

    # Relationship with IoTEntities
    entities = relationship("IoTEntity", back_populates="gateway", cascade="all, delete-orphan")
