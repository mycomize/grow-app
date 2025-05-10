from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Union
from datetime import datetime

from backend.models.inventory import InventoryItem, Syringe, Spawn, Bulk
from backend.models.user import User
from backend.schemas.inventory import (
    SyringeCreate, Syringe as SyringeSchema, SyringeUpdate,
    SpawnCreate, Spawn as SpawnSchema, SpawnUpdate, 
    BulkCreate, Bulk as BulkSchema, BulkUpdate,
)
from backend.database import get_grow_db, grow_engine
from backend.security import get_current_active_user

# Create the models
from backend.models.inventory import Base
Base.metadata.create_all(bind=grow_engine)

router = APIRouter(
    prefix="/inventory",
    tags=["inventory"],
    responses={401: {"detail": "Not authenticated"}},
)

# COMMON HELPER FUNCTIONS

def check_item_availability(db: Session, item_id: int, item_type: str):
    """Check if an inventory item is available (not in use)"""
    # Query the appropriate table based on item type
    if item_type == "syringe":
        item = db.query(Syringe).filter(Syringe.id == item_id).first()
    elif item_type == "spawn":
        item = db.query(Spawn).filter(Spawn.id == item_id).first()
    elif item_type == "bulk":
        item = db.query(Bulk).filter(Bulk.id == item_id).first()
    else:
        raise ValueError(f"Invalid item type: {item_type}")
    
    if not item:
        return False
    
    return not item.in_use

# === SYRINGE ROUTES ===

@router.post("/syringe", response_model=SyringeSchema, status_code=status.HTTP_201_CREATED)
async def create_syringe(
    syringe: SyringeCreate, 
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_active_user)
):
    print(f"Creating syringe: {syringe}") 
    """Create a new syringe inventory item"""
    db_syringe = Syringe(
        type="Syringe",
        source=syringe.source,
        source_date=syringe.source_date,
        expiration_date=syringe.expiration_date,
        cost=syringe.cost,
        notes=syringe.notes,
        syringe_type=syringe.syringe_type,
        volume_ml=syringe.volume_ml,
        species=syringe.species,
        variant=syringe.variant,
        in_use=False,
        user_id=current_user.id
    )
    
    db.add(db_syringe)
    db.commit()
    db.refresh(db_syringe)
    
    return db_syringe

