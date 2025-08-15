from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from backend.models.iot import IoTGateway
from backend.models.iot_entity import IoTEntity
from backend.models.grow import BulkGrow
from backend.models.user import User
from backend.schemas.iot import (
    IoTGateway as IoTGatewaySchema,
    IoTGatewayCreate,
    IoTGatewayUpdate,
)
from backend.schemas.iot_entity import (
    IoTEntity as IoTEntitySchema,
    IoTEntityCreate,
    IoTEntityUpdate,
    EntityLinkingRequest,
    BulkEntityLinkingRequest,
    BulkEntityCreateRequest,
    BulkEntityDeleteRequest,
)
from backend.database import get_mycomize_db, engine
from backend.security import get_current_active_user

# Create the models
from backend.models.iot import Base
from backend.models.iot_entity import Base as EntityBase
Base.metadata.create_all(bind=engine)
EntityBase.metadata.create_all(bind=engine)

router = APIRouter(
    prefix="/iot-gateways",
    tags=["iot-gateways"],
    responses={401: {"detail": "Not authenticated"}},
)

# === IoT GATEWAY ROUTES ===

@router.post("/", response_model=IoTGatewaySchema, status_code=status.HTTP_201_CREATED)
async def create_iot_gateway(
    gateway: IoTGatewayCreate, 
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new IoT gateway for the current user"""
    db_gateway = IoTGateway(
        user_id=current_user.id,
        type=gateway.type,
        name=gateway.name,
        description=gateway.description,
        api_url=gateway.api_url,
        api_key=gateway.api_key,
    )
    
    db.add(db_gateway)
    db.commit()
    db.refresh(db_gateway)
    
    return db_gateway

@router.get("/", response_model=List[IoTGatewaySchema])
async def read_iot_gateways(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all IoT gateways for the current user"""
    gateways = db.query(IoTGateway).filter(IoTGateway.user_id == current_user.id).offset(skip).limit(limit).all()
    return gateways

@router.get("/{gateway_id}", response_model=IoTGatewaySchema)
async def read_iot_gateway(
    gateway_id: int, 
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific IoT gateway by ID"""
    gateway = db.query(IoTGateway).filter(IoTGateway.id == gateway_id, IoTGateway.user_id == current_user.id).first()

    if gateway is None:
        raise HTTPException(status_code=404, detail="IoT gateway not found")

    return gateway

# === IoT ENTITY ROUTES ===

@router.get("/{gateway_id}/entities", response_model=List[IoTEntitySchema])
async def get_gateway_entities(
    gateway_id: int,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all enabled entities for a gateway"""
    # Verify gateway exists and belongs to user
    gateway = db.query(IoTGateway).filter(IoTGateway.id == gateway_id, IoTGateway.user_id == current_user.id).first()
    if gateway is None:
        raise HTTPException(status_code=404, detail="IoT gateway not found")
    
    entities = db.query(IoTEntity).filter(IoTEntity.gateway_id == gateway_id).all()

    return entities

@router.post("/{gateway_id}/entities", response_model=IoTEntitySchema, status_code=status.HTTP_201_CREATED)
async def add_entity_to_gateway(
    gateway_id: int,
    entity: IoTEntityCreate,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_active_user)
):
    """Add an entity to a gateway"""
    # Verify gateway exists and belongs to user
    gateway = db.query(IoTGateway).filter(IoTGateway.id == gateway_id, IoTGateway.user_id == current_user.id).first()
    if gateway is None:
        raise HTTPException(status_code=404, detail="IoT gateway not found")
    
    # Create new entity as linkable (linked_grow_id = NULL, linked_stage = NULL)
    db_entity = IoTEntity(
        gateway_id=gateway_id,
        entity_name=entity.entity_name,
        entity_type=entity.entity_type,
        friendly_name=entity.friendly_name,
        domain=entity.domain,
        device_class=entity.device_class,
        linked_grow_id=None,
        linked_stage=None
    )
    
    db.add(db_entity)
    db.commit()
    db.refresh(db_entity)
    
    return db_entity

@router.post("/{gateway_id}/entities/bulk-create", response_model=List[IoTEntitySchema], status_code=status.HTTP_201_CREATED)
async def bulk_create_entities(
    gateway_id: int,
    bulk_request: BulkEntityCreateRequest,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_active_user)
):
    """Bulk create multiple entities for a gateway"""
    # Verify gateway exists and belongs to user
    gateway = db.query(IoTGateway).filter(IoTGateway.id == gateway_id, IoTGateway.user_id == current_user.id).first()
    if gateway is None:
        raise HTTPException(status_code=404, detail="IoT gateway not found")
    
    created_entities = []
    
    for entity_data in bulk_request.entities:
        # Create new entity as linkable (linked_grow_id = NULL, linked_stage = NULL)
        db_entity = IoTEntity(
            gateway_id=gateway_id,
            entity_name=entity_data.entity_name,
            entity_type=entity_data.entity_type,
            friendly_name=entity_data.friendly_name,
            domain=entity_data.domain,
            device_class=entity_data.device_class,
            linked_grow_id=None,
            linked_stage=None
        )
            
        db.add(db_entity)
        created_entities.append(db_entity)
    
    # Commit all entities at once
    if created_entities:
        db.commit()
        
        # Refresh all created entities
        for entity in created_entities:
            db.refresh(entity)
    
    return created_entities

