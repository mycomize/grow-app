from pydantic import BaseModel
from typing import Optional, List

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
    # All these are encrypted
    id: str
    description: str
    vendor: str
    quantity: str
    cost: Optional[str] = None
    url: str
    created_date: Optional[str] = None
    expiration_date: Optional[str] = None

class Task(BaseModel):
    # All these are encrypted
    id: str
    action: str
    frequency: str
    days_after_stage_start: str

class EnvironmentalCondition(BaseModel):
    # All these are encrypted
    id: str
    name: str
    type: str
    lower_bound: str
    upper_bound: str
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
