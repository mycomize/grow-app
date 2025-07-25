from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import date, datetime
from backend.schemas.iot import IoTGateway
from backend.schemas.bulk_stage import BulkGrowStages

# Note: Removed Field validators for encrypted fields since they cannot validate encrypted strings

# BulkGrowFlush schemas
class BulkGrowFlushBase(BaseModel):
    # All user data fields are now strings to support encryption
    harvest_date: Optional[str] = None
    wet_yield_grams: Optional[str] = None
    dry_yield_grams: Optional[str] = None
    concentration_mg_per_gram: Optional[str] = None

class BulkGrowFlushCreate(BulkGrowFlushBase):
    bulk_grow_id: int

class BulkGrowFlushUpdate(BulkGrowFlushBase):
    pass

class BulkGrowFlush(BulkGrowFlushBase):
    id: int
    bulk_grow_id: int

    class Config:
        from_attributes = True

class BulkGrowBase(BaseModel):
    # All user data fields are now strings to support encryption
    # Removed Field constraints (min_length, max_length) as they don't work with encrypted data
    name: Optional[str] = None
    description: Optional[str] = None
    species: Optional[str] = None
    variant: Optional[str] = None
    location: Optional[str] = None
    tags: Optional[str] = None  # JSON stored as encrypted string

    inoculation_date: Optional[str] = None
    inoculation_status: Optional[str] = None
    spawn_start_date: Optional[str] = None
    spawn_colonization_status: Optional[str] = None
    bulk_start_date: Optional[str] = None
    bulk_colonization_status: Optional[str] = None
    fruiting_start_date: Optional[str] = None
    fruiting_status: Optional[str] = None
    full_spawn_colonization_date: Optional[str] = None
    full_bulk_colonization_date: Optional[str] = None
    fruiting_pin_date: Optional[str] = None
    s2b_ratio: Optional[str] = None

    current_stage: Optional[str] = None
    status: Optional[str] = None
    total_cost: Optional[str] = None  # Converted from float to support encryption
    stages: Optional[str] = None  # JSON stored as encrypted string

class BulkGrowCreate(BulkGrowBase):
    """Schema for creating a new grow"""
    pass

class BulkGrow(BulkGrowBase):
    """Schema for returning a grow"""
    id: int
    user_id: int = Field(exclude=True)

    class Config:
        from_attributes = True

class BulkGrowWithIoTGateways(BulkGrow):
    """Schema for returning a grow with its IoT gateways"""
    iot_gateways: List[IoTGateway] = []

class BulkGrowWithFlushes(BulkGrow):
    """Schema for returning a grow with its flushes"""
    flushes: List[BulkGrowFlush] = []

class BulkGrowComplete(BulkGrow):
    """Schema for returning a complete grow with all related data"""
    iot_gateways: List[IoTGateway] = []
    flushes: List[BulkGrowFlush] = []

class BulkGrowUpdate(BaseModel):
    """Schema for updating a grow"""
    # All user data fields are now strings to support encryption
    name: Optional[str] = None
    description: Optional[str] = None
    species: Optional[str] = None
    variant: Optional[str] = None
    location: Optional[str] = None
    tags: Optional[str] = None  # JSON stored as encrypted string

    inoculation_date: Optional[str] = None
    inoculation_status: Optional[str] = None
    spawn_start_date: Optional[str] = None
    spawn_colonization_status: Optional[str] = None
    bulk_start_date: Optional[str] = None
    bulk_colonization_status: Optional[str] = None
    fruiting_start_date: Optional[str] = None
    fruiting_status: Optional[str] = None
    full_spawn_colonization_date: Optional[str] = None
    full_bulk_colonization_date: Optional[str] = None
    fruiting_pin_date: Optional[str] = None
    s2b_ratio: Optional[str] = None

    current_stage: Optional[str] = None
    status: Optional[str] = None
    total_cost: Optional[str] = None  # Converted from float to support encryption

    stages: Optional[str] = None  # JSON stored as encrypted string
