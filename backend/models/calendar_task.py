from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, DateTime, func, ForeignKey
from sqlalchemy.orm import relationship
from backend.database import Base


class CalendarTask(Base):
    """Model for calendar task instances created from Task templates"""
    __tablename__ = "calendar_tasks"

    # Backend generated fields are unencrypted
    id = Column(Integer, primary_key=True, index=True)
    parent_task_id = Column(String(255), nullable=False, index=True)  # Reference to parent Task UUID
    grow_id = Column(Integer, ForeignKey("bulk_grows.id"), nullable=False, index=True)  # Foreign key to grow
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # All user data fields encrypted (stored as TEXT)
    action = Column(Text, nullable=False)  # Copy of parent task action for performance
    stage_key = Column(Text, nullable=False)  # e.g., 'inoculation', 'spawn_colonization'
    date = Column(Text, nullable=False)  # YYYY-MM-DD format
    time = Column(Text, nullable=False)  # HH:mm format  
    status = Column(Text, nullable=False, default='pending')  # 'pending' or 'completed'

    # Relationship with BulkGrow
    grow = relationship("BulkGrow", back_populates="calendar_tasks")
