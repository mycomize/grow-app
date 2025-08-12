from pydantic import BaseModel
from typing import Optional, List

class IoTEntityBase(BaseModel):
    # User-supplied / encrypted
    entity_name: Optional[str] = None
    entity_type: Optional[str] = None
    friendly_name: Optional[str] = None
    domain: Optional[str] = None
    device_class: Optional[str] = None

class IoTEntityCreate(IoTEntityBase):
    # Backend generated plaintext
    gateway_id: int

class IoTEntityUpdate(BaseModel):
    # User-supplied / encrypted
    friendly_name: Optional[str] = None
    linked_grow_id: Optional[int] = None
    linked_stage: Optional[str] = None

class IoTEntity(IoTEntityBase):
    # Backend generated plaintext
    id: int
    gateway_id: int
    linked_grow_id: Optional[int] = None

    # User-supplied / encrypted
    linked_stage: Optional[str] = None

    class Config:
        from_attributes = True

class EntityLinkingRequest(BaseModel):
    # Backend generated plaintext
    grow_id: int

    # User-supplied / encrypted
    stage: str

class BulkEntityLinkingRequest(BaseModel):
    # Backend generated plaintext
    entity_ids: List[int]  # Database entity IDs to link
    grow_id: int

    # User-supplied / encrypted
    stage: str
class BulkEntityCreateRequest(BaseModel):
    entities: List[IoTEntityCreate]

class BulkEntityDeleteRequest(BaseModel):
    entity_ids: List[int]  # Database entity IDs to delete
