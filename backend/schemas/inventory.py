from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
from enum import Enum

class InventoryItemTypeEnum(str, Enum):
    SYRINGE = "Syringe"
    SPAWN = "Spawn"
    BULK = "Bulk"
    OTHER = "Other"

class SyringeTypeEnum(str, Enum):
    SPORE_SYRINGE = "spore syringe"
    LIQUID_CULTURE = "liquid culture"

# Consolidated inventory item schema
class InventoryItemBase(BaseModel):
    """Base schema for all inventory items with common attributes"""
    type: str
    source: Optional[str] = None
    source_date: datetime
    expiration_date: Optional[datetime] = None
    cost: Optional[float] = None
    notes: Optional[str] = None
    
    # Syringe-specific fields
    syringe_type: Optional[str] = None
    volume_ml: Optional[float] = None
    species: Optional[str] = None
    variant: Optional[str] = None
    
    # Spawn-specific fields
    spawn_type: Optional[str] = None
    
    # Bulk-specific fields
    bulk_type: Optional[str] = None
    
    # Common field for both Spawn and Bulk
    amount_lbs: Optional[float] = None

class InventoryItemCreate(InventoryItemBase):
    """Schema for creating a new inventory item"""
    @validator('type')
    def validate_type(cls, v):
        valid_types = ["Syringe", "Spawn", "Bulk", "Other"]
        if v not in valid_types:
            raise ValueError(f'Type must be one of: {", ".join(valid_types)}')
        return v
    
    @validator('species')
    def species_must_not_be_empty(cls, v, values):
        if values.get('type') == 'Syringe' and (not v or not v.strip()):
            raise ValueError('Species cannot be empty for syringe type')
        return v.strip() if v else v
    
    @validator('variant')
    def variant_must_not_be_empty(cls, v, values):
        if values.get('type') == 'Syringe' and (not v or not v.strip()):
            raise ValueError('Variant cannot be empty for syringe type')
        return v.strip() if v else v
    
    @validator('spawn_type')
    def spawn_type_must_not_be_empty(cls, v, values):
        if values.get('type') == 'Spawn' and (not v or not v.strip()):
            raise ValueError('Spawn type cannot be empty for spawn type')
        return v.strip() if v else v
    
    @validator('bulk_type')
    def bulk_type_must_not_be_empty(cls, v, values):
        if values.get('type') == 'Bulk' and (not v or not v.strip()):
            raise ValueError('Bulk type cannot be empty for bulk type')
        return v.strip() if v else v
    
    @validator('amount_lbs')
    def amount_lbs_must_be_provided(cls, v, values):
        if values.get('type') in ['Spawn', 'Bulk'] and v is None:
            raise ValueError('Amount in lbs is required for spawn and bulk types')
        return v

class InventoryItem(InventoryItemBase):
    """Schema for returning an inventory item"""
    id: int
    in_use: bool
    
    # Hidden fields that exist in the model but won't be returned in responses
    user_id: int = Field(exclude=True)
    
    class Config:
        from_attributes = True

class InventoryItemUpdate(BaseModel):
    """Schema for updating any inventory item"""
    type: Optional[str] = None
    source: Optional[str] = None
    source_date: Optional[datetime] = None
    expiration_date: Optional[datetime] = None
    cost: Optional[float] = None
    notes: Optional[str] = None
    
    # Syringe-specific fields
    syringe_type: Optional[str] = None
    volume_ml: Optional[float] = None
    species: Optional[str] = None
    variant: Optional[str] = None
    
    # Spawn-specific fields
    spawn_type: Optional[str] = None
    
    # Bulk-specific fields
    bulk_type: Optional[str] = None
    
    # Common field for both Spawn and Bulk
    amount_lbs: Optional[float] = None
    
    @validator('type')
    def validate_type(cls, v):
        if v is not None:
            valid_types = ["Syringe", "Spawn", "Bulk", "Other"]
            if v not in valid_types:
                raise ValueError(f'Type must be one of: {", ".join(valid_types)}')
        return v
