from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import date

class GrowBase(BaseModel):
    species: str
    variant: str
    inoculation_date: date
    spawn_substrate: str
    bulk_substrate: str

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
    
    @validator('spawn_substrate')
    def spawn_substrate_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Spawn substrate cannot be empty')
        return v.strip()
    
    @validator('bulk_substrate')
    def bulk_substrate_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Bulk substrate cannot be empty')
        return v.strip()

class Grow(GrowBase):
    """Schema for returning a grow"""
    id: int
    user_id: int
    
    class Config:
        from_attributes = True

class GrowUpdate(BaseModel):
    """Schema for updating a grow"""
    species: Optional[str] = None
    variant: Optional[str] = None
    inoculation_date: Optional[date] = None
    spawn_substrate: Optional[str] = None
    bulk_substrate: Optional[str] = None
    
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
    
    @validator('spawn_substrate')
    def spawn_substrate_must_not_be_empty(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Spawn substrate cannot be empty')
        return v.strip() if v else v
    
    @validator('bulk_substrate')
    def bulk_substrate_must_not_be_empty(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Bulk substrate cannot be empty')
        return v.strip() if v else v
