from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date

from backend.models.grow import Grow
from backend.models.user import User
from backend.schemas.grow import GrowCreate, Grow as GrowSchema, GrowUpdate
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
    db_grow = Grow(
        species=grow.species,
        variant=grow.variant,
        inoculation_date=grow.inoculation_date,
        spawn_substrate=grow.spawn_substrate,
        bulk_substrate=grow.bulk_substrate,
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

@router.get("/{grow_id}", response_model=GrowSchema)
async def read_grow(
    grow_id: int, 
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific grow by ID"""
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
    
    db.delete(db_grow)
    db.commit()
    return {"detail": "Grow deleted"}