@router.delete("/{gateway_id}/entities/bulk-delete", status_code=status.HTTP_204_NO_CONTENT)
async def bulk_delete_entities(
    gateway_id: int,
    bulk_request: BulkEntityDeleteRequest,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_active_user)
):
    """Bulk delete multiple entities from a gateway"""
    # Verify gateway exists and belongs to user
    gateway = db.query(IoTGateway).filter(IoTGateway.id == gateway_id, IoTGateway.user_id == current_user.id).first()
    if gateway is None:
        raise HTTPException(status_code=404, detail="IoT gateway not found")
    
    # Get entities to delete
    entities_to_delete = db.query(IoTEntity).filter(
        IoTEntity.id.in_(bulk_request.entity_ids),
        IoTEntity.gateway_id == gateway_id
    ).all()
    
    if len(entities_to_delete) != len(bulk_request.entity_ids):
        raise HTTPException(status_code=404, detail="One or more entities not found")
    
    # Delete all entities
    for entity in entities_to_delete:
        db.delete(entity)
    
    # Commit all deletions at once
    db.commit()
    
    return {"detail": f"Deleted {len(entities_to_delete)} entities"}

@router.put("/{gateway_id}/entities/bulk-link", response_model=List[IoTEntitySchema])
async def bulk_link_entities_to_grow(
    gateway_id: int,
    linking_request: BulkEntityLinkingRequest,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_active_user)
):
    """Bulk link multiple IoT entities to a grow and stage"""
    # Verify gateway exists and belongs to user
    gateway = db.query(IoTGateway).filter(IoTGateway.id == gateway_id, IoTGateway.user_id == current_user.id).first()
    if gateway is None:
        raise HTTPException(status_code=404, detail="IoT gateway not found")
    
    # Verify grow exists and belongs to user
    grow = db.query(BulkGrow).filter(BulkGrow.id == linking_request.grow_id, BulkGrow.user_id == current_user.id).first()
    if grow is None:
        raise HTTPException(status_code=404, detail="Grow not found")
    
    # Get entities
    db_entities = db.query(IoTEntity).filter(
        IoTEntity.id.in_(linking_request.entity_ids),
        IoTEntity.gateway_id == gateway_id
    ).all()
    
    if len(db_entities) != len(linking_request.entity_ids):
        raise HTTPException(status_code=404, detail="One or more entities not found")
    
    # Link all entities to grow and stage
    updated_entities = []
    for entity in db_entities:
        entity.linked_grow_id = linking_request.grow_id
        entity.linked_stage = linking_request.stage
        updated_entities.append(entity)
    
    # Commit the entity changes
    db.commit()
    
    # Refresh all updated entities
    for entity in updated_entities:
        db.refresh(entity)
    
    db.expire(grow, ["iot_entities"])
    db.refresh(grow)
    
    return updated_entities

