from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import date, datetime
from backend.schemas.iot import IoTGateway
from backend.schemas.bulk_stage import BulkGrowStages

# BulkGrowFlush schemas
class BulkGrowFlushBase(BaseModel):
    harvest_date: Optional[date] = None
    wet_yield_grams: Optional[float] = None
    dry_yield_grams: Optional[float] = None
    concentration_mg_per_gram: Optional[float] = None

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
    name: str = Field(..., min_length=1, max_length=128)
    description: Optional[str] = None
    species: str = Field(..., min_length=1, max_length=64)
    variant: Optional[str] = Field(None, max_length=64)
    location: Optional[str] = None
    tags: Optional[List[str]] = []

    inoculation_date: Optional[date] = None
    inoculation_status: Optional[str] = None
    spawn_colonization_status: Optional[str] = None
    bulk_colonization_status: Optional[str] = None
    full_spawn_colonization_date: Optional[date] = None
    full_bulk_colonization_date: Optional[date] = None
    fruiting_pin_date: Optional[date] = None
    fruiting_status: Optional[str] = None

    current_stage: Optional[str] = None
    status: Optional[str] = None
    total_cost: Optional[float] = 0
    stages: Optional[BulkGrowStages] = None

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
    name: Optional[str] = None
    description: Optional[str] = None
    species: Optional[str] = None
    variant: Optional[str] = None
    location: Optional[str] = None
    tags: Optional[List[str]] = None

    inoculation_date: Optional[date] = None
    inoculation_status: Optional[str] = None
    spawn_colonization_status: Optional[str] = None
    bulk_colonization_status: Optional[str] = None
    full_spawn_colonization_date: Optional[date] = None
    full_bulk_colonization_date: Optional[date] = None
    fruiting_pin_date: Optional[date] = None
    fruiting_status: Optional[str] = None

    current_stage: Optional[str] = None
    status: Optional[str] = None
    total_cost: Optional[float] = 0

    stages: Optional[BulkGrowStages] = None