@router.get("/syringe", response_model=List[SyringeSchema])
async def read_syringes(
    skip: int = 0, 
    limit: int = 100, 
    available_only: bool = False,
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all syringes for the current user"""
    query = db.query(Syringe).filter(Syringe.user_id == current_user.id)
    
    if available_only:
        query = query.filter(Syringe.in_use == False)
        
    syringes = query.offset(skip).limit(limit).all()
    return syringes

@router.get("/syringe/{syringe_id}", response_model=SyringeSchema)
async def read_syringe(
    syringe_id: int, 
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific syringe by ID"""
    syringe = db.query(Syringe).filter(Syringe.id == syringe_id, Syringe.user_id == current_user.id).first()
    if syringe is None:
        raise HTTPException(status_code=404, detail="Syringe not found")
    return syringe

@router.put("/syringe/{syringe_id}", response_model=SyringeSchema)
async def update_syringe(
    syringe_id: int, 
    syringe: SyringeUpdate, 
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a syringe"""
    db_syringe = db.query(Syringe).filter(Syringe.id == syringe_id, Syringe.user_id == current_user.id).first()
    if db_syringe is None:
        raise HTTPException(status_code=404, detail="Syringe not found")
    
    # Prevent updating items that are in use
    if db_syringe.in_use and any(field not in ['notes'] for field in syringe.dict(exclude_unset=True)):
        raise HTTPException(
            status_code=400, 
            detail="Cannot update a syringe that is in use, except for notes"
        )
    
    # Update syringe attributes
    syringe_data = syringe.dict(exclude_unset=True)
    for key, value in syringe_data.items():
        setattr(db_syringe, key, value)
    
    db.commit()
    db.refresh(db_syringe)
    return db_syringe

@router.delete("/syringe/{syringe_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_syringe(
    syringe_id: int, 
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a syringe"""
    db_syringe = db.query(Syringe).filter(Syringe.id == syringe_id, Syringe.user_id == current_user.id).first()
    if db_syringe is None:
        raise HTTPException(status_code=404, detail="Syringe not found")
    
    # Prevent deleting items that are in use
    if db_syringe.in_use:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete a syringe that is in use by a grow"
        )
    
    db.delete(db_syringe)
    db.commit()
    return {"detail": "Syringe deleted"}

# === SPAWN ROUTES ===

@router.post("/spawn", response_model=SpawnSchema, status_code=status.HTTP_201_CREATED)
async def create_spawn(
    spawn: SpawnCreate, 
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new spawn inventory item"""
    db_spawn = Spawn(
        type="Spawn",
        source=spawn.source,
        source_date=spawn.source_date,
        expiration_date=spawn.expiration_date,
        cost=spawn.cost,
        notes=spawn.notes,
        spawn_type=spawn.spawn_type,
        amount_lbs=spawn.amount_lbs,
        in_use=False,
        user_id=current_user.id
    )
    
    db.add(db_spawn)
    db.commit()
    db.refresh(db_spawn)
    
    return db_spawn

@router.get("/spawn", response_model=List[SpawnSchema])
async def read_spawns(
    skip: int = 0, 
    limit: int = 100, 
    available_only: bool = False,
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all spawns for the current user"""
    query = db.query(Spawn).filter(Spawn.user_id == current_user.id)
    
    if available_only:
        query = query.filter(Spawn.in_use == False)
        
    spawns = query.offset(skip).limit(limit).all()
    return spawns

@router.get("/spawn/{spawn_id}", response_model=SpawnSchema)
async def read_spawn(
    spawn_id: int, 
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific spawn by ID"""
    spawn = db.query(Spawn).filter(Spawn.id == spawn_id, Spawn.user_id == current_user.id).first()
    if spawn is None:
        raise HTTPException(status_code=404, detail="Spawn not found")
    return spawn

@router.put("/spawn/{spawn_id}", response_model=SpawnSchema)
async def update_spawn(
    spawn_id: int, 
    spawn: SpawnUpdate, 
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a spawn"""
    db_spawn = db.query(Spawn).filter(Spawn.id == spawn_id, Spawn.user_id == current_user.id).first()
    if db_spawn is None:
        raise HTTPException(status_code=404, detail="Spawn not found")
    
    # Prevent updating items that are in use
    if db_spawn.in_use and any(field not in ['notes'] for field in spawn.dict(exclude_unset=True)):
        raise HTTPException(
            status_code=400, 
            detail="Cannot update spawn that is in use, except for notes"
        )
    
    # Update spawn attributes
    spawn_data = spawn.dict(exclude_unset=True)
    for key, value in spawn_data.items():
        setattr(db_spawn, key, value)
    
    db.commit()
    db.refresh(db_spawn)
    return db_spawn

@router.delete("/spawn/{spawn_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_spawn(
    spawn_id: int, 
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a spawn"""
    db_spawn = db.query(Spawn).filter(Spawn.id == spawn_id, Spawn.user_id == current_user.id).first()
    if db_spawn is None:
        raise HTTPException(status_code=404, detail="Spawn not found")
    
    # Prevent deleting items that are in use
    if db_spawn.in_use:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete spawn that is in use by a grow"
        )
    
    db.delete(db_spawn)
    db.commit()
    return {"detail": "Spawn deleted"}

# === BULK ROUTES ===

@router.post("/bulk", response_model=BulkSchema, status_code=status.HTTP_201_CREATED)
async def create_bulk(
    bulk: BulkCreate, 
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new bulk substrate inventory item"""
    db_bulk = Bulk(
        type="Bulk",
        source=bulk.source,
        source_date=bulk.source_date,
        expiration_date=bulk.expiration_date,
        cost=bulk.cost,
        notes=bulk.notes,
        bulk_type=bulk.bulk_type,
        amount_lbs=bulk.amount_lbs,
        in_use=False,
        user_id=current_user.id
    )
    
    db.add(db_bulk)
    db.commit()
    db.refresh(db_bulk)
    
    return db_bulk

@router.get("/bulk", response_model=List[BulkSchema])
async def read_bulks(
    skip: int = 0, 
    limit: int = 100, 
    available_only: bool = False,
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all bulk substrates for the current user"""
    query = db.query(Bulk).filter(Bulk.user_id == current_user.id)
    
    if available_only:
        query = query.filter(Bulk.in_use == False)
        
    bulks = query.offset(skip).limit(limit).all()
    return bulks

@router.get("/bulk/{bulk_id}", response_model=BulkSchema)
async def read_bulk(
    bulk_id: int, 
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific bulk substrate by ID"""
    bulk = db.query(Bulk).filter(Bulk.id == bulk_id, Bulk.user_id == current_user.id).first()
    if bulk is None:
        raise HTTPException(status_code=404, detail="Bulk substrate not found")
    return bulk

@router.put("/bulk/{bulk_id}", response_model=BulkSchema)
async def update_bulk(
    bulk_id: int, 
    bulk: BulkUpdate, 
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a bulk substrate"""
    db_bulk = db.query(Bulk).filter(Bulk.id == bulk_id, Bulk.user_id == current_user.id).first()
    if db_bulk is None:
        raise HTTPException(status_code=404, detail="Bulk substrate not found")
    
    # Prevent updating items that are in use
    if db_bulk.in_use and any(field not in ['notes'] for field in bulk.dict(exclude_unset=True)):
        raise HTTPException(
            status_code=400, 
            detail="Cannot update bulk substrate that is in use, except for notes"
        )
    
    # Update bulk attributes
    bulk_data = bulk.dict(exclude_unset=True)
    for key, value in bulk_data.items():
        setattr(db_bulk, key, value)
    
    db.commit()
    db.refresh(db_bulk)
    return db_bulk

@router.delete("/bulk/{bulk_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bulk(
    bulk_id: int, 
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a bulk substrate"""
    db_bulk = db.query(Bulk).filter(Bulk.id == bulk_id, Bulk.user_id == current_user.id).first()
    if db_bulk is None:
        raise HTTPException(status_code=404, detail="Bulk substrate not found")
    
    # Prevent deleting items that are in use
    if db_bulk.in_use:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete bulk substrate that is in use by a grow"
        )
    
    db.delete(db_bulk)
    db.commit()
    return {"detail": "Bulk substrate deleted"}

# === GENERAL INVENTORY ROUTES ===

@router.get("/available", response_model=dict)
async def get_available_inventory(
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all available inventory items for creating a grow"""
    syringes = db.query(Syringe).filter(
        Syringe.user_id == current_user.id,
        Syringe.in_use == False
    ).all()
    
    spawns = db.query(Spawn).filter(
        Spawn.user_id == current_user.id,
        Spawn.in_use == False
    ).all()
    
    bulks = db.query(Bulk).filter(
        Bulk.user_id == current_user.id,
        Bulk.in_use == False
    ).all()
    
    return {
        "syringes": syringes,
        "spawns": spawns,
        "bulks": bulks
    }