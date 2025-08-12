from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc, asc
from typing import List, Optional
from datetime import datetime

from backend.database import get_mycomize_db, engine
from backend.models.tek import BulkGrowTek
from backend.models.user import User
from backend.schemas.tek import (
    BulkGrowTek as BulkGrowTekSchema,
    BulkGrowTekCreate,
    BulkGrowTekUpdate,
)
from backend.security import get_current_user

# Create the models
from backend.models.tek import Base
Base.metadata.create_all(bind=engine)

router = APIRouter(prefix="/bulk-grow-tek", tags=["bulk-grow-teks"])

@router.get("/", response_model=List[BulkGrowTekSchema])
async def get_all_teks(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_user)
):
    """Get all teks (public teks + current user's private teks)"""
    # Get public teks and user's own teks
    teks = db.query(BulkGrowTek).filter(
        or_(
            BulkGrowTek.is_public == True,
            BulkGrowTek.created_by == current_user.id
        )
    ).options(joinedload(BulkGrowTek.creator)).order_by(
        desc(BulkGrowTek.updated_at)
    ).offset(offset).limit(limit).all()

    result = []
    for tek in teks:
        tek_dict = {
            "id": tek.id,
            "created_at": tek.created_at,
            "creator_name": tek.creator.username if tek.creator else "Unknown",
            "creator_profile_image": tek.creator.profile_image if tek.creator else None,
            "name": tek.name,
            "description": tek.description,
            "species": tek.species,
            "variant": tek.variant,
            "tags": tek.tags,
            "stages": tek.stages,
            "is_public": tek.is_public,
        }
        result.append(BulkGrowTekSchema(**tek_dict))

    return result

@router.post("/", response_model=BulkGrowTekSchema)
async def create_tek(
    tek_data: BulkGrowTekCreate,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new bulk_grow tek"""
    tek_dict = tek_data.dict()
    tek_dict["created_by"] = current_user.id
    tek = BulkGrowTek(**tek_dict)

    db.add(tek)
    db.commit()
    db.refresh(tek)

    # Return with creator name
    result_dict = {
        **tek_dict,
        "id": tek.id,
        "created_at": tek.created_at,
        "updated_at": tek.updated_at,
        "creator_name": current_user.username
    }

    return BulkGrowTekSchema(**result_dict)

@router.get("/{tek_id}", response_model=BulkGrowTekSchema)
async def get_tek(
    tek_id: int,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific bulk_grow tek"""
    tek = db.query(BulkGrowTek).options(joinedload(BulkGrowTek.creator)).filter(
        BulkGrowTek.id == tek_id
    ).first()

    if not tek:
        raise HTTPException(status_code=404, detail="Tek not found")

    # Check access permissions
    if not tek.is_public and tek.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    result_dict = {
        "id": tek.id,
        "name": tek.name,
        "description": tek.description,
        "species": tek.species,
        "variant": tek.variant,
        "tags": tek.tags,
        "is_public": tek.is_public,
        "stages": tek.stages,
        "created_at": tek.created_at,
        "updated_at": tek.updated_at,
        "usage_count": tek.usage_count,
        "creator_name": tek.creator.username if tek.creator else "Unknown"
    }

    return BulkGrowTekSchema(**result_dict)

@router.put("/{tek_id}", response_model=BulkGrowTekSchema)
async def update_tek(
    tek_id: int,
    tek_data: BulkGrowTekUpdate,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_user)
):
    """Update a bulk_grow tek"""
    tek = db.query(BulkGrowTek).filter(BulkGrowTek.id == tek_id).first()

    if not tek:
        raise HTTPException(status_code=404, detail="Tek not found")

    if tek.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Update fields
    update_data = tek_data.dict(exclude_unset=True)
    
    # Validate one-way public transition: once public, always public
    if 'is_public' in update_data:
        if tek.is_public and not update_data['is_public']:
            raise HTTPException(
                status_code=400, 
                detail="Public teks cannot be made private again. Once public, a tek remains public."
            )
    
    for field, value in update_data.items():
        setattr(tek, field, value)

    tek.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(tek)

    # Return updated tek
    result_dict = {
        "id": tek.id,
        "name": tek.name,
        "description": tek.description,
        "species": tek.species,
        "variant": tek.variant,
        "tags": tek.tags,
        "is_public": tek.is_public,
        "stages": tek.stages,
        "created_at": tek.created_at,
        "updated_at": tek.updated_at,
        "usage_count": tek.usage_count,
        "creator_name": current_user.username
    }

    return BulkGrowTekSchema(**result_dict)

@router.delete("/{tek_id}")
async def delete_tek(
    tek_id: int,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a bulk_grow tek"""
    tek = db.query(BulkGrowTek).filter(BulkGrowTek.id == tek_id).first()

    if not tek:
        raise HTTPException(status_code=404, detail="Template not found")

    if tek.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    db.delete(tek)
    db.commit()

    return {"message": "Template deleted successfully"}
