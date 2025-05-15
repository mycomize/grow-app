from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
from enum import Enum

class InventoryItemTypeEnum(str, Enum):
    SYRINGE = "syringe"
    SPAWN = "spawn"
    BULK = "bulk"
    OTHER = "other"

class SyringeTypeEnum(str, Enum):
    SPORE_SYRINGE = "spore syringe"
    LIQUID_CULTURE = "liquid culture"

# Base schema for common inventory item attributes
class InventoryItemBase(BaseModel):
    type: str
    id: int
    source: Optional[str] = None
    source_date: datetime
    expiration_date: Optional[datetime] = None
    cost: Optional[float] = None
    notes: Optional[str] = None

# Syringe schemas
class SyringeBase(InventoryItemBase):
    syringe_type: str
    volume_ml: float 
    species: str
    variant: str

class SyringeCreate(SyringeBase):
    """Schema for creating a new syringe"""
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

class Syringe(SyringeBase):
    """Schema for returning a syringe"""
    id: int
    in_use: bool
    
    # Hidden fields that exist in the model but won't be returned in responses
    user_id: int = Field(exclude=True)
    
    class Config:
        from_attributes = True

# Spawn schemas
class SpawnBase(InventoryItemBase):
    spawn_type: str
    amount_lbs: float

class SpawnCreate(SpawnBase):
    """Schema for creating spawn"""
    @validator('spawn_type')
    def spawn_type_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Spawn type cannot be empty')
        return v.strip()

class Spawn(SpawnBase):
    """Schema for returning spawn"""
    id: int
    in_use: bool
    
    # Hidden fields that exist in the model but won't be returned in responses
    user_id: int = Field(exclude=True)
    
    class Config:
        from_attributes = True

# Bulk substrate schemas
class BulkBase(InventoryItemBase):
    bulk_type: str
    amount_lbs: float

class BulkCreate(BulkBase):
    """Schema for creating bulk substrate"""
    @validator('bulk_type')
    def bulk_type_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Bulk type cannot be empty')
        return v.strip()

class Bulk(BulkBase):
    """Schema for returning bulk substrate"""
    id: int
    in_use: bool
    
    # Hidden fields that exist in the model but won't be returned in responses
    user_id: int = Field(exclude=True)
    
    class Config:
        from_attributes = True

# Update schemas
class SyringeUpdate(BaseModel):
    """Schema for updating a syringe"""
    source: Optional[str] = None
    source_date: Optional[datetime] = None
    expiration_date: Optional[datetime] = None
    cost: Optional[float] = None
    notes: Optional[str] = None
    syringe_type: Optional[str] = None
    volume_ml: Optional[float] = None
    species: Optional[str] = None
    variant: Optional[str] = None
    
class SpawnUpdate(BaseModel):
    """Schema for updating spawn"""
    source: Optional[str] = None
    source_date: Optional[datetime] = None
    expiration_date: Optional[datetime] = None
    cost: Optional[float] = None
    notes: Optional[str] = None
    spawn_type: Optional[str] = None
    amount_lbs: Optional[float] = None
class BulkUpdate(BaseModel):
    """Schema for updating bulk substrate"""
    source: Optional[str] = None
    source_date: Optional[datetime] = None
    expiration_date: Optional[datetime] = None
    cost: Optional[float] = None
    notes: Optional[str] = None
    bulk_type: Optional[str] = None
    amount_lbs: Optional[float] = None