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

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String(64), nullable=False)
    # All user data fields converted to TEXT to support encryption
    name = Column(Text, nullable=False)  # Removed index - can't index encrypted data
    description = Column(Text, nullable=True)
    api_url = Column(Text, nullable=False)
    api_key = Column(Text, nullable=False)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    # Foreign key to grow (optional)
    bulk_grow_id = Column(Integer, ForeignKey("bulk_grows.id"), nullable=True)

    # Relationship with User (back reference)
    user = relationship("User", back_populates="iot_gateways")

    # Relationship with BulkGrow (can be associated with at most one grow)
    bulk_grow = relationship("BulkGrow", back_populates="iot_gateways", foreign_keys=[bulk_grow_id])

    # Relationship with IoTEntities
    entities = relationship("IoTEntity", back_populates="gateway", cascade="all, delete-orphan")
