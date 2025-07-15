from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Dict, Any
from datetime import date, datetime, timedelta
from pydantic import BaseModel, Field

from backend.models.grow import BulkGrow
from backend.models.iot import IoTGateway
from backend.models.user import User
from backend.schemas.grow import (
    BulkGrowCreate,
    BulkGrow as BulkGrowSchema,
    BulkGrowUpdate,
    BulkGrowWithIoTGateways,
    BulkGrowComplete
)
from backend.database import get_mycomize_db, engine
from backend.security import get_current_active_user, load_config

# Create the models
from backend.models.grow import Base
Base.metadata.create_all(bind=engine)

def sanitize_stages_datetime_fields(stages_data):
    """Convert datetime objects to ISO strings in stages data for JSON serialization"""
    if not isinstance(stages_data, dict):
        return stages_data
    
    expected_stages = ['inoculation', 'spawn_colonization', 'bulk_colonization', 'fruiting', 'harvest']
    
    for stage_name, stage_data in stages_data.items():
        if stage_name not in expected_stages:
            continue
            
        if not isinstance(stage_data, dict):
            continue
            
        # Handle items list - convert datetime fields
        if 'items' in stage_data and isinstance(stage_data['items'], list):
            for item in stage_data['items']:
                if isinstance(item, dict):
                    # Convert created_date if it's a datetime
                    if 'created_date' in item and isinstance(item['created_date'], datetime):
                        item['created_date'] = item['created_date'].isoformat()
                    # Convert expiration_date if it's a datetime
                    if 'expiration_date' in item and isinstance(item['expiration_date'], datetime):
                        item['expiration_date'] = item['expiration_date'].isoformat()
    
    return stages_data

router = APIRouter(
    prefix="/grows",
    tags=["grows"],
    responses={401: {"detail": "Not authenticated"}},
)

@router.post("/", response_model=BulkGrowSchema, status_code=status.HTTP_201_CREATED)
async def create_grow(
    grow: BulkGrowCreate,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new grow for the current user"""
    # Convert stages Pydantic model to dict for JSON storage
    stages_dict = grow.stages.dict() if grow.stages else None
    
    # Sanitize datetime fields in stages data
    if stages_dict:
        stages_dict = sanitize_stages_datetime_fields(stages_dict)
    
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
        spawn_colonization_status=grow.spawn_colonization_status,
        bulk_colonization_status=grow.bulk_colonization_status,
        full_spawn_colonization_date=grow.full_spawn_colonization_date,
        full_bulk_colonization_date=grow.full_bulk_colonization_date,
        fruiting_pin_date=grow.fruiting_pin_date,
        fruiting_status=grow.fruiting_status,

        current_stage=grow.current_stage,
        status=grow.status,
        total_cost=grow.total_cost,
        stages=stages_dict,
        user_id=current_user.id
    )

    db.add(db_grow)
    db.commit()
    db.refresh(db_grow)

    return db_grow


@router.get("/", response_model=List[BulkGrowSchema])
async def read_grows(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all grows for the current user"""
    grows = db.query(BulkGrow).filter(BulkGrow.user_id == current_user.id).offset(skip).limit(limit).all()
    return grows

@router.get("/all", response_model=List[BulkGrowComplete])
async def read_all_grows(
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all grows with complete data for the current user"""
    # Query all grows for the current user with their IoT gateway relationships loaded
    grows = db.query(BulkGrow).options(joinedload(BulkGrow.iot_gateways)).filter(BulkGrow.user_id == current_user.id).all()

    return grows

@router.get("/{grow_id}", response_model=BulkGrowWithIoTGateways)
async def read_grow(
    grow_id: int,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific grow by ID with its IoT gateways"""
    grow = db.query(BulkGrow).filter(BulkGrow.id == grow_id, BulkGrow.user_id == current_user.id).first()
    if grow is None:
        raise HTTPException(status_code=404, detail="Grow not found")
    return grow


@router.put("/{grow_id}", response_model=BulkGrowSchema)
async def update_grow(
    grow_id: int,
    grow: BulkGrowUpdate,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a grow"""
    db_grow = db.query(BulkGrow).filter(BulkGrow.id == grow_id, BulkGrow.user_id == current_user.id).first()
    if db_grow is None:
        raise HTTPException(status_code=404, detail="Grow not found")

    # Update grow attributes
    grow_data = grow.dict(exclude_unset=True)
    
    # Convert stages Pydantic model to dict if present and it's not already a dict
    if 'stages' in grow_data and grow_data['stages'] is not None:
        if not isinstance(grow_data['stages'], dict):
            grow_data['stages'] = grow_data['stages'].dict()
        # Sanitize datetime fields in stages data
        grow_data['stages'] = sanitize_stages_datetime_fields(grow_data['stages'])
    
    for key, value in grow_data.items():
        setattr(db_grow, key, value)

    # If harvest_date is set, update status to harvested
    if grow_data.get('harvest_date') and not db_grow.status == 'harvested':
        db_grow.status = 'harvested'

    db.commit()
    db.refresh(db_grow)
    return db_grow

@router.delete("/{grow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_grow(
    grow_id: int,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a grow"""
    db_grow = db.query(BulkGrow).filter(BulkGrow.id == grow_id, BulkGrow.user_id == current_user.id).first()
    if db_grow is None:
        raise HTTPException(status_code=404, detail="Grow not found")

    # Check if any IoT gateways are linked to this grow
    gateways = db.query(IoTGateway).filter(IoTGateway.bulk_grow_id == grow_id).all()
    for gateway in gateways:
        gateway.bulk_grow_id = None
        gateway.is_active = False


    db.delete(db_grow)
    db.commit()
    return {"detail": "Grow deleted"}
