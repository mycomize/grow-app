from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from backend.schemas.bulk_stage import BulkGrowStages

# Note: Removed Field validators for encrypted fields since they cannot validate encrypted strings

class BulkGrowTekBase(BaseModel):
    # All user data fields are now strings to support encryption
    # These will be encrypted when is_public=False, cleartext when is_public=True
    name: Optional[str] = None
    description: Optional[str] = None
    species: Optional[str] = None
    variant: Optional[str] = None
    tags: Optional[str] = None  # JSON stored as encrypted string
    is_public: bool = False
    stages: Optional[str] = None  # JSON stored as encrypted string

class BulkGrowTekCreate(BulkGrowTekBase):
    """Schema for creating a new bulk_grow tek"""
    pass

class BulkGrowTekUpdate(BaseModel):
    """Schema for updating a bulk_grow tek"""
    # All user data fields are now strings to support encryption
    name: Optional[str] = None
    description: Optional[str] = None
    species: Optional[str] = None
    variant: Optional[str] = None
    tags: Optional[str] = None  # JSON stored as encrypted string
    is_public: Optional[bool] = None
    stages: Optional[str] = None  # JSON stored as encrypted string

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
    # All user data fields are now strings to support encryption
    name: Optional[str] = None
    description: Optional[str] = None
    species: Optional[str] = None
    variant: Optional[str] = None
    tags: Optional[str] = None  # JSON stored as encrypted string
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
