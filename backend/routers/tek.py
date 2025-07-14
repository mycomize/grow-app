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
    BulkGrowTekListItem,
)
from backend.security import get_current_user

# Create the models
from backend.models.tek import Base
Base.metadata.create_all(bind=engine)

router = APIRouter(prefix="/bulk-grow-tek", tags=["bulk-grow-teks"])

@router.get("/public", response_model=List[BulkGrowTekListItem])
async def get_public_templates(
    species: Optional[str] = Query(None),
    search_term: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    sort_by: str = Query("usage_count", pattern="^(usage_count|created_at|name)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_mycomize_db)
):
    """Get public bulk_grow teks with search and filtering"""
    query = db.query(BulkGrowTek).filter(BulkGrowTek.is_public == True)

    # Apply filters
    if species:
        query = query.filter(BulkGrowTek.species.ilike(f"%{species}%"))
    if search_term:
        query = query.filter(
            or_(
                BulkGrowTek.name.ilike(f"%{search_term}%"),
                BulkGrowTek.description.ilike(f"%{search_term}%")
            )
        )

    # Apply sorting
    sort_column = getattr(BulkGrowTek, sort_by)
    if sort_order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))

    # Join with user to get creator name
    teks = query.options(joinedload(BulkGrowTek.creator)).offset(offset).limit(limit).all()

    # Convert to response format
    result = []
    for tek in teks:
        tek_dict = {
            "id": tek.id,
            "name": tek.name,
            "description": tek.description,
            "species": tek.species,
            "variant": tek.variant,
            "tags": tek.tags,
            "is_public": tek.is_public,
            "created_by": tek.created_by,
            "created_at": tek.created_at,
            "usage_count": tek.usage_count,
            "creator_name": tek.creator.username if tek.creator else "Unknown",
            "creator_profile_image": tek.creator.profile_image if tek.creator else None
        }
        result.append(BulkGrowTekListItem(**tek_dict))

    return result

@router.get("/my", response_model=List[BulkGrowTekListItem])
async def get_my_teks(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's bulk_grow teks"""
    teks = db.query(BulkGrowTek).filter(
        BulkGrowTek.created_by == current_user.id
    ).order_by(desc(BulkGrowTek.updated_at)).offset(offset).limit(limit).all()

    result = []
    for tek in teks:
        tek_dict = {
            "id": tek.id,
            "name": tek.name,
            "description": tek.description,
            "species": tek.species,
            "variant": tek.variant,
            "tags": tek.tags,
            "is_public": tek.is_public,
            "created_by": tek.created_by,
            "created_at": tek.created_at,
            "usage_count": tek.usage_count,
            "creator_name": current_user.username,
            "creator_profile_image": current_user.profile_image
        }
        result.append(BulkGrowTekListItem(**tek_dict))

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
        "usage_count": tek.usage_count,
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
        raise HTTPException(status_code=404, detail="Template not found")

    # Check access permissions
    if not tek.is_public and tek.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    result_dict = {
        "id": tek.id,
        "name": tek.name,
        "description": tek.description,
        "species": tek.species,
        "variant": tek.variant,
        "type": tek.type,
        "is_public": tek.is_public,
        "stages": tek.stages,
        "created_by": tek.created_by,
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
        raise HTTPException(status_code=404, detail="Template not found")

    if tek.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Update fields
    update_data = tek_data.dict(exclude_unset=True)
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
        "created_by": tek.created_by,
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
