from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from pydantic import BaseModel

from backend.models.grow import Grow, GrowType, MonotubGrow
from backend.models.iot import IoTGateway
from backend.models.inventory import InventoryItem
from backend.models.user import User
from backend.schemas.grow import (
    GrowCreate, 
    Grow as GrowSchema, 
    GrowUpdate,
    GrowWithIoTGateways
)
from backend.database import get_grow_db, grow_engine
from backend.security import get_current_active_user

# Create the models
from backend.models.grow import Base
Base.metadata.create_all(bind=grow_engine)

router = APIRouter(
    prefix="/grows",
    tags=["grows"],
    responses={401: {"detail": "Not authenticated"}},
)

# Additional schema for creating a Monotub grow with inventory items
class MonotubGrowCreate(BaseModel):
    syringe_id: int
    spawn_id: int
    bulk_id: int

@router.post("/", response_model=GrowSchema, status_code=status.HTTP_201_CREATED)
async def create_grow(
    grow: GrowCreate, 
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new grow for the current user"""
    # Create the grow
    db_grow = Grow(
        species=grow.species,
        variant=grow.variant,
        inoculation_date=grow.inoculation_date,
        type=GrowType(grow.type),
        notes=grow.notes,
        user_id=current_user.id
    )
    
    db.add(db_grow)
    db.commit()
    db.refresh(db_grow)
    
    return db_grow

@router.post("/{grow_id}/monotub", response_model=GrowSchema, status_code=status.HTTP_201_CREATED)
async def create_monotub_grow(
    grow_id: int,
    monotub: MonotubGrowCreate,
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_active_user)
):
    """Associate inventory items with a monotub grow"""
    # Check if grow exists and belongs to user
    db_grow = db.query(Grow).filter(Grow.id == grow_id, Grow.user_id == current_user.id).first()
    if db_grow is None:
        raise HTTPException(status_code=404, detail="Grow not found")
    
    # Check if grow is of type monotub
    if db_grow.type != GrowType.MONOTUB.value:
        raise HTTPException(status_code=400, detail="Grow is not of type monotub")
    
    # Check if monotub already exists for this grow
    if db.query(MonotubGrow).filter(MonotubGrow.grow_id == grow_id).first():
        raise HTTPException(status_code=400, detail="Monotub grow already exists for this grow")
    
    # Check if inventory items exist and belong to user
    syringe = db.query(InventoryItem).filter(
        InventoryItem.id == monotub.syringe_id,
        InventoryItem.user_id == current_user.id,
        InventoryItem.type == "Syringe"
    ).first()
    if syringe is None:
        raise HTTPException(status_code=404, detail="Syringe not found")
    
    spawn = db.query(InventoryItem).filter(
        InventoryItem.id == monotub.spawn_id,
        InventoryItem.user_id == current_user.id,
        InventoryItem.type == "Spawn"
    ).first()
    if spawn is None:
        raise HTTPException(status_code=404, detail="Spawn not found")
    
    bulk = db.query(InventoryItem).filter(
        InventoryItem.id == monotub.bulk_id,
        InventoryItem.user_id == current_user.id,
        InventoryItem.type == "Bulk"
    ).first()
    if bulk is None:
        raise HTTPException(status_code=404, detail="Bulk substrate not found")
    
    # Check if inventory items are available (not in use)
    if syringe.in_use:
        raise HTTPException(status_code=400, detail="Syringe is already in use")
    if spawn.in_use:
        raise HTTPException(status_code=400, detail="Spawn is already in use")
    if bulk.in_use:
        raise HTTPException(status_code=400, detail="Bulk substrate is already in use")
    
    # Create MonotubGrow
    db_monotub = MonotubGrow(
        grow_id=grow_id,
        syringe_id=monotub.syringe_id,
        spawn_id=monotub.spawn_id,
        bulk_id=monotub.bulk_id
    )
    
    db.add(db_monotub)
    
    # Mark inventory items as in use
    syringe.in_use = True
    spawn.in_use = True
    bulk.in_use = True
    
    db.commit()
    db.refresh(db_grow)
    
    return db_grow

@router.get("/", response_model=List[GrowSchema])
async def read_grows(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all grows for the current user"""
    grows = db.query(Grow).filter(Grow.user_id == current_user.id).offset(skip).limit(limit).all()
    return grows

@router.get("/{grow_id}", response_model=GrowWithIoTGateways)
async def read_grow(
    grow_id: int, 
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific grow by ID with its IoT gateways"""
    grow = db.query(Grow).filter(Grow.id == grow_id, Grow.user_id == current_user.id).first()
    if grow is None:
        raise HTTPException(status_code=404, detail="Grow not found")
    return grow

@router.put("/{grow_id}", response_model=GrowSchema)
async def update_grow(
    grow_id: int, 
    grow: GrowUpdate, 
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a grow"""
    db_grow = db.query(Grow).filter(Grow.id == grow_id, Grow.user_id == current_user.id).first()
    if db_grow is None:
        raise HTTPException(status_code=404, detail="Grow not found")
    
    # Update grow attributes
    grow_data = grow.dict(exclude_unset=True)
    for key, value in grow_data.items():
        setattr(db_grow, key, value)
    
    db.commit()
    db.refresh(db_grow)
    return db_grow

@router.delete("/{grow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_grow(
    grow_id: int, 
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a grow"""
    db_grow = db.query(Grow).filter(Grow.id == grow_id, Grow.user_id == current_user.id).first()
    if db_grow is None:
        raise HTTPException(status_code=404, detail="Grow not found")
    
    # Check if any IoT gateways are linked to this grow
    gateways = db.query(IoTGateway).filter(IoTGateway.grow_id == grow_id).all()
    for gateway in gateways:
        gateway.grow_id = None
        gateway.is_active = False
    
    db.delete(db_grow)
    db.commit()
    return {"detail": "Grow deleted"}
