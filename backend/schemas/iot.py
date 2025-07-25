from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum
from backend.models.iot import IoTGatewayType

class IoTGatewayBase(BaseModel):
    # All user data fields are now strings to support encryption
    name: Optional[str] = None
    type: str  # System field - remains unencrypted
    api_url: Optional[str] = None
    api_key: Optional[str] = None
    is_active: bool = False  # System field - remains unencrypted
    description: Optional[str] = None

class IoTGatewayTypeEnum(str, Enum):
    """Enum for IoT gateway types"""
    HASS = "home_assistant"

class IoTGatewayCreate(IoTGatewayBase):
    """Schema for creating a new IoT gateway"""
    @validator('type')
    def type_must_be_valid(cls, v):
        if not v or not v.strip():
            raise ValueError('Gateway type cannot be empty')

        # Validate against the enum values
        if v.strip() not in [e.value for e in IoTGatewayType]:
            valid_types = ", ".join([e.value for e in IoTGatewayType])
            raise ValueError(f'Invalid gateway type. Must be one of: {valid_types}')

        return v.strip()

    # Removed validators for encrypted fields (name, api_url, api_key)
    # These will be encrypted strings and cannot be validated at the schema level

class IoTGateway(IoTGatewayBase):
    """Schema for returning a IoT gateway"""
    id: int
    created_at: datetime
    bulk_grow_id: Optional[int] = None

    # Hidden fields that exist in the model but won't be returned in responses
    user_id: int = Field(exclude=True)

    class Config:
        from_attributes = True

class IoTGatewayUpdate(BaseModel):
    """Schema for updating a IoT gateway"""
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    api_url: Optional[str] = None
    api_key: Optional[str] = None
    is_active: Optional[bool] = None

    @validator('type')
    def type_must_be_valid(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Gateway type cannot be empty')

        # Validate against the enum values if not None
        if v is not None and v.strip() and v.strip() not in [e.value for e in IoTGatewayType]:
            valid_types = ", ".join([e.value for e in IoTGatewayType])
            raise ValueError(f'Invalid gateway type. Must be one of: {valid_types}')

        return v.strip() if v else v

    # Removed validators for encrypted fields (name, api_url, api_key, description)
    # These will be encrypted strings and cannot be validated at the schema level
