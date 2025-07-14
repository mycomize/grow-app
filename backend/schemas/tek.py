from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from backend.schemas.bulk_stage import BulkGrowStages

class BulkGrowTekBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    description: Optional[str] = None
    species: str = Field(..., min_length=1, max_length=64)
    variant: Optional[str] = Field(None, max_length=64)
    tags: Optional[List[str]] = []
    is_public: bool = False
    stages: Optional[BulkGrowStages] = None

class BulkGrowTekCreate(BulkGrowTekBase):
    """Schema for creating a new bulk_grow tek"""
    pass

class BulkGrowTekUpdate(BaseModel):
    """Schema for updating a bulk_grow tek"""
    name: Optional[str] = Field(None, min_length=1, max_length=128)
    description: Optional[str] = None
    species: Optional[str] = Field(None, min_length=1, max_length=64)
    variant: Optional[str] = Field(None, max_length=64)
    tags: Optional[List[str]] = None
    is_public: Optional[bool] = None
    stages: Optional[BulkGrowStages] = None

class BulkGrowTek(BulkGrowTekBase):
    """Schema for returning a bulk_grow tek"""
    id: int
    created_by: int
    created_at: datetime
    updated_at: datetime
    usage_count: int = 0
    creator_name: str  # Will be populated from user relationship

    class Config:
        from_attributes = True

class BulkGrowTekListItem(BaseModel):
    """Simplified bulk_grow tek schema for list views (performance)"""
    id: int
    name: str
    description: Optional[str]
    species: str
    variant: Optional[str]
    tags: Optional[List[str]]
    is_public: bool
    created_by: int
    created_at: datetime
    usage_count: int
    creator_name: str
    creator_profile_image: Optional[str] = None

    class Config:
        from_attributes = True

class BulkGrowTekSearchFilters(BaseModel):
    """Schema for bulk_grow tek search filters"""
    species: Optional[str] = None
    variant: Optional[str] = None
    tags: Optional[List[str]] = None
    is_public: Optional[bool] = True
    created_by: Optional[int] = None
    search_term: Optional[str] = None  # For name/description search
