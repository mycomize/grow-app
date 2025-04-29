import enum

from sqlalchemy import Column, Integer, String, Date, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from datetime import date
from backend.database import Base

class GrowType(enum.Enum):
    """Enum for grow types"""
    MONOTUB = "monotub"
    
class Grow(Base):
    """Grow model for mushroom cultivation tracking"""
    __tablename__ = "grows"

    id = Column(Integer, primary_key=True, index=True)
    species = Column(String(64), index=True)
    variant = Column(String(64), index=True)
    inoculation_date = Column(Date)
    type = Column(String(64), default=GrowType.MONOTUB.value)  # Default to monotub type
    notes = Column(Text)
    
    # Foreign key to user
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Relationship with User (back reference)
    user = relationship("User", back_populates="grows")
    
    # One-to-one relationship with grow types
    monotub = relationship("MonotubGrow", back_populates="grow", uselist=False, cascade="all, delete-orphan")
    
    # One-to-many relationship with IoT gateways
    iot_gateways = relationship("IoTGateway", back_populates="grow", cascade="all, delete-orphan")
    
    # One-to-one relationship with harvest
    harvest = relationship("Harvest", back_populates="grow", uselist=False, cascade="all, delete-orphan")
    
    
class MonotubGrow(Base):
    __tablename__ = "monotub_grows"

    id = Column(Integer, primary_key=True, index=True)
    grow_id = Column(Integer, ForeignKey("grows.id"), unique=True)
    
    # Relationship with Grow (back reference)
    grow = relationship("Grow", back_populates="monotub")
    
    # Foreign keys to inventory items (non-nullable)
    syringe_id = Column(Integer, ForeignKey("syringes.id"), nullable=False)
    spawn_id = Column(Integer, ForeignKey("spawns.id"), nullable=False)
    bulk_id = Column(Integer, ForeignKey("bulks.id"), nullable=False)
    
    # Relationships with inventory items - will cascade delete when the grow is deleted
    syringe = relationship("Syringe", foreign_keys=[syringe_id], 
                          primaryjoin="MonotubGrow.syringe_id == Syringe.id",
                          cascade="all, delete")
    spawn = relationship("Spawn", foreign_keys=[spawn_id], 
                        primaryjoin="MonotubGrow.spawn_id == Spawn.id",
                        cascade="all, delete")
    bulk = relationship("Bulk", foreign_keys=[bulk_id], 
                       primaryjoin="MonotubGrow.bulk_id == Bulk.id",
                       cascade="all, delete")
    
class Harvest(Base):
    __tablename__ = "harvests"

    id = Column(Integer, primary_key=True, index=True)
    grow_id = Column(Integer, ForeignKey("grows.id"), unique=True)
    harvest_date = Column(Date)
    dry_weight_grams = Column(Float)
    wet_weight_grams = Column(Float)
    
    # Relationship with Grow (back reference)
    grow = relationship("Grow", back_populates="harvest")
