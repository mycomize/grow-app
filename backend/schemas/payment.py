from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class PaymentStatusResponse(BaseModel):
    """Response schema for payment status endpoint"""
    payment_status: str = Field(..., description="Payment status: unpaid, paid, or failed")
    payment_method: Optional[str] = Field(None, description="Payment method: stripe or bitcoin")
    payment_date: Optional[datetime] = Field(None, description="Date when payment was completed")

class CreatePaymentIntentRequest(BaseModel):
    """Request schema for creating Stripe payment intent"""
    amount: int = Field(..., description="Payment amount in cents (e.g., 1999 for $19.99)")
    currency: str = Field(default="usd", description="Payment currency code")

class CreatePaymentIntentResponse(BaseModel):
    """Response schema for Stripe payment intent creation"""
    payment_intent_id: str = Field(..., description="Stripe payment intent ID")
    client_secret: str = Field(..., description="Client secret for frontend payment confirmation")
    publishable_key: str = Field(..., description="Stripe publishable key for frontend")

class StripeWebhookEvent(BaseModel):
    """Schema for Stripe webhook event validation"""
    id: str = Field(..., description="Event ID")
    type: str = Field(..., description="Event type")
    data: dict = Field(..., description="Event data payload")

class PaymentUpdateRequest(BaseModel):
    """Request schema for updating payment status (webhook use)"""
    user_id: int = Field(..., description="User ID to update")
    payment_status: str = Field(..., description="New payment status")
    payment_method: str = Field(..., description="Payment method used")
    payment_intent_id: Optional[str] = Field(None, description="Stripe payment intent ID")
    customer_id: Optional[str] = Field(None, description="Stripe customer ID")
