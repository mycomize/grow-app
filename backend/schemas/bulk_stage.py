from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

# Lists of these objects are present in each bulk grow stage.
# Lists, items, environmental conditions, and tasks are included
# in the JSON object 'stages' in the BulkGrowTek model and the
# BulkGrow model. The object would then be (roughly):
#
# {
#    "inoculation": BulkStageData,
#    "spawn_colonization": BulkStageData,
#    "bulk_colonization": BulkStageData,
#    "fruiting": BulkStageData,
#    "harvest": BulkStageData,
# }

class Item(BaseModel):
    id: str
    description: str
    vendor: str
    quantity: str
    cost: float
    url: str
    created_date: datetime
    expiration_date: datetime

class Task(BaseModel):
    id: str
    action: str
    frequency: str
    days_after_stage_start: int

class EnvironmentalCondition(BaseModel):
    id: str
    name: str
    type: str
    lower_bound: float
    upper_bound: float
    unit: str

class BulkStageData(BaseModel):
    items: List[Item] = []
    environmental_conditions: List[EnvironmentalCondition] = []
    tasks: List[Task] = []
    notes: str = ""

class BulkGrowStages(BaseModel):
    inoculation: BulkStageData
    spawn_colonization: BulkStageData
    bulk_colonization: BulkStageData
    fruiting: BulkStageData
    harvest: BulkStageData
