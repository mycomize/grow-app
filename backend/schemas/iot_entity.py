from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class IoTEntityBase(BaseModel):
    entity_id: str
    entity_type: str
    friendly_name: Optional[str] = None
    is_enabled: bool = True

class IoTEntityCreate(IoTEntityBase):
    gateway_id: int

class IoTEntityUpdate(BaseModel):
    friendly_name: Optional[str] = None
    is_enabled: Optional[bool] = None

class IoTEntity(IoTEntityBase):
    id: int
    gateway_id: int
    last_state: Optional[str] = None
    last_attributes: Optional[Dict[str, Any]] = None
    last_updated: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