@router.delete("/{gateway_id}/entities/bulk-unlink", response_model=List[IoTEntitySchema])
async def bulk_unlink_entities_from_grow(
    gateway_id: int,
    bulk_request: BulkEntityDeleteRequest,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_active_user)
):
    """Bulk unlink multiple IoT entities from their grows (makes them linkable again)"""
    # Verify gateway exists and belongs to user
    gateway = db.query(IoTGateway).filter(IoTGateway.id == gateway_id, IoTGateway.user_id == current_user.id).first()
    if gateway is None:
        raise HTTPException(status_code=404, detail="IoT gateway not found")
    
    # Get entities
    db_entities = db.query(IoTEntity).filter(
        IoTEntity.id.in_(bulk_request.entity_ids),
        IoTEntity.gateway_id == gateway_id
    ).all()
    
    if len(db_entities) != len(bulk_request.entity_ids):
        raise HTTPException(status_code=404, detail="One or more entities not found")
    
    # Get any grows that will be affected for refresh later
    affected_grow_ids = set()
    for entity in db_entities:
        if entity.linked_grow_id:
            affected_grow_ids.add(entity.linked_grow_id)
    
    # Unlink all entities from their grows (makes them linkable again)
    updated_entities = []
    for entity in db_entities:
        entity.linked_grow_id = None
        entity.linked_stage = None
        updated_entities.append(entity)
    
    # Commit the entity changes
    db.commit()
    
    # Refresh all updated entities
    for entity in updated_entities:
        db.refresh(entity)
    
    # Refresh affected grows
    for grow_id in affected_grow_ids:
        grow = db.query(BulkGrow).filter(BulkGrow.id == grow_id).first()
        if grow:
            db.expire(grow, ["iot_entities"])
            db.refresh(grow)
    
    return updated_entities

# Entity Linking Operations (MUST come before generic entity routes)
@router.put("/{gateway_id}/entities/{entity_id}/link", response_model=IoTEntitySchema)
async def link_entity_to_grow(
    gateway_id: int,
    entity_id: int,
    linking_request: EntityLinkingRequest,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_active_user)
):
    """Link an IoT entity to a grow and stage"""
    # Verify gateway exists and belongs to user
    gateway = db.query(IoTGateway).filter(IoTGateway.id == gateway_id, IoTGateway.user_id == current_user.id).first()
    if gateway is None:
        raise HTTPException(status_code=404, detail="IoT gateway not found")
    
    # Verify grow exists and belongs to user
    grow = db.query(BulkGrow).filter(BulkGrow.id == linking_request.grow_id, BulkGrow.user_id == current_user.id).first()
    if grow is None:
        raise HTTPException(status_code=404, detail="Grow not found")
    
    # Get entity
    db_entity = db.query(IoTEntity).filter(
        IoTEntity.id == entity_id,
        IoTEntity.gateway_id == gateway_id
    ).first()
    
    if not db_entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    # Link entity to grow and stage
    db_entity.linked_grow_id = linking_request.grow_id
    db_entity.linked_stage = linking_request.stage
    
    # Commit the entity changes
    db.commit()
    db.refresh(db_entity)
    
    db.expire(grow, ["iot_entities"])
    db.refresh(grow)
    
    return db_entity

