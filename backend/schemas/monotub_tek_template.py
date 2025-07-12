from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime

class Material(BaseModel):
    id: str
    description: str
    vendor: str
    quantity: str
    url: str

class EnvironmentalCondition(BaseModel):
    id: str
    name: str
    type: str
    lowerBound: float
    upperBound: float
    unit: str

class Task(BaseModel):
    id: str
    action: str
    frequency: str
    daysAfterStageStart: int

class StageData(BaseModel):
    items: List[Material] = []
    environmentalConditions: List[EnvironmentalCondition] = []
    tasks: List[Task] = []
    notes: str = ""

class Stages(BaseModel):
    inoculation: StageData
    spawnColonization: StageData
    bulkColonization: StageData
    fruiting: StageData
    harvest: StageData

class MonotubTekTemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    description: Optional[str] = None
    species: str = Field(..., min_length=1, max_length=64)
    variant: Optional[str] = Field(None, max_length=64)
    type: str = Field(default="Monotub", max_length=64)
    tags: Optional[List[str]] = []
    
    # Template visibility
    is_public: bool = False
    
    # Stage-based data structure
    stages: Stages

class MonotubTekTemplateCreate(MonotubTekTemplateBase):
    """Schema for creating a new monotub tek template"""
    pass

class MonotubTekTemplateUpdate(BaseModel):
    """Schema for updating a monotub tek template"""
    name: Optional[str] = Field(None, min_length=1, max_length=128)
    description: Optional[str] = None
    species: Optional[str] = Field(None, min_length=1, max_length=64)
    variant: Optional[str] = Field(None, max_length=64)
    type: Optional[str] = Field(None, max_length=64)
    tags: Optional[List[str]] = None
    
    is_public: Optional[bool] = None
    
    stages: Optional[Stages] = None

class MonotubTekTemplate(MonotubTekTemplateBase):
    """Schema for returning a monotub tek template"""
    id: int
    created_by: int
    created_at: datetime
    updated_at: datetime
    usage_count: int = 0
    creator_name: str  # Will be populated from user relationship
    
    class Config:
        from_attributes = True

class MonotubTekTemplateListItem(BaseModel):
    """Simplified monotub tek template schema for list views (performance)"""
    id: int
    name: str
    description: Optional[str]
    species: str
    variant: Optional[str]
    type: str
    tags: Optional[List[str]]
    is_public: bool
    created_by: int
    created_at: datetime
    usage_count: int
    creator_name: str
    creator_profile_image: Optional[str] = None
    
    class Config:
        from_attributes = True

class MonotubTekTemplateSearchFilters(BaseModel):
    """Schema for monotub tek template search filters"""
    species: Optional[str] = None
    tags: Optional[List[str]] = None
    is_public: Optional[bool] = True
    created_by: Optional[int] = None
    search_term: Optional[str] = None  # For name/description search
