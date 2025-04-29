from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import date
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
    name: str
    source: Optional[str] = None
    source_date: date
    expiration_date: Optional[date] = None
    cost: Optional[float] = None
    notes: Optional[str] = None

    @validator('name')
    def name_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Name cannot be empty')
        return v.strip()

# Syringe schemas
class SyringeBase(InventoryItemBase):
    syringe_type: str
    volume_ml: int
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
    name: Optional[str] = None
    source: Optional[str] = None
    source_date: Optional[date] = None
    expiration_date: Optional[date] = None
    cost: Optional[float] = None
    notes: Optional[str] = None
    syringe_type: Optional[str] = None
    volume_ml: Optional[int] = None
    species: Optional[str] = None
    variant: Optional[str] = None
    
    @validator('name', 'species', 'variant')
    def fields_must_not_be_empty(cls, v, values, **kwargs):
        if v is not None and not v.strip():
            field_name = kwargs.get('field').name
            raise ValueError(f'{field_name.capitalize()} cannot be empty')
        return v.strip() if v else v

class SpawnUpdate(BaseModel):
    """Schema for updating spawn"""
    name: Optional[str] = None
    source: Optional[str] = None
    source_date: Optional[date] = None
    expiration_date: Optional[date] = None
    cost: Optional[float] = None
    notes: Optional[str] = None
    spawn_type: Optional[str] = None
    amount_lbs: Optional[float] = None
    
    @validator('name', 'spawn_type')
    def fields_must_not_be_empty(cls, v, values, **kwargs):
        if v is not None and not v.strip():
            field_name = kwargs.get('field').name
            raise ValueError(f'{field_name.capitalize()} cannot be empty')
        return v.strip() if v else v

class BulkUpdate(BaseModel):
    """Schema for updating bulk substrate"""
    name: Optional[str] = None
    source: Optional[str] = None
    source_date: Optional[date] = None
    expiration_date: Optional[date] = None
    cost: Optional[float] = None
    notes: Optional[str] = None
    bulk_type: Optional[str] = None
    amount_lbs: Optional[float] = None
    
    @validator('name', 'bulk_type')
    def fields_must_not_be_empty(cls, v, values, **kwargs):
        if v is not None and not v.strip():
            field_name = kwargs.get('field').name
            raise ValueError(f'{field_name.capitalize()} cannot be empty')
        return v.strip() if v else v
