from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from backend.schemas.bulk_stage import BulkGrowStages

class BulkGrowTekBase(BaseModel):
    # These will be encrypted when is_public=False, cleartext when is_public=True
    name: Optional[str] = None
    description: Optional[str] = None
    species: Optional[str] = None
    variant: Optional[str] = None
    tags: Optional[str] = None
    stages: Optional[str] = None
    
    # Plaintext 
    is_public: bool = False

class BulkGrowTekCreate(BulkGrowTekBase):
    """Schema for creating a new bulk_grow tek"""
    pass

class BulkGrowTekUpdate(BaseModel):
    """Schema for updating a bulk_grow tek"""
    # These are encrypted when is_public=False
    name: Optional[str] = None
    description: Optional[str] = None
    species: Optional[str] = None
    variant: Optional[str] = None
    tags: Optional[str] = None
    stages: Optional[str] = None
    
    # Plaintext
    is_public: Optional[bool] = None

class BulkGrowTek(BulkGrowTekBase):
    """Schema for returning a bulk_grow tek"""
    id: int
    created_at: datetime
    updated_at: datetime
    created_by: int = Field(exclude=True)
    creator_name: str  # Will be populated from user relationship

    class Config:
        from_attributes = True