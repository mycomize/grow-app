from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc, asc, func
from typing import List, Optional
from datetime import datetime

from backend.database import get_mycomize_db, engine
from backend.models.tek import BulkGrowTek
from backend.models.tek_engagement import TekLike, TekView, TekImport
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
    ).options(joinedload(BulkGrowTek.creator)).offset(offset).limit(limit).all()

    result = []
    for tek in teks:
        # Get engagement counts and user state
        counts = get_engagement_counts(db, tek.id)
        engagement_state = get_user_engagement_state(db, tek.id, current_user.id)
        
        tek_dict = {
            "id": tek.id,
            "creator_name": tek.creator.username if tek.creator else "Unknown",
            "creator_profile_image": tek.creator.profile_image if tek.creator else None,
            "name": tek.name,
            "description": tek.description,
            "species": tek.species,
            "variant": tek.variant,
            "tags": tek.tags,
            "stages": tek.stages,
            "is_public": tek.is_public,
            "like_count": counts["like_count"],
            "view_count": counts["view_count"],
            "import_count": counts["import_count"],
            "user_has_liked": engagement_state["user_has_liked"],
            "user_has_viewed": engagement_state["user_has_viewed"],
            "user_has_imported": engagement_state["user_has_imported"],
            "is_owner": tek.created_by == current_user.id,
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

    # Load the creator relationship to ensure consistent response format
    tek_with_creator = db.query(BulkGrowTek).options(joinedload(BulkGrowTek.creator)).filter(
        BulkGrowTek.id == tek.id
    ).first()

    # Get engagement counts and user state for new tek (will be all zeros)
    counts = get_engagement_counts(db, tek_with_creator.id)
    engagement_state = get_user_engagement_state(db, tek_with_creator.id, current_user.id)
    
    # Return with consistent structure
    result_dict = {
        "id": tek_with_creator.id,
        "name": tek_with_creator.name,
        "description": tek_with_creator.description,
        "species": tek_with_creator.species,
        "variant": tek_with_creator.variant,
        "tags": tek_with_creator.tags,
        "stages": tek_with_creator.stages,
        "is_public": tek_with_creator.is_public,
        "creator_name": tek_with_creator.creator.username if tek_with_creator.creator else "Unknown",
        "creator_profile_image": tek_with_creator.creator.profile_image if tek_with_creator.creator else None,
        "like_count": counts["like_count"],
        "view_count": counts["view_count"],
        "import_count": counts["import_count"],
        "user_has_liked": engagement_state["user_has_liked"],
        "user_has_viewed": engagement_state["user_has_viewed"],
        "user_has_imported": engagement_state["user_has_imported"],
        "is_owner": True,  # Creator is always owner
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

    # Automatically track view when getting a tek
    existing_view = db.query(TekView).filter(
        TekView.tek_id == tek_id,
        TekView.user_id == current_user.id
    ).first()
    
    if not existing_view:
        new_view = TekView(tek_id=tek_id, user_id=current_user.id)
        db.add(new_view)
        db.commit()

    # Get engagement counts and user state
    counts = get_engagement_counts(db, tek_id)
    engagement_state = get_user_engagement_state(db, tek_id, current_user.id)

    result_dict = {
        "id": tek.id,
        "name": tek.name,
        "description": tek.description,
        "species": tek.species,
        "variant": tek.variant,
        "tags": tek.tags,
        "is_public": tek.is_public,
        "stages": tek.stages,
        "creator_name": tek.creator.username if tek.creator else "Unknown",
        "creator_profile_image": tek.creator.profile_image if tek.creator else None,
        "like_count": counts["like_count"],
        "view_count": counts["view_count"],
        "import_count": counts["import_count"],
        "user_has_liked": engagement_state["user_has_liked"],
        "user_has_viewed": engagement_state["user_has_viewed"],
        "user_has_imported": engagement_state["user_has_imported"],
        "is_owner": tek.created_by == current_user.id,
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

    db.commit()
    db.refresh(tek)

    # Load the creator relationship for consistent response
    tek_with_creator = db.query(BulkGrowTek).options(joinedload(BulkGrowTek.creator)).filter(
        BulkGrowTek.id == tek.id
    ).first()

    # Get engagement counts and user state
    counts = get_engagement_counts(db, tek.id)
    engagement_state = get_user_engagement_state(db, tek.id, current_user.id)

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
        "creator_name": current_user.username,
        "creator_profile_image": tek_with_creator.creator.profile_image if tek_with_creator.creator else None,
        "like_count": counts["like_count"],
        "view_count": counts["view_count"],
        "import_count": counts["import_count"],
        "user_has_liked": engagement_state["user_has_liked"],
        "user_has_viewed": engagement_state["user_has_viewed"],
        "user_has_imported": engagement_state["user_has_imported"],
        "is_owner": True,  # User updating is always owner
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


# Engagement helper functions
def get_user_engagement_state(db: Session, tek_id: int, user_id: int) -> dict:
    """Get user's like/view/import status for a tek"""
    user_liked = db.query(TekLike).filter(
        TekLike.tek_id == tek_id,
        TekLike.user_id == user_id
    ).first() is not None
    
    user_viewed = db.query(TekView).filter(
        TekView.tek_id == tek_id,
        TekView.user_id == user_id
    ).first() is not None
    
    user_imported = db.query(TekImport).filter(
        TekImport.tek_id == tek_id,
        TekImport.user_id == user_id
    ).first() is not None
    
    return {
        "user_has_liked": user_liked,
        "user_has_viewed": user_viewed,
        "user_has_imported": user_imported
    }


def get_engagement_counts(db: Session, tek_id: int) -> dict:
    """Get like/view/import counts for a tek"""
    like_count = db.query(TekLike).filter(TekLike.tek_id == tek_id).count()
    view_count = db.query(TekView).filter(TekView.tek_id == tek_id).count()
    import_count = db.query(TekImport).filter(TekImport.tek_id == tek_id).count()
    
    return {
        "like_count": str(like_count),  # Store as string to support encryption
        "view_count": str(view_count),   # Store as string to support encryption
        "import_count": str(import_count)   # Store as string to support encryption
    }


# Engagement endpoints
@router.post("/{tek_id}/like")
async def like_tek(
    tek_id: int,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_user)
):
    """Toggle like status for a tek (persistent state)"""
    # Verify tek exists and user has access
    tek = db.query(BulkGrowTek).filter(BulkGrowTek.id == tek_id).first()
    if not tek:
        raise HTTPException(status_code=404, detail="Tek not found")
    
    if not tek.is_public and tek.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if user already liked this tek
    existing_like = db.query(TekLike).filter(
        TekLike.tek_id == tek_id,
        TekLike.user_id == current_user.id
    ).first()
    
    if existing_like:
        # Unlike - remove the like record
        db.delete(existing_like)
        liked = False
    else:
        # Like - create new like record
        new_like = TekLike(tek_id=tek_id, user_id=current_user.id)
        db.add(new_like)
        liked = True
    
    db.commit()
    
    # Get updated counts and user state
    counts = get_engagement_counts(db, tek_id)
    engagement_state = get_user_engagement_state(db, tek_id, current_user.id)
    
    return {
        "liked": liked,
        "like_count": counts["like_count"],
        "user_has_liked": engagement_state["user_has_liked"]
    }


@router.post("/{tek_id}/view")
async def track_view(
    tek_id: int,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_user)
):
    """Record tek view (once per user, persistent)"""
    # Verify tek exists and user has access
    tek = db.query(BulkGrowTek).filter(BulkGrowTek.id == tek_id).first()
    if not tek:
        raise HTTPException(status_code=404, detail="Tek not found")
    
    if not tek.is_public and tek.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if user already viewed this tek
    existing_view = db.query(TekView).filter(
        TekView.tek_id == tek_id,
        TekView.user_id == current_user.id
    ).first()
    
    if not existing_view:
        # First view - create new view record
        new_view = TekView(tek_id=tek_id, user_id=current_user.id)
        db.add(new_view)
        db.commit()
    
    # Get updated counts and user state
    counts = get_engagement_counts(db, tek_id)
    engagement_state = get_user_engagement_state(db, tek_id, current_user.id)
    
    return {
        "view_count": counts["view_count"],
        "user_has_viewed": engagement_state["user_has_viewed"]
    }


@router.post("/{tek_id}/import")
async def track_import(
    tek_id: int,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_user)
):
    """Record tek import (allows multiple imports per user)"""
    # Verify tek exists and user has access
    tek = db.query(BulkGrowTek).filter(BulkGrowTek.id == tek_id).first()
    if not tek:
        raise HTTPException(status_code=404, detail="Tek not found")
    
    if not tek.is_public and tek.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Always create a new import record (users can import multiple times)
    new_import = TekImport(tek_id=tek_id, user_id=current_user.id)
    db.add(new_import)
    db.commit()
    
    # Get updated counts and user state
    counts = get_engagement_counts(db, tek_id)
    engagement_state = get_user_engagement_state(db, tek_id, current_user.id)
    
    return {
        "import_count": counts["import_count"],
        "user_has_imported": engagement_state["user_has_imported"]
    }
