from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import date, datetime
from backend.schemas.iot import IoTGateway
from backend.schemas.inventory import InventoryItem

class GrowBase(BaseModel):
    name: str
    species: str
    variant: str
    inoculation_date: Optional[date] = None
    tek: str = "Monotub"  # Default to monotub tek
    stage: str = "spawn_colonization"  # Default to spawn colonization
    status: str = "growing"  # Default to growing status
    notes: Optional[str] = None
    cost: Optional[float] = 0
    
    # Harvest fields directly in the Grow model
    harvest_date: Optional[date] = None
    harvest_dry_weight_grams: Optional[float] = 0
    harvest_wet_weight_grams: Optional[float] = 0

class GrowCreate(GrowBase):
    """Schema for creating a new grow"""
    @validator('name')
    def name_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Name cannot be empty')
        return v.strip()
        
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
        inoculation_date = values.get("inoculation_date")
        if inoculation_date:
            today = date.today()
            return (today - inoculation_date).days
        return None

class GrowWithIoTGateways(Grow):
    """Schema for returning a grow with its IoT gateways"""
    iot_gateways: List[IoTGateway] = []
    
class GrowComplete(Grow):
    """Schema for returning a complete grow with all related data"""
    iotGatewayList: List[IoTGateway] = []
    inventoryList: List[InventoryItem] = []
    
    @validator("iotGatewayList", always=True)
    def set_iot_gateway_list(cls, v, values):
        from_values = values.get("iot_gateways")
        return from_values if from_values is not None else v
    
    @validator("inventoryList", always=True)
    def set_inventory_list(cls, v, values):
        from_values = values.get("inventory_items")
        return from_values if from_values is not None else v

class GrowUpdate(BaseModel):
    """Schema for updating a grow"""
    name: Optional[str] = None
    species: Optional[str] = None
    variant: Optional[str] = None
    inoculation_date: Optional[date] = None
    tek: Optional[str] = None
    stage: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    cost: Optional[float] = None
    
    # Harvest fields
    harvest_date: Optional[date] = None
    harvest_dry_weight_grams: Optional[float] = None
    harvest_wet_weight_grams: Optional[float] = None
    
    @validator('name')
    def name_must_not_be_empty(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Name cannot be empty')
        return v.strip() if v else v
    
    @validator('species')
    def species_must_not_be_empty(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Species cannot be empty')
        return v.strip() if v else v
    
    @validator('variant')
    def variant_must_not_be_empty(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Variant cannot be empty')
        return v.strip() if v else v
