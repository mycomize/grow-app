from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database import Base
import enum


class PaymentMethodEnum(enum.Enum):
    stripe = "stripe"
    bitcoin = "bitcoin"


class Order(Base):
    __tablename__ = "orders"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign key to users table
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Plan information stored as snapshot at time of purchase
    plan_id = Column(String(50), nullable=False)  # e.g., "lifetime"
    plan_name = Column(String(100), nullable=False)  # e.g., "Lifetime Access"
    plan_description = Column(Text, nullable=True)
    
    # Payment information
    amount = Column(Integer, nullable=False)  # Amount in cents
    currency = Column(String(3), nullable=False, default="usd")  # Currency code
    billing_interval = Column(String(20), nullable=False)  # e.g., "one_time", "monthly"
    
    # Confirmation and payment tracking
    confirmation_number = Column(String(12), nullable=False, unique=True, index=True)
    payment_method = Column(Enum(PaymentMethodEnum), nullable=False, default=PaymentMethodEnum.stripe)
    payment_intent_id = Column(String(255), nullable=True, index=True)  # Stripe payment intent ID
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationship to user
    user = relationship("User", back_populates="orders")
