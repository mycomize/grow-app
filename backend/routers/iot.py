from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from backend.models.iot import IoTGateway
from backend.models.iot_entity import IoTEntity
from backend.models.grow import Grow
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
)
from backend.database import get_grow_db, grow_engine
from backend.security import get_current_active_user

# Create the models
from backend.models.iot import Base
from backend.models.iot_entity import Base as EntityBase
Base.metadata.create_all(bind=grow_engine)
EntityBase.metadata.create_all(bind=grow_engine)

router = APIRouter(
    prefix="/iot-gateways",
    tags=["iot-gateways"],
    responses={401: {"detail": "Not authenticated"}},
)

# === IoT GATEWAY ROUTES ===

# --- Basic CRUD operations ---

@router.post("/", response_model=IoTGatewaySchema, status_code=status.HTTP_201_CREATED)
async def create_iot_gateway(
    gateway: IoTGatewayCreate, 
    db: Session = Depends(get_grow_db),
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
        is_active=gateway.is_active,
    )
    
    db.add(db_gateway)
    db.commit()
    db.refresh(db_gateway)
    
    return db_gateway

@router.get("/", response_model=List[IoTGatewaySchema])
async def read_iot_gateways(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all IoT gateways for the current user"""
    gateways = db.query(IoTGateway).filter(IoTGateway.user_id == current_user.id).offset(skip).limit(limit).all()
    return gateways

@router.get("/{gateway_id}", response_model=IoTGatewaySchema)
async def read_iot_gateway(
    gateway_id: int, 
    db: Session = Depends(get_grow_db),
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
    db: Session = Depends(get_grow_db),
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
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_active_user)
):
    """Add an entity to a gateway"""
    # Verify gateway exists and belongs to user
    gateway = db.query(IoTGateway).filter(IoTGateway.id == gateway_id, IoTGateway.user_id == current_user.id).first()
    if gateway is None:
        raise HTTPException(status_code=404, detail="IoT gateway not found")
    
    # Check if entity already exists
    existing_entity = db.query(IoTEntity).filter(
        IoTEntity.gateway_id == gateway_id,
        IoTEntity.entity_id == entity.entity_id
    ).first()
    
    if existing_entity:
        raise HTTPException(status_code=400, detail="Entity already exists for this gateway")
    
    # Create new entity
    db_entity = IoTEntity(
        gateway_id=gateway_id,
        entity_id=entity.entity_id,
        entity_type=entity.entity_type,
        friendly_name=entity.friendly_name,
        is_enabled=entity.is_enabled
    )
    
    db.add(db_entity)
    db.commit()
    db.refresh(db_entity)
    
    return db_entity

@router.put("/{gateway_id}/entities/{entity_id}", response_model=IoTEntitySchema)
async def update_entity(
    gateway_id: int,
    entity_id: int,
    entity_update: IoTEntityUpdate,
    db: Session = Depends(get_grow_db),
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
    db: Session = Depends(get_grow_db),
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
    db: Session = Depends(get_grow_db),
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
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a IoT gateway"""
    # First check if this gateway is associated with any grows
    db_gateway = db.query(IoTGateway).filter(IoTGateway.id == gateway_id, IoTGateway.user_id == current_user.id).first()
    if db_gateway is None:
        raise HTTPException(status_code=404, detail="IoT gateway not found")
    
    # Check if any grow is using this gateway
    if db_gateway.grow_id is not None:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete IoT gateway that is in use by a grow. Remove it from grow ID {db_gateway.grow_id} first."
        )
    
    db.delete(db_gateway)
    db.commit()
    return {"detail": "IoT gateway deleted"}
    
# --- Gateway Link Operations ---

@router.put("/{gateway_id}/link/{grow_id}", response_model=IoTGatewaySchema)
async def link_gateway_with_grow(
    gateway_id: int,
    grow_id: int,
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_active_user)
):
    """Link an IoT gateway with a grow"""
    # Verify gateway exists and belongs to user
    gateway = db.query(IoTGateway).filter(IoTGateway.id == gateway_id, IoTGateway.user_id == current_user.id).first()
    if gateway is None:
        raise HTTPException(status_code=404, detail="IoT gateway not found")
    
    # Check if already linked with another grow
    if gateway.grow_id is not None and gateway.grow_id != grow_id:
        raise HTTPException(
            status_code=400, 
            detail=f"This gateway is already linked with grow ID {gateway.grow_id}. Please unlink it first."
        )
    
    # Verify grow exists and belongs to user
    grow = db.query(Grow).filter(Grow.id == grow_id, Grow.user_id == current_user.id).first()
    if grow is None:
        raise HTTPException(status_code=404, detail="Grow not found")
    
    # Link gateway with grow
    gateway.grow_id = grow_id
    db.commit()
    db.refresh(gateway)
    
    return gateway

@router.put("/{gateway_id}/unlink", response_model=IoTGatewaySchema)
async def unlink_gateway_from_grow(
    gateway_id: int,
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_active_user)
):
    """Unlink an IoT gateway from its grow"""
    # Verify gateway exists and belongs to user
    gateway = db.query(IoTGateway).filter(IoTGateway.id == gateway_id, IoTGateway.user_id == current_user.id).first()
    if gateway is None:
        raise HTTPException(status_code=404, detail="IoT gateway not found")
    
    # Check if not linked with any grow
    if gateway.grow_id is None:
        raise HTTPException(status_code=400, detail="This gateway is not linked with any grow")
    
    # Unlink gateway from grow
    gateway.grow_id = None
    db.commit()
    db.refresh(gateway)
    
    return gateway

@router.put("/{gateway_id}/enable", response_model=IoTGatewaySchema)
async def enable_gateway(
    gateway_id: int,
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_active_user)
):
    """Enable an IoT gateway"""
    # Verify gateway exists and belongs to user
    gateway = db.query(IoTGateway).filter(IoTGateway.id == gateway_id, IoTGateway.user_id == current_user.id).first()
    if gateway is None:
        raise HTTPException(status_code=404, detail="IoT gateway not found")
    
    # Check if already enabled
    if gateway.is_active:
        return gateway
        
    # Enable gateway
    gateway.is_active = True
    db.commit()
    db.refresh(gateway)
    
    return gateway

@router.put("/{gateway_id}/disable", response_model=IoTGatewaySchema)
async def disable_gateway(
    gateway_id: int,
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_active_user)
):
    """Disable an IoT gateway"""
    # Verify gateway exists and belongs to user
    gateway = db.query(IoTGateway).filter(IoTGateway.id == gateway_id, IoTGateway.user_id == current_user.id).first()
    if gateway is None:
        raise HTTPException(status_code=404, detail="IoT gateway not found")
    
    # Check if already disabled
    if not gateway.is_active:
        return gateway
        
    # Disable gateway
    gateway.is_active = False
    db.commit()
    db.refresh(gateway)
    
    return gateway
