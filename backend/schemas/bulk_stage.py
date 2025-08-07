from pydantic import BaseModel
from typing import Optional, List, Dict, Any

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

# All user data fields converted to strings to support encryption
class Item(BaseModel):
    id: str
    description: str
    vendor: str
    quantity: str
    cost: Optional[str] = None
    url: str
    created_date: Optional[str] = None  # Changed from datetime to str for encryption
    expiration_date: Optional[str] = None  # Changed from datetime to str for encryption

class Task(BaseModel):
    id: str
    action: str
    frequency: str
    days_after_stage_start: str  # Changed from int to str for encryption

class EnvironmentalCondition(BaseModel):
    id: str
    name: str
    type: str
    lower_bound: str  # Changed from float to str for encryption
    upper_bound: str  # Changed from float to str for encryption
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
