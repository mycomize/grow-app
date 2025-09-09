from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class CalendarTaskBase(BaseModel):
    """Base schema for CalendarTask with encrypted user data fields as strings"""
    parent_task_id: str
    grow_id: int  # Foreign key (unencrypted)
    action: Optional[str] = None  # Encrypted
    stage_key: Optional[str] = None  # Encrypted
    date: Optional[str] = None  # Encrypted - YYYY-MM-DD format
    time: Optional[str] = None  # Encrypted - HH:mm format
    status: Optional[str] = None  # Encrypted - 'pending' or 'completed'
    notification_enabled: Optional[str] = None  # Encrypted - Boolean as string
    notification_id: Optional[str] = None  # Encrypted - Expo notification identifier


class CalendarTaskCreate(CalendarTaskBase):
    """Schema for creating a new calendar task"""
    # All fields from base are required for creation
    action: str
    stage_key: str
    date: str
    time: str
    status: str = 'pending'


class CalendarTaskUpdate(BaseModel):
    """Schema for updating a calendar task"""
    action: Optional[str] = None
    stage_key: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    status: Optional[str] = None
    notification_enabled: Optional[str] = None
    notification_id: Optional[str] = None


class CalendarTask(CalendarTaskBase):
    """Schema for returning a calendar task"""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CalendarTaskResponse(CalendarTask):
    """Complete schema for API responses"""
    pass


class CalendarTaskBulkCreate(BaseModel):
    """Schema for bulk creating calendar tasks"""
    tasks: list[CalendarTaskCreate]


class CalendarTaskBulkResponse(BaseModel):
    """Schema for bulk creation response"""
    tasks: list[CalendarTaskResponse]
    created_count: int
