from pydantic import BaseModel, Field
from typing import Optional, List
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
