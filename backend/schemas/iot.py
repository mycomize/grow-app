from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum

class IoTGatewayBase(BaseModel):
    # user supplied / encrypted
    name: Optional[str] = None
    type: Optional[str] = None
    api_url: Optional[str] = None
    api_key: Optional[str] = None
    description: Optional[str] = None
    linked_entities_count: Optional[str] = None
    linkable_entities_count: Optional[str] = None

class IoTGatewayCreate(IoTGatewayBase):
    """Schema for creating a new IoT gateway"""
    pass

class IoTGateway(IoTGatewayBase):
    """Schema for returning a IoT gateway"""
    # backend generated / plaintext
    id: int
    user_id: int = Field(exclude=True)

    class Config:
        from_attributes = True

class IoTGatewayUpdate(BaseModel):
    """Schema for updating a IoT gateway"""
    # user supplied / encrypted
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    api_url: Optional[str] = None
    api_key: Optional[str] = None
    linked_entities_count: Optional[str] = None
    linkable_entities_count: Optional[str] = None

# Combined endpoint schemas for performance optimization
class CombinedEntityCreate(BaseModel):
    """Schema for creating entities with pre-set linking in combined endpoint"""
    # User-supplied / encrypted
    entity_name: Optional[str] = None
    entity_type: Optional[str] = None
    friendly_name: Optional[str] = None
    domain: Optional[str] = None
    device_class: Optional[str] = None
    linked_stage: Optional[str] = None
    
    # Backend generated plaintext
    linked_grow_id: Optional[int] = None

class CombinedGatewayCreateRequest(BaseModel):
    """Schema for combined gateway and entity creation in one request"""
    # Gateway data
    gateway: IoTGatewayCreate
    
    # Entity data with pre-set links
    entities: List[CombinedEntityCreate] = []

class CombinedGatewayCreateResponse(BaseModel):
    """Schema for combined gateway and entity creation response"""
    # Gateway ID from backend
    gateway_id: int
    
    # Mapping of entity_name to backend-assigned database ID
    entity_mappings: Dict[str, int] = {}
