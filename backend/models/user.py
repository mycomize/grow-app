from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base
import enum


class PaymentStatus(enum.Enum):
    """Payment status enumeration"""
    unpaid = "unpaid"
    paid = "paid"
    failed = "failed"


class PaymentMethod(enum.Enum):
    """Payment method enumeration"""
    stripe = "stripe"
    bitcoin = "bitcoin"

class User(Base):
    """User model for authentication"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    profile_image = Column(Text, nullable=True)  # Base64 encoded image data
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False, onupdate=datetime.now)
    
    # Payment tracking fields
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.unpaid, nullable=False)
    payment_method = Column(Enum(PaymentMethod), nullable=True)
    payment_date = Column(DateTime, nullable=True)
    plan_id = Column(String, nullable=True)
    stripe_customer_id = Column(String, nullable=True)
    stripe_payment_intent_id = Column(String, nullable=True)

    # Relationship with BulkGrow (one-to-many)
    bulk_grows = relationship("BulkGrow", back_populates="user", cascade="all, delete-orphan")

    # Relationship with IoTGateway (one-to-many)
    iot_gateways = relationship("IoTGateway", back_populates="user", cascade="all, delete-orphan")

    # Relationship with BulkGrowTek (one-to-many)
    bulk_grow_teks = relationship("BulkGrowTek", back_populates="creator", cascade="all, delete-orphan")

    # Relationship with Order (one-to-many)
    orders = relationship("Order", back_populates="user", cascade="all, delete-orphan")
