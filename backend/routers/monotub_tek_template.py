from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, desc, asc
from typing import List, Optional
from datetime import datetime, date

from backend.database import get_grow_db
from backend.models.template import MonotubTekTemplate
from backend.models.user import User
from backend.models.grow import Grow
from backend.schemas.monotub_tek_template import (
    MonotubTekTemplate as MonotubTekTemplateSchema,
    MonotubTekTemplateCreate,
    MonotubTekTemplateUpdate,
    MonotubTekTemplateListItem,
    MonotubTekTemplateSearchFilters,
    MonotubTekAIGenerationRequest,
    MonotubTekAIGenerationResponse,
    GrowFromMonotubTekTemplateRequest,
    EnvironmentalConditions,
    ScheduledAction,
    StageDurations
)
from backend.schemas.grow import GrowCreate
from backend.security import get_current_user

router = APIRouter(prefix="/monotub-tek-templates", tags=["monotub-tek-templates"])

@router.get("/public", response_model=List[MonotubTekTemplateListItem])
async def get_public_templates(
    species: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    search_term: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    sort_by: str = Query("usage_count", pattern="^(usage_count|created_at|name)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_grow_db)
):
    """Get public monotub tek templates with search and filtering"""
    query = db.query(MonotubTekTemplate).filter(MonotubTekTemplate.is_public == True)
    
    # Apply filters
    if species:
        query = query.filter(MonotubTekTemplate.species.ilike(f"%{species}%"))
    if difficulty:
        query = query.filter(MonotubTekTemplate.difficulty == difficulty)
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
            "tek_type": template.tek_type,
            "difficulty": template.difficulty,
            "estimated_timeline": template.estimated_timeline,
            "tags": template.tags,
            "is_public": template.is_public,
            "created_by": template.created_by,
            "created_at": template.created_at,
            "usage_count": template.usage_count,
            "creator_name": template.creator.username if template.creator else None
        }
        result.append(MonotubTekTemplateListItem(**template_dict))
    
    return result

@router.get("/my", response_model=List[MonotubTekTemplateListItem])
async def get_my_templates(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_grow_db),
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
            "tek_type": template.tek_type,
            "difficulty": template.difficulty,
            "estimated_timeline": template.estimated_timeline,
            "tags": template.tags,
            "is_public": template.is_public,
            "created_by": template.created_by,
            "created_at": template.created_at,
            "usage_count": template.usage_count,
            "creator_name": current_user.username
        }
        result.append(MonotubTekTemplateListItem(**template_dict))
    
    return result

@router.post("/", response_model=MonotubTekTemplateSchema)
async def create_template(
    template_data: MonotubTekTemplateCreate,
    db: Session = Depends(get_grow_db),
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
    db: Session = Depends(get_grow_db),
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
        "tek_type": template.tek_type,
        "difficulty": template.difficulty,
        "estimated_timeline": template.estimated_timeline,
        "tags": template.tags,
        "spawn_type": template.spawn_type,
        "spawn_amount": template.spawn_amount,
        "bulk_type": template.bulk_type,
        "bulk_amount": template.bulk_amount,
        "is_public": template.is_public,
        "environmental_conditions": template.environmental_conditions,
        "environmental_sensors": template.environmental_sensors,
        "scheduled_actions": template.scheduled_actions,
        "stage_durations": template.stage_durations,
        "created_by": template.created_by,
        "created_at": template.created_at,
        "updated_at": template.updated_at,
        "usage_count": template.usage_count,
        "creator_name": template.creator.username if template.creator else None
    }
    
    return MonotubTekTemplateSchema(**result_dict)

@router.put("/{template_id}", response_model=MonotubTekTemplateSchema)
async def update_template(
    template_id: int,
    template_data: MonotubTekTemplateUpdate,
    db: Session = Depends(get_grow_db),
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
        "tek_type": template.tek_type,
        "difficulty": template.difficulty,
        "estimated_timeline": template.estimated_timeline,
        "tags": template.tags,
        "spawn_type": template.spawn_type,
        "spawn_amount": template.spawn_amount,
        "bulk_type": template.bulk_type,
        "bulk_amount": template.bulk_amount,
        "is_public": template.is_public,
        "environmental_conditions": template.environmental_conditions,
        "environmental_sensors": template.environmental_sensors,
        "scheduled_actions": template.scheduled_actions,
        "stage_durations": template.stage_durations,
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
    db: Session = Depends(get_grow_db),
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

@router.post("/ai-generate", response_model=MonotubTekAIGenerationResponse)
async def generate_ai_template(
    request: MonotubTekAIGenerationRequest,
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_user)
):
    """Generate AI optimized monotub tek template parameters"""
    # Placeholder for AI integration
    # This would integrate with your existing AI system
    
    # Mock AI generation - replace with actual AI integration
    mock_response = {
        "environmental_conditions": {
            "spawn_temp_range": [75, 80],
            "bulk_temp_range": [70, 75],
            "fruiting_temp_range": [65, 70],
            "humidity_ranges": {
                "bulk": [85, 95],
                "fruiting": [90, 95]
            },
            "co2_targets": {
                "colonization": 2000,
                "fruiting": 500
            },
            "voc_targets": {
                "colonization": 400,
                "fruiting": 200
            },
            "ph_ranges": {
                "bulk": [6.5, 7.5],
                "fruiting": [6.0, 7.0]
            },
            "lighting_schedule": {
                "colonization": {"hours": 0, "intensity": 0},
                "fruiting": {"hours": 12, "intensity": 1000}
            }
        },
        "scheduled_actions": [
            {
                "stage": "spawn_colonization",
                "day_offset": 3,
                "action_type": "check",
                "description": "Check for contamination signs",
                "frequency": "daily",
                "is_critical": True
            },
            {
                "stage": "bulk_colonization",
                "day_offset": 7,
                "action_type": "check",
                "description": "Monitor substrate colonization progress",
                "frequency": "daily",
                "is_critical": True
            },
            {
                "stage": "fruiting",
                "day_offset": 14,
                "action_type": "mist",
                "description": "Mist walls for humidity maintenance",
                "frequency": "2x daily",
                "is_critical": True
            }
        ],
        "stage_durations": {
            "spawn_colonization": [7, 14],
            "bulk_colonization": [10, 21],
            "pinning": [3, 7],
            "fruiting": [5, 10]
        },
        "estimated_timeline": 35
    }
    
    return MonotubTekAIGenerationResponse(**mock_response)

