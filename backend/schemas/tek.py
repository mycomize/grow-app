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
    creator_name: str  # Will be populated from user relationship
    creator_profile_image: Optional[str] = None  # Will be encrypted for private teks
    
    # Engagement count fields - will be encrypted for private teks, cleartext for public
    like_count: Optional[str] = None  # TEXT field supporting encryption
    view_count: Optional[str] = None  # TEXT field supporting encryption
    import_count: Optional[str] = None  # TEXT field supporting encryption
    
    user_has_liked: bool = False  # Shows if current user liked this tek
    user_has_viewed: bool = False  # Shows if current user viewed this tek
    user_has_imported: bool = False  # Shows if current user has imported this tek
    is_owner: bool = False  # Shows if current user owns this tek

    class Config:
        from_attributes = True
