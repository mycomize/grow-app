import enum
from sqlalchemy import Column, Integer, String, Date, Float, Boolean, ForeignKey, event
from sqlalchemy.orm import relationship
from backend.database import Base
from backend.models.grow import MonotubGrow

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
    
# Base inventory item model containing shared attributes
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
    
    # For SQLAlchemy polymorphism
    __mapper_args__ = {
        'polymorphic_identity': 'inventory_item',
        'polymorphic_on': type
    }
    
    # Relationship with User (back reference)
    user = relationship("User", back_populates="inventory_items")
    
    # Helper method to check if the item is available for use in a grow
    @property
    def is_available(self):
        """Check if the inventory item is available to be used in a grow"""
        return not self.in_use

# Syringe inventory model
class Syringe(InventoryItem):
    __tablename__ = "syringes"
    
    id = Column(Integer, ForeignKey("inventory_items.id"), primary_key=True)
    syringe_type = Column(String(64), nullable=False) # Using string instead of enum for flexibility
    volume_ml = Column(Float, nullable=True)
    species = Column(String(64), nullable=True)
    variant = Column(String(64), nullable=True)
    
    __mapper_args__ = {
        'polymorphic_identity': 'Syringe',
    }

# Spawn inventory model
class Spawn(InventoryItem):
    __tablename__ = "spawns"
    
    id = Column(Integer, ForeignKey("inventory_items.id"), primary_key=True)
    spawn_type = Column(String(64), nullable=False)
    amount_lbs = Column(Float, nullable=False)
    
    __mapper_args__ = {
        'polymorphic_identity': 'Spawn',
    }

# Bulk substrate inventory model
class Bulk(InventoryItem):
    __tablename__ = "bulks"
    
    id = Column(Integer, ForeignKey("inventory_items.id"), primary_key=True)
    bulk_type = Column(String(64), nullable=False)
    amount_lbs = Column(Float, nullable=False)
    
    __mapper_args__ = {
        'polymorphic_identity': 'Bulk',
    }

# Event listener to mark inventory items as "in use" when associated with a grow
@event.listens_for(MonotubGrow, 'after_insert')
def mark_inventory_in_use(mapper, connection, target):
    """Mark inventory items as in-use when associated with a grow"""
    # Update the in_use flag for the associated inventory items
    connection.execute(
        InventoryItem.__table__.update().
        where(InventoryItem.id == target.syringe_id).
        values(in_use=True)
    )
    connection.execute(
        InventoryItem.__table__.update().
        where(InventoryItem.id == target.spawn_id).
        values(in_use=True)
    )
    connection.execute(
        InventoryItem.__table__.update().
        where(InventoryItem.id == target.bulk_id).
        values(in_use=True)
    )