@router.post("/{template_id}/instantiate")
async def create_grow_from_template(
    template_id: int,
    request: GrowFromMonotubTekTemplateRequest,
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new grow from a monotub tek template"""
    template = db.query(MonotubTekTemplate).filter(MonotubTekTemplate.id == template_id).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Check access permissions
    if not template.is_public and template.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Create grow from template
    grow_data = {
        "name": request.name or f"{template.species} from {template.name}",
        "species": template.species,
        "variant": template.variant,
        "space": request.space,
        "tek": "Monotub",  # Map to existing grow tek field
        "notes": request.notes,
        "spawn_type": template.spawn_type,
        "spawn_weight_lbs": request.spawn_amount or template.spawn_amount,
        "bulk_type": template.bulk_type,
        "bulk_weight_lbs": request.bulk_amount or template.bulk_amount,
        "inoculation_date": request.inoculation_date,
    }
    
    # Copy AI-generated optimal conditions if available
    if template.environmental_conditions:
        env_conditions = template.environmental_conditions
        grow_data.update({
            "optimal_spawn_temp_low": env_conditions.get("spawn_temp_range", [None, None])[0] if env_conditions.get("spawn_temp_range") else None,
            "optimal_spawn_temp_high": env_conditions.get("spawn_temp_range", [None, None])[1] if env_conditions.get("spawn_temp_range") else None,
            "optimal_bulk_temp_low": env_conditions.get("bulk_temp_range", [None, None])[0] if env_conditions.get("bulk_temp_range") else None,
            "optimal_bulk_temp_high": env_conditions.get("bulk_temp_range", [None, None])[1] if env_conditions.get("bulk_temp_range") else None,
            "optimal_fruiting_temp_low": env_conditions.get("fruiting_temp_range", [None, None])[0] if env_conditions.get("fruiting_temp_range") else None,
            "optimal_fruiting_temp_high": env_conditions.get("fruiting_temp_range", [None, None])[1] if env_conditions.get("fruiting_temp_range") else None,
        })
    
    # Remove None values
    grow_data = {k: v for k, v in grow_data.items() if v is not None}
    
    # Create the grow
    new_grow = Grow(**grow_data)
    new_grow.user_id = current_user.id
    
    db.add(new_grow)
    db.commit()
    db.refresh(new_grow)
    
    # Increment template usage count
    template.usage_count += 1
    db.commit()
    
    # TODO: Create calendar events from scheduled_actions
    # This would require integration with your calendar system
    
    return {"grow_id": new_grow.id, "message": "Grow created successfully from template"}

@router.post("/from-grow/{grow_id}", response_model=MonotubTekTemplateSchema)
async def create_template_from_grow(
    grow_id: int,
    template_name: str,
    description: Optional[str] = None,
    is_public: bool = False,
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_user)
):
    """Create a monotub tek template from a completed grow"""
    grow = db.query(Grow).filter(
        and_(Grow.id == grow_id, Grow.user_id == current_user.id)
    ).first()
    
    if not grow:
        raise HTTPException(status_code=404, detail="Grow not found")
    
    if grow.status not in ["completed", "harvested"]:
        raise HTTPException(status_code=400, detail="Can only create templates from completed grows")
    
    # Create template from grow data
    template_data = {
        "name": template_name,
        "description": description or f"Template created from successful {grow.species} grow",
        "species": grow.species,
        "variant": grow.variant,
        "tek_type": "monotub_bulk",
        "spawn_type": grow.spawn_type,
        "spawn_amount": grow.spawn_weight_lbs or 1.0,
        "bulk_type": grow.bulk_type,
        "bulk_amount": grow.bulk_weight_lbs or 5.0,
        "is_public": is_public,
        "created_by": current_user.id,
    }
    
    # Copy optimal conditions if available
    if any([grow.optimal_spawn_temp_low, grow.optimal_bulk_temp_low, grow.optimal_fruiting_temp_low]):
        environmental_conditions = {}
        
        if grow.optimal_spawn_temp_low and grow.optimal_spawn_temp_high:
            environmental_conditions["spawn_temp_range"] = [grow.optimal_spawn_temp_low, grow.optimal_spawn_temp_high]
        if grow.optimal_bulk_temp_low and grow.optimal_bulk_temp_high:
            environmental_conditions["bulk_temp_range"] = [grow.optimal_bulk_temp_low, grow.optimal_bulk_temp_high]
        if grow.optimal_fruiting_temp_low and grow.optimal_fruiting_temp_high:
            environmental_conditions["fruiting_temp_range"] = [grow.optimal_fruiting_temp_low, grow.optimal_fruiting_temp_high]
            
        template_data["environmental_conditions"] = environmental_conditions
    
    template = MonotubTekTemplate(**template_data)
    db.add(template)
    db.commit()
    db.refresh(template)
    
    result_dict = {
        **template_data,
        "id": template.id,
        "created_at": template.created_at,
        "updated_at": template.updated_at,
        "usage_count": 0,
        "creator_name": current_user.username
    }
    
    return MonotubTekTemplateSchema(**result_dict)
