from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import date, datetime
from backend.schemas.iot import IoTGateway

class GrowBase(BaseModel):
    name: Optional[str] = None
    species: Optional[str] = None
    variant: Optional[str] = None
    space: Optional[str] = None
    inoculation_date: Optional[date] = None
    tek: str = "Monotub"
    stage: str = "spawn_colonization"
    current_stage: Optional[str] = None
    status: str = "growing"
    notes: Optional[str] = None
    cost: Optional[float] = 0
    
    # Stage date fields for timeline tracking
    spawn_colonization_date: Optional[date] = None
    bulk_colonization_date: Optional[date] = None
    
    # Harvest fields
    harvest_date: Optional[date] = None
    harvest_dry_weight_grams: Optional[float] = 0
    harvest_wet_weight_grams: Optional[float] = 0
    
    # Syringe fields
    syringe_vendor: Optional[str] = None
    syringe_volume_ml: Optional[float] = None
    syringe_cost: Optional[float] = None
    syringe_created_at: Optional[date] = None
    syringe_expiration_date: Optional[date] = None
    syringe_status: Optional[str] = None
    
    # Spawn fields
    spawn_type: Optional[str] = None
    spawn_weight_lbs: Optional[float] = None
    spawn_cost: Optional[float] = None
    spawn_vendor: Optional[str] = None
    spawn_status: Optional[str] = None
    
    # Bulk substrate fields
    bulk_type: Optional[str] = None
    bulk_weight_lbs: Optional[float] = None
    bulk_cost: Optional[float] = None
    bulk_vendor: Optional[str] = None
    bulk_created_at: Optional[date] = None
    bulk_expiration_date: Optional[date] = None
    bulk_status: Optional[str] = None
    
    # Fruiting fields
    fruiting_start_date: Optional[date] = None
    fruiting_pin_date: Optional[date] = None
    fruiting_mist_frequency: Optional[str] = None
    fruiting_fan_frequency: Optional[str] = None
    fruiting_status: Optional[str] = None

class GrowCreate(GrowBase):
    """Schema for creating a new grow"""
    # Removed strict validators to allow partially completed grows
    # during the wizard flow

class Grow(GrowBase):
    """Schema for returning a grow"""
    id: int
    
    # Derived fields for frontend compatibility
    inoculationDate: Optional[date] = None
    harvestDate: Optional[date] = None
    harvestDryWeight: float = 0
    harvestWetWeight: float = 0
    stage: str = "spawn_colonization"
    age: Optional[int] = None
    
    # Hidden fields that exist in the model but won't be returned in responses
    user_id: int = Field(exclude=True)
    
    class Config:
        from_attributes = True
        
    @validator("inoculationDate", always=True)
    def set_inoculation_date(cls, v, values):
        return values.get("inoculation_date")
        
    @validator("harvestDate", always=True)
    def set_harvest_date(cls, v, values):
        return values.get("harvest_date")
    
    @validator("harvestDryWeight", always=True)
    def set_harvest_dry_weight(cls, v, values):
        return values.get("harvest_dry_weight_grams") or 0
    
    @validator("harvestWetWeight", always=True)
    def set_harvest_wet_weight(cls, v, values):
        return values.get("harvest_wet_weight_grams") or 0
        
    @validator("age", always=True)
    def calculate_age(cls, v, values):
        # Use spawn_colonization_date as the primary date for age calculation
        # since that's when the actual grow timeline starts
        spawn_date = values.get("spawn_colonization_date")
        inoculation_date = values.get("inoculation_date")
        
        # Prefer spawn_colonization_date, fallback to inoculation_date
        start_date = spawn_date or inoculation_date
        
        if start_date:
            today = date.today()
            days_diff = (today - start_date).days
            # Add 1 so that grows started today show as "Day 1" instead of "Day 0"
            # Return 1 if negative or 0 (future date or today), otherwise return days + 1
            return max(1, days_diff + 1)
        return None

class GrowWithIoTGateways(Grow):
    """Schema for returning a grow with its IoT gateways"""
    iot_gateways: List[IoTGateway] = []
    
class GrowComplete(Grow):
    """Schema for returning a complete grow with all related data"""
    iot_gateways: List[IoTGateway] = []

class GrowUpdate(BaseModel):
    """Schema for updating a grow"""
    name: Optional[str] = None
    species: Optional[str] = None
    variant: Optional[str] = None
    space: Optional[str] = None
    inoculation_date: Optional[date] = None
    tek: Optional[str] = None
    stage: Optional[str] = None
    current_stage: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    cost: Optional[float] = None
    
    # Stage date fields for timeline tracking
    spawn_colonization_date: Optional[date] = None
    bulk_colonization_date: Optional[date] = None
    
    # Harvest fields
    harvest_date: Optional[date] = None
    harvest_dry_weight_grams: Optional[float] = None
    harvest_wet_weight_grams: Optional[float] = None
    
    # Syringe fields
    syringe_vendor: Optional[str] = None
    syringe_volume_ml: Optional[float] = None
    syringe_cost: Optional[float] = None
    syringe_created_at: Optional[date] = None
    syringe_expiration_date: Optional[date] = None
    syringe_status: Optional[str] = None
    
    # Spawn fields
    spawn_type: Optional[str] = None
    spawn_weight_lbs: Optional[float] = None
    spawn_cost: Optional[float] = None
    spawn_vendor: Optional[str] = None
    spawn_status: Optional[str] = None
    
    # Bulk substrate fields
    bulk_type: Optional[str] = None
    bulk_weight_lbs: Optional[float] = None
    bulk_cost: Optional[float] = None
    bulk_vendor: Optional[str] = None
    bulk_created_at: Optional[date] = None
    bulk_expiration_date: Optional[date] = None
    bulk_status: Optional[str] = None
    
    # Fruiting fields
    fruiting_start_date: Optional[date] = None
    fruiting_pin_date: Optional[date] = None
    fruiting_mist_frequency: Optional[str] = None
    fruiting_fan_frequency: Optional[str] = None
    fruiting_status: Optional[str] = None