@router.delete("/{gateway_id}/entities/{entity_id}/unlink", response_model=IoTEntitySchema)
async def remove_entity_link(
    gateway_id: int,
    entity_id: int,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_active_user)
):
    """Remove an IoT entity's grow/stage link (makes entity linkable again)"""
    # Verify gateway exists and belongs to user
    gateway = db.query(IoTGateway).filter(IoTGateway.id == gateway_id, IoTGateway.user_id == current_user.id).first()
    if gateway is None:
        raise HTTPException(status_code=404, detail="IoT gateway not found")
    
    # Get entity
    db_entity = db.query(IoTEntity).filter(
        IoTEntity.id == entity_id,
        IoTEntity.gateway_id == gateway_id
    ).first()
    
    if not db_entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    # Get the grow before unlinking (if entity was linked to one)
    grow = None
    if db_entity.linked_grow_id:
        grow = db.query(BulkGrow).filter(
            BulkGrow.id == db_entity.linked_grow_id, 
            BulkGrow.user_id == current_user.id
        ).first()
    
    # Remove linking (makes entity linkable again)
    db_entity.linked_grow_id = None
    db_entity.linked_stage = None
    
    # Commit the entity changes
    db.commit()
    db.refresh(db_entity)
    
    if grow:
        db.expire(grow, ["iot_entities"])
        db.refresh(grow)
    
    return db_entity

@router.put("/{gateway_id}/entities/{entity_id}", response_model=IoTEntitySchema)
async def update_entity(
    gateway_id: int,
    entity_id: int,
    entity_update: IoTEntityUpdate,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update an entity"""
    # Verify gateway exists and belongs to user
    gateway = db.query(IoTGateway).filter(IoTGateway.id == gateway_id, IoTGateway.user_id == current_user.id).first()
    if gateway is None:
        raise HTTPException(status_code=404, detail="IoT gateway not found")
    
    # Get entity
    db_entity = db.query(IoTEntity).filter(
        IoTEntity.id == entity_id,
        IoTEntity.gateway_id == gateway_id
    ).first()
    
    if not db_entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    # Update entity attributes
    entity_data = entity_update.dict(exclude_unset=True)
    for key, value in entity_data.items():
        setattr(db_entity, key, value)
    
    db.commit()
    db.refresh(db_entity)

    return db_entity

@router.delete("/{gateway_id}/entities/{entity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_entity_from_gateway(
    gateway_id: int,
    entity_id: int,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_active_user)
):
    """Remove an entity from a gateway"""
    # Verify gateway exists and belongs to user
    gateway = db.query(IoTGateway).filter(IoTGateway.id == gateway_id, IoTGateway.user_id == current_user.id).first()
    if gateway is None:
        raise HTTPException(status_code=404, detail="IoT gateway not found")
    
    # Get and delete entity
    db_entity = db.query(IoTEntity).filter(
        IoTEntity.id == entity_id,
        IoTEntity.gateway_id == gateway_id
    ).first()
    
    if not db_entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    db.delete(db_entity)
    db.commit()
    
    return {"detail": "Entity removed"}


@router.put("/{gateway_id}", response_model=IoTGatewaySchema)
async def update_iot_gateway(
    gateway_id: int, 
    gateway: IoTGatewayUpdate, 
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a IoT gateway"""
    db_gateway = db.query(IoTGateway).filter(IoTGateway.id == gateway_id, IoTGateway.user_id == current_user.id).first()
    if db_gateway is None:
        raise HTTPException(status_code=404, detail="IoT gateway not found")
    
    # Update gateway attributes
    gateway_data = gateway.dict(exclude_unset=True)
    for key, value in gateway_data.items():
        setattr(db_gateway, key, value)
    
    db.commit()
    db.refresh(db_gateway)

    return db_gateway

@router.delete("/{gateway_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_iot_gateway(
    gateway_id: int, 
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a IoT gateway"""
    db_gateway = db.query(IoTGateway).filter(IoTGateway.id == gateway_id, IoTGateway.user_id == current_user.id).first()
    if db_gateway is None:
        raise HTTPException(status_code=404, detail="IoT gateway not found")
    
    db.delete(db_gateway)
    db.commit()

    return {"detail": "IoT gateway deleted"}
