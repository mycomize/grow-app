from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from enum import Enum


class PaymentMethodEnum(str, Enum):
    """Payment method enumeration for API responses"""
    stripe = "stripe"
    bitcoin = "bitcoin"


class OrderResponse(BaseModel):
    """Public order information for API responses"""
    id: int
    plan_id: str
    plan_name: str
    plan_description: Optional[str] = None
    amount: int = Field(..., description="Amount in cents")
    currency: str = Field(default="usd", description="Currency code")
    billing_interval: str = Field(..., description="Billing interval (e.g., one_time, monthly)")
    confirmation_number: str = Field(..., description="12-character confirmation code")
    payment_method: PaymentMethodEnum
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OrderCreate(BaseModel):
    """Internal order creation data"""
    user_id: int
    plan_id: str
    plan_name: str
    plan_description: Optional[str] = None
    amount: int = Field(..., description="Amount in cents")
    currency: str = Field(default="usd", description="Currency code")
    billing_interval: str
    confirmation_number: str
    payment_method: PaymentMethodEnum
    payment_intent_id: Optional[str] = None

    class Config:
        from_attributes = True


class OrderListResponse(BaseModel):
    """Paginated list of orders"""
    orders: List[OrderResponse]
    total: int
    page: int = Field(..., ge=1, description="Current page number")
    size: int = Field(..., ge=1, le=100, description="Number of items per page")
    pages: int = Field(..., ge=1, description="Total number of pages")

    class Config:
        from_attributes = True
