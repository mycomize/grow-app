from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, desc, asc
from typing import List, Optional
from datetime import datetime, date

from backend.database import get_mycomize_db, engine
from backend.models.template import MonotubTekTemplate
from backend.models.user import User
from backend.models.grow import Grow
from backend.schemas.monotub_tek_template import (
    MonotubTekTemplate as MonotubTekTemplateSchema,
    MonotubTekTemplateCreate,
    MonotubTekTemplateUpdate,
    MonotubTekTemplateListItem,
    MonotubTekTemplateSearchFilters
)
from backend.schemas.grow import GrowCreate
from backend.security import get_current_user

# Create the models
from backend.models.template import Base
Base.metadata.create_all(bind=engine)

router = APIRouter(prefix="/monotub-tek-templates", tags=["monotub-tek-templates"])

@router.get("/public", response_model=List[MonotubTekTemplateListItem])
async def get_public_templates(
    species: Optional[str] = Query(None),
    search_term: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    sort_by: str = Query("usage_count", pattern="^(usage_count|created_at|name)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_mycomize_db)
):
    """Get public monotub tek templates with search and filtering"""
    query = db.query(MonotubTekTemplate).filter(MonotubTekTemplate.is_public == True)
    
    # Apply filters
    if species:
        query = query.filter(MonotubTekTemplate.species.ilike(f"%{species}%"))
    if search_term:
        query = query.filter(
            or_(
                MonotubTekTemplate.name.ilike(f"%{search_term}%"),
                MonotubTekTemplate.description.ilike(f"%{search_term}%")
            )
        )
    
    # Apply sorting
    sort_column = getattr(MonotubTekTemplate, sort_by)
    if sort_order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))
    
    # Join with user to get creator name
    templates = query.options(joinedload(MonotubTekTemplate.creator)).offset(offset).limit(limit).all()
    
    # Convert to response format
    result = []
    for template in templates:
        template_dict = {
            "id": template.id,
            "name": template.name,
            "description": template.description,
            "species": template.species,
            "variant": template.variant,
            "type": template.type,
            "tags": template.tags,
            "is_public": template.is_public,
            "created_by": template.created_by,
            "created_at": template.created_at,
            "usage_count": template.usage_count,
            "creator_name": template.creator.username if template.creator else "Unknown",
            "creator_profile_image": template.creator.profile_image if template.creator else None
        }
        result.append(MonotubTekTemplateListItem(**template_dict))
    
    return result

@router.get("/my", response_model=List[MonotubTekTemplateListItem])
async def get_my_templates(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's monotub tek templates"""
    templates = db.query(MonotubTekTemplate).filter(
        MonotubTekTemplate.created_by == current_user.id
    ).order_by(desc(MonotubTekTemplate.updated_at)).offset(offset).limit(limit).all()
    
    result = []
    for template in templates:
        template_dict = {
            "id": template.id,
            "name": template.name,
            "description": template.description,
            "species": template.species,
            "variant": template.variant,
            "type": template.type,
            "tags": template.tags,
            "is_public": template.is_public,
            "created_by": template.created_by,
            "created_at": template.created_at,
            "usage_count": template.usage_count,
            "creator_name": current_user.username,
            "creator_profile_image": current_user.profile_image
        }
        result.append(MonotubTekTemplateListItem(**template_dict))
    
    return result

@router.post("/", response_model=MonotubTekTemplateSchema)
async def create_template(
    template_data: MonotubTekTemplateCreate,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new monotub tek template"""
    template_dict = template_data.dict()
    template_dict["created_by"] = current_user.id
    
    template = MonotubTekTemplate(**template_dict)
    db.add(template)
    db.commit()
    db.refresh(template)
    
    # Return with creator name
    result_dict = {
        **template_dict,
        "id": template.id,
        "created_at": template.created_at,
        "updated_at": template.updated_at,
        "usage_count": template.usage_count,
        "creator_name": current_user.username
    }
    
    return MonotubTekTemplateSchema(**result_dict)

@router.get("/{template_id}", response_model=MonotubTekTemplateSchema)
async def get_template(
    template_id: int,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific monotub tek template"""
    template = db.query(MonotubTekTemplate).options(joinedload(MonotubTekTemplate.creator)).filter(
        MonotubTekTemplate.id == template_id
    ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Check access permissions
    if not template.is_public and template.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    result_dict = {
        "id": template.id,
        "name": template.name,
        "description": template.description,
        "species": template.species,
        "variant": template.variant,
        "type": template.type,
        "tags": template.tags,
        "is_public": template.is_public,
        "stages": template.stages,
        "created_by": template.created_by,
        "created_at": template.created_at,
        "updated_at": template.updated_at,
        "usage_count": template.usage_count,
        "creator_name": template.creator.username if template.creator else "Unknown"
    }
    
    return MonotubTekTemplateSchema(**result_dict)

@router.put("/{template_id}", response_model=MonotubTekTemplateSchema)
async def update_template(
    template_id: int,
    template_data: MonotubTekTemplateUpdate,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_user)
):
    """Update a monotub tek template"""
    template = db.query(MonotubTekTemplate).filter(MonotubTekTemplate.id == template_id).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    if template.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update fields
    update_data = template_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(template, field, value)
    
    template.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(template)
    
    # Return updated template
    result_dict = {
        "id": template.id,
        "name": template.name,
        "description": template.description,
        "species": template.species,
        "variant": template.variant,
        "type": template.type,
        "tags": template.tags,
        "is_public": template.is_public,
        "stages": template.stages,
        "created_by": template.created_by,
        "created_at": template.created_at,
        "updated_at": template.updated_at,
        "usage_count": template.usage_count,
        "creator_name": current_user.username
    }
    
    return MonotubTekTemplateSchema(**result_dict)

@router.delete("/{template_id}")
async def delete_template(
    template_id: int,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a monotub tek template"""
    template = db.query(MonotubTekTemplate).filter(MonotubTekTemplate.id == template_id).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    if template.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    db.delete(template)
    db.commit()
    
    return {"message": "Template deleted successfully"}
