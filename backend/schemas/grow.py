from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import date
from backend.schemas.iot import IoTGateway

class GrowBase(BaseModel):
    species: str
    variant: str
    inoculation_date: date
    type: str = "monotub"  # Default to monotub type
    notes: Optional[str] = None

class GrowCreate(GrowBase):
    """Schema for creating a new grow"""
    @validator('species')
    def species_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Species cannot be empty')
        return v.strip()
    
    @validator('variant')
    def variant_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Variant cannot be empty')
        return v.strip()

class Grow(GrowBase):
    """Schema for returning a grow"""
    id: int
    
    # Hidden fields that exist in the model but won't be returned in responses
    user_id: int = Field(exclude=True)
    
    class Config:
        from_attributes = True

class GrowWithIoTGateways(Grow):
    """Schema for returning a grow with its IoT gateways"""
    iot_gateways: List[IoTGateway] = []

class GrowUpdate(BaseModel):
    """Schema for updating a grow"""
    species: Optional[str] = None
    variant: Optional[str] = None
    inoculation_date: Optional[date] = None
    type: Optional[str] = None
    notes: Optional[str] = None
    
    @validator('species')
    def species_must_not_be_empty(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Species cannot be empty')
        return v.strip() if v else v
    
    @validator('variant')
    def variant_must_not_be_empty(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Variant cannot be empty')
        return v.strip() if v else v
