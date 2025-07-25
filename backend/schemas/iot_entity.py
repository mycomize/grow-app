from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class IoTEntityBase(BaseModel):
    # All user data fields are now strings to support encryption
    entity_id: Optional[str] = None
    entity_type: str  # System field - remains unencrypted
    friendly_name: Optional[str] = None
    is_enabled: bool = True  # System field - remains unencrypted

class IoTEntityCreate(IoTEntityBase):
    gateway_id: int

class IoTEntityUpdate(BaseModel):
    friendly_name: Optional[str] = None
    is_enabled: Optional[bool] = None

class IoTEntity(IoTEntityBase):
    id: int
    gateway_id: int
    # All user data fields are now strings to support encryption
    last_state: Optional[str] = None
    last_attributes: Optional[str] = None  # JSON stored as encrypted string
    last_updated: Optional[datetime] = None  # System field - remains unencrypted
    created_at: datetime  # System field - remains unencrypted

    class Config:
        from_attributes = True
