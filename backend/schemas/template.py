from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime

class EnvironmentalSensor(BaseModel):
    name: str
    target_range: Optional[List[float]] = None
    unit: str
    stage_specific: bool = False

class ScheduledAction(BaseModel):
    stage: str
    day_offset: int
    action_type: str
    description: str
    frequency: Optional[str] = None
    is_critical: bool = False

class EnvironmentalConditions(BaseModel):
    spawn_temp_range: Optional[List[float]] = None
    bulk_temp_range: Optional[List[float]] = None
    fruiting_temp_range: Optional[List[float]] = None
    humidity_ranges: Optional[Dict[str, List[float]]] = None
    co2_targets: Optional[Dict[str, float]] = None
    lighting_schedule: Optional[Dict[str, Dict[str, float]]] = None

class StageDurations(BaseModel):
    spawn_colonization: Optional[List[int]] = None
    bulk_colonization: Optional[List[int]] = None
    pinning: Optional[List[int]] = None
    fruiting: Optional[List[int]] = None

class GrowTemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    description: Optional[str] = None
    species: str = Field(..., min_length=1, max_length=64)
    variant: Optional[str] = Field(None, max_length=64)
    technique: str = Field(default="BulkGrow", max_length=64)
    difficulty: str = Field(default="Beginner", pattern="^(Beginner|Intermediate|Advanced)$")
    estimated_timeline: Optional[int] = Field(None, ge=1, le=365)  # 1-365 days
    tags: Optional[List[str]] = []
    
    # Required user inputs
    spawn_type: str = Field(..., min_length=1, max_length=128)
    spawn_amount: float = Field(..., gt=0, le=100)  # Reasonable limits
    bulk_type: str = Field(..., min_length=1, max_length=128)  
    bulk_amount: float = Field(..., gt=0, le=1000)  # Reasonable limits
    
    # Template visibility
    is_public: bool = False
    
    # Complex fields
    environmental_conditions: Optional[EnvironmentalConditions] = None
    environmental_sensors: Optional[List[EnvironmentalSensor]] = []
    scheduled_actions: Optional[List[ScheduledAction]] = []
    stage_durations: Optional[StageDurations] = None

class GrowTemplateCreate(GrowTemplateBase):
    """Schema for creating a new template"""
    pass

class GrowTemplateUpdate(BaseModel):
    """Schema for updating a template"""
    name: Optional[str] = Field(None, min_length=1, max_length=128)
    description: Optional[str] = None
    species: Optional[str] = Field(None, min_length=1, max_length=64)
    variant: Optional[str] = Field(None, max_length=64)
    technique: Optional[str] = Field(None, max_length=64)
    difficulty: Optional[str] = Field(None, pattern="^(Beginner|Intermediate|Advanced)$")
    estimated_timeline: Optional[int] = Field(None, ge=1, le=365)
    tags: Optional[List[str]] = None
    
    spawn_type: Optional[str] = Field(None, min_length=1, max_length=128)
    spawn_amount: Optional[float] = Field(None, gt=0, le=100)
    bulk_type: Optional[str] = Field(None, min_length=1, max_length=128)
    bulk_amount: Optional[float] = Field(None, gt=0, le=1000)
    
    is_public: Optional[bool] = None
    
    environmental_conditions: Optional[EnvironmentalConditions] = None
    environmental_sensors: Optional[List[EnvironmentalSensor]] = None
    scheduled_actions: Optional[List[ScheduledAction]] = None
    stage_durations: Optional[StageDurations] = None

class GrowTemplate(GrowTemplateBase):
    """Schema for returning a template"""
    id: int
    created_by: int
    created_at: datetime
    updated_at: datetime
    usage_count: int = 0
    creator_name: Optional[str] = None  # Will be populated from user relationship
    
    class Config:
        from_attributes = True

class GrowTemplateListItem(BaseModel):
    """Simplified template schema for list views (performance)"""
    id: int
    name: str
    description: Optional[str]
    species: str
    variant: Optional[str]
    technique: str
    difficulty: str
    estimated_timeline: Optional[int]
    tags: Optional[List[str]]
    is_public: bool
    created_by: int
    created_at: datetime
    usage_count: int
    creator_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class TemplateSearchFilters(BaseModel):
    """Schema for template search filters"""
    species: Optional[str] = None
    technique: Optional[str] = None
    difficulty: Optional[str] = None
    tags: Optional[List[str]] = None
    is_public: Optional[bool] = True
    created_by: Optional[int] = None
    search_term: Optional[str] = None  # For name/description search
    
class AIGenerationRequest(BaseModel):
    """Schema for AI generation requests"""
    species: str = Field(..., min_length=1)
    variant: Optional[str] = None
    spawn_type: str = Field(..., min_length=1)
    spawn_amount: float = Field(..., gt=0)
    bulk_type: str = Field(..., min_length=1)
    bulk_amount: float = Field(..., gt=0)

class AIGenerationResponse(BaseModel):
    """Schema for AI generation responses"""
    environmental_conditions: EnvironmentalConditions
    scheduled_actions: List[ScheduledAction]
    stage_durations: StageDurations
    estimated_timeline: int
    
class GrowFromTemplateRequest(BaseModel):
    """Schema for creating a grow from a template"""
    template_id: int
    name: Optional[str] = None  # Override template name
    space: Optional[str] = None
    inoculation_date: Optional[str] = None  # ISO date string
    notes: Optional[str] = None
    # Allow customization of key parameters
    spawn_amount: Optional[float] = None
    bulk_amount: Optional[float] = None
