from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Dict, Any, Optional
from datetime import date, datetime, timedelta
from pydantic import BaseModel, Field

from backend.models.grow import BulkGrow, BulkGrowFlush
from backend.models.iot import IoTGateway
from backend.models.user import User
from backend.schemas.grow import (
    BulkGrowCreate,
    BulkGrow as BulkGrowSchema,
    BulkGrowUpdate,
    BulkGrowWithIoTEntities,
    BulkGrowComplete,
    BulkGrowFlushCreate
)
from backend.database import get_mycomize_db, engine
from backend.security import get_current_paid_user, load_config

# Create the models
from backend.models.grow import Base
Base.metadata.create_all(bind=engine)

router = APIRouter(
    prefix="/grows",
    tags=["grows"],
    responses={401: {"detail": "Not authenticated"}},
)

# Extended create schema to include flushes
class BulkGrowCreateWithFlushes(BulkGrowCreate):
    flushes: Optional[List[dict]] = []

@router.post("/", response_model=BulkGrowSchema, status_code=status.HTTP_201_CREATED)
async def create_grow(
    grow: BulkGrowCreateWithFlushes,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_paid_user)
):
    """Create a new grow for the current user"""
    # Create the grow
    db_grow = BulkGrow(
        name=grow.name,
        description=grow.description,
        species=grow.species,
        variant=grow.variant,
        location=grow.location,
        tags=grow.tags,

        inoculation_date=grow.inoculation_date,
        inoculation_status=grow.inoculation_status,
        spawn_start_date=grow.spawn_start_date,
        spawn_colonization_status=grow.spawn_colonization_status,
        bulk_start_date=grow.bulk_start_date,
        bulk_colonization_status=grow.bulk_colonization_status,
        fruiting_start_date=grow.fruiting_start_date,
        fruiting_status=grow.fruiting_status,
        full_spawn_colonization_date=grow.full_spawn_colonization_date,
        full_bulk_colonization_date=grow.full_bulk_colonization_date,
        fruiting_pin_date=grow.fruiting_pin_date,
        harvest_completion_date=grow.harvest_completion_date,
        s2b_ratio=grow.s2b_ratio,

        current_stage=grow.current_stage,
        status=grow.status,
        total_cost=grow.total_cost,
        stages=grow.stages,
        user_id=current_user.id
    )

    db.add(db_grow)
    db.commit()
    db.refresh(db_grow)

    # Handle flushes if provided - store encrypted values directly
    if grow.flushes:
        for flush_data in grow.flushes:
            db_flush = BulkGrowFlush(
                bulk_grow_id=db_grow.id,
                # Store encrypted leaf values directly without processing
                harvest_date=flush_data.get('harvest_date'),
                wet_yield_grams=flush_data.get('wet_yield_grams'),
                dry_yield_grams=flush_data.get('dry_yield_grams'),
                concentration_mg_per_gram=flush_data.get('concentration_mg_per_gram')
            )
            db.add(db_flush)
        db.commit()

    return db_grow


@router.get("/", response_model=List[BulkGrowSchema])
async def read_grows(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_paid_user)
):
    """Get all grows for the current user"""
    grows = db.query(BulkGrow).filter(BulkGrow.user_id == current_user.id).offset(skip).limit(limit).all()
    return grows

@router.get("/with-iot", response_model=List[BulkGrowWithIoTEntities])
async def read_grows_with_iot(
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_paid_user)
):
    """Get all grows with IoT entities (but no flushes) for the current user"""
    # Query all grows for the current user with their IoT entities relationships loaded
    grows = db.query(BulkGrow).options(
        joinedload(BulkGrow.iot_entities)
    ).filter(BulkGrow.user_id == current_user.id).all()
    return grows

@router.get("/all", response_model=List[BulkGrowComplete])
async def read_all_grows(
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_paid_user)
):
    """Get all grows with complete data for the current user"""
    # Query all grows for the current user with their IoT entities and flushes relationships loaded
    grows = db.query(BulkGrow).options(
        joinedload(BulkGrow.iot_entities),
        joinedload(BulkGrow.flushes)
    ).filter(BulkGrow.user_id == current_user.id).all()
    return grows

@router.get("/{grow_id}", response_model=BulkGrowComplete)
async def read_grow(
    grow_id: int,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_paid_user)
):
    """Get a specific grow by ID with its IoT entities and flushes"""
    grow = db.query(BulkGrow).options(
        joinedload(BulkGrow.iot_entities),
        joinedload(BulkGrow.flushes)
    ).filter(BulkGrow.id == grow_id, BulkGrow.user_id == current_user.id).first()

    if grow is None:
        raise HTTPException(status_code=404, detail="Grow not found")

    return grow


# Extended update schema to include flushes
class BulkGrowUpdateWithFlushes(BulkGrowUpdate):
    flushes: Optional[List[dict]] = None

@router.put("/{grow_id}", response_model=BulkGrowSchema)
async def update_grow(
    grow_id: int,
    grow: BulkGrowUpdateWithFlushes,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_paid_user)
):
    """Update a grow"""
    db_grow = db.query(BulkGrow).filter(BulkGrow.id == grow_id, BulkGrow.user_id == current_user.id).first()
    if db_grow is None:
        raise HTTPException(status_code=404, detail="Grow not found")

    # Update grow attributes
    grow_data = grow.dict(exclude_unset=True)
    
    # Handle flushes separately
    flushes_data = grow_data.pop('flushes', None)
    
    # Since data arrives encrypted, store stages directly as encrypted string
    for key, value in grow_data.items():
        setattr(db_grow, key, value)

    # Handle flushes if provided - store encrypted values directly
    if flushes_data is not None:
        # Delete existing flushes
        db.query(BulkGrowFlush).filter(BulkGrowFlush.bulk_grow_id == grow_id).delete()
        
        # Add new flushes - store encrypted leaf values directly without processing
        for flush_data in flushes_data:
            db_flush = BulkGrowFlush(
                bulk_grow_id=grow_id,
                harvest_date=flush_data.get('harvest_date'),
                wet_yield_grams=flush_data.get('wet_yield_grams'),
                dry_yield_grams=flush_data.get('dry_yield_grams'),
                concentration_mg_per_gram=flush_data.get('concentration_mg_per_gram')
            )
            db.add(db_flush)

    db.commit()
    db.refresh(db_grow)
    return db_grow

@router.delete("/{grow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_grow(
    grow_id: int,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_paid_user)
):
    """Delete a grow"""
    db_grow = db.query(BulkGrow).filter(BulkGrow.id == grow_id, BulkGrow.user_id == current_user.id).first()
    if db_grow is None:
        raise HTTPException(status_code=404, detail="Grow not found")

    # Unassign any IoT entities that are linked to this grow
    from backend.models.iot_entity import IoTEntity
    entities = db.query(IoTEntity).filter(IoTEntity.linked_grow_id == grow_id).all()
    for entity in entities:
        entity.linked_grow_id = None
        entity.linked_stage = None


    db.delete(db_grow)
    db.commit()
    return {"detail": "Grow deleted"}
