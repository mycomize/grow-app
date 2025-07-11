from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from backend.models.inventory import InventoryItem
from backend.models.user import User
from backend.schemas.inventory import (
    InventoryItemCreate, 
    InventoryItem as InventoryItemSchema, 
    InventoryItemUpdate,
)
from backend.database import get_mycomize_db, engine
from backend.security import get_current_active_user

# Create the models
from backend.models.inventory import Base
Base.metadata.create_all(bind=engine)

router = APIRouter(
    prefix="/inventory",
    tags=["inventory"],
    responses={401: {"detail": "Not authenticated"}},
)

# === CONSOLIDATED INVENTORY ROUTES ===

@router.post("/item", response_model=InventoryItemSchema, status_code=status.HTTP_201_CREATED)
async def create_inventory_item(
    item: InventoryItemCreate, 
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new inventory item"""
    db_item = InventoryItem(
        type=item.type,
        source=item.source,
        source_date=item.source_date,
        expiration_date=item.expiration_date,
        cost=item.cost,
        notes=item.notes,
        # Type-specific fields - only set if relevant
        syringe_type=item.syringe_type if item.type == "Syringe" else None,
        volume_ml=item.volume_ml if item.type == "Syringe" else None,
        species=item.species if item.type == "Syringe" else None,
        variant=item.variant if item.type == "Syringe" else None,
        spawn_type=item.spawn_type if item.type == "Spawn" else None,
        bulk_type=item.bulk_type if item.type == "Bulk" else None,
        amount_lbs=item.amount_lbs if item.type in ["Spawn", "Bulk"] else None,
        in_use=False,
        user_id=current_user.id
    )
    
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    
    return db_item

@router.get("/item", response_model=List[InventoryItemSchema])
async def read_inventory_items(
    skip: int = 0, 
    limit: int = 100, 
    item_type: str = None,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get inventory items for the current user with optional type filtering"""
    query = db.query(InventoryItem).filter(InventoryItem.user_id == current_user.id)
    
    if item_type:
        query = query.filter(InventoryItem.type == item_type)
        
    items = query.offset(skip).limit(limit).all()
    return items

@router.get("/item/{item_id}", response_model=InventoryItemSchema)
async def read_inventory_item(
    item_id: int, 
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific inventory item by ID"""
    item = db.query(InventoryItem).filter(
        InventoryItem.id == item_id, 
        InventoryItem.user_id == current_user.id
    ).first()
    
    if item is None:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    
    return item

@router.put("/item/{item_id}", response_model=InventoryItemSchema)
async def update_inventory_item(
    item_id: int, 
    item_update: InventoryItemUpdate, 
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update an inventory item"""
    db_item = db.query(InventoryItem).filter(
        InventoryItem.id == item_id, 
        InventoryItem.user_id == current_user.id
    ).first()
    
    if db_item is None:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    
    # Update item attributes
    update_data = item_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_item, key, value)
    
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/item/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_inventory_item(
    item_id: int, 
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete an inventory item"""
    db_item = db.query(InventoryItem).filter(
        InventoryItem.id == item_id, 
        InventoryItem.user_id == current_user.id
    ).first()
    
    if db_item is None:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    
    db.delete(db_item)
    db.commit()
    return {"detail": "Inventory item deleted"}

# === HELPER ROUTES ===

@router.get("/all", response_model=List[InventoryItemSchema])
async def read_all_items(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all inventory items for the current user"""
    query = db.query(InventoryItem).filter(InventoryItem.user_id == current_user.id)
    
    items = query.offset(skip).limit(limit).all()
    return items
