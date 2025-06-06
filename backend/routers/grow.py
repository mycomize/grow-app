from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import date

from backend.models.grow import Grow
from backend.models.iot import IoTGateway
from backend.models.user import User
from backend.schemas.grow import (
    GrowCreate,
    Grow as GrowSchema,
    GrowUpdate,
    GrowWithIoTGateways,
    GrowComplete
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


@router.post("/", response_model=GrowSchema, status_code=status.HTTP_201_CREATED)
async def create_grow(
    grow: GrowCreate,
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new grow for the current user"""
    # Create the grow
    db_grow = Grow(
        name=grow.name,
        species=grow.species,
        variant=grow.variant,
        inoculation_date=grow.inoculation_date,
        tek=grow.tek,
        stage=grow.stage,
        status=grow.status,
        notes=grow.notes,
        cost=grow.cost,
        harvest_date=grow.harvest_date,
        harvest_dry_weight_grams=grow.harvest_dry_weight_grams,
        harvest_wet_weight_grams=grow.harvest_wet_weight_grams,
        user_id=current_user.id
    )

    db.add(db_grow)
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

@router.get("/all", response_model=List[GrowComplete])
async def read_all_grows(
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all grows with complete data for the current user"""
    # Query all grows for the current user with their IoT gateway relationships loaded
    grows = db.query(Grow).options(joinedload(Grow.iot_gateways)).filter(Grow.user_id == current_user.id).all()

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

    # If harvest_date is set, update status to harvested
    if grow_data.get('harvest_date') and not db_grow.status == 'harvested':
        db_grow.status = 'harvested'

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
