from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, Float, JSON, ForeignKey, DateTime, func, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.database import Base

class TekLike(Base):
    """Model for tek likes - tracks which users have liked which teks"""
    __tablename__ = "tek_likes"

    id = Column(Integer, primary_key=True, index=True)
    tek_id = Column(Integer, ForeignKey("bulk_grow_teks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now())

    __table_args__ = (UniqueConstraint('tek_id', 'user_id', name='unique_tek_like'),)

    # Relationships
    tek = relationship("BulkGrowTek", back_populates="likes")
    user = relationship("User")

class TekView(Base):
    """Model for tek views - tracks which users have viewed which teks"""
    __tablename__ = "tek_views"

    id = Column(Integer, primary_key=True, index=True)
    tek_id = Column(Integer, ForeignKey("bulk_grow_teks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now())

    __table_args__ = (UniqueConstraint('tek_id', 'user_id', name='unique_tek_view'),)

    # Relationships
    tek = relationship("BulkGrowTek", back_populates="views")
    user = relationship("User")

class TekImport(Base):
    """Model for tek imports - tracks every import of a tek by users (allows multiple imports)"""
    __tablename__ = "tek_imports"

    id = Column(Integer, primary_key=True, index=True)
    tek_id = Column(Integer, ForeignKey("bulk_grow_teks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    tek = relationship("BulkGrowTek", back_populates="imports")
    user = relationship("User")
