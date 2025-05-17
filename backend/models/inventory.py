import enum
from sqlalchemy import Column, Integer, String, Date, Float, Boolean, ForeignKey, event
from sqlalchemy.orm import relationship
from backend.database import Base

class InventoryItemType(enum.Enum):
    """Enum for inventory item types"""
    SYRINGE = "Syringe"
    SPAWN = "Spawn"
    BULK = "Bulk"
    OTHER = "Other"

class SyringeType(enum.Enum):
    """Enum for syringe types"""
    SPORE_SYRINGE = "spore syringe"
    LIQUID_CULTURE = "liquid culture"
    
# Consolidated inventory item model
class InventoryItem(Base):
    __tablename__ = "inventory_items"
    
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(64), nullable=False)
    source = Column(String(128), nullable=True)
    source_date = Column(Date, nullable=False)
    expiration_date = Column(Date, nullable=True)
    cost = Column(Float, nullable=True)
    notes = Column(String(512), nullable=True)
    in_use = Column(Boolean, default=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Foreign key to grow (nullable, as inventory items may exist without being assigned to a grow)
    grow_id = Column(Integer, ForeignKey("grows.id"), nullable=True)
    
    # Syringe-specific fields
    syringe_type = Column(String(64), nullable=True)
    volume_ml = Column(Float, nullable=True)
    species = Column(String(64), nullable=True)
    variant = Column(String(64), nullable=True)
    
    # Spawn-specific fields
    spawn_type = Column(String(64), nullable=True)
    
    # Bulk-specific fields
    bulk_type = Column(String(64), nullable=True)
    
    # Common field for both Spawn and Bulk
    amount_lbs = Column(Float, nullable=True)
    
    # Relationship with User (back reference)
    user = relationship("User", back_populates="inventory_items")
    
    # Relationship with Grow (back reference)
    grow = relationship("Grow", back_populates="inventory_items")
    
    # Helper method to check if the item is available for use in a grow
    @property
    def is_available(self):
        """Check if the inventory item is available to be used in a grow"""
        return not self.in_use

# Event listener to mark inventory items as "in use" when associated with a grow
@event.listens_for(InventoryItem, 'after_update')
def mark_inventory_in_use_after_update(mapper, connection, target):
    """Mark inventory item as in-use when associated with a grow"""
    if target.grow_id is not None:
        target.in_use = True

@event.listens_for(InventoryItem, 'after_insert')
def mark_inventory_in_use_after_insert(mapper, connection, target):
    """Mark inventory item as in-use when associated with a grow"""
    if target.grow_id is not None:
        target.in_use = True
