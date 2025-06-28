from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Dict, Any
from datetime import date, datetime, timedelta
from pydantic import BaseModel, Field

import requests
import json
import anthropic
import hashlib
from datetime import datetime

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
from backend.security import get_current_active_user, load_config

# Create the models
from backend.models.grow import Base
Base.metadata.create_all(bind=grow_engine)

# Pydantic model for milestone response schema
class MilestoneResponse(BaseModel):
    full_spawn_colonization: str = Field(..., description="Date to transfer fully colonized spawn to bulk substrate")
    full_bulk_colonization: str = Field(..., description="Date to begin fruiting conditions after bulk colonization")
    first_harvest_date: str = Field(..., description="Date for first harvest")

# Pydantic model for optimal conditions response schema
class OptimalConditionsResponse(BaseModel):
    optimal_spawn_temp_low: float = Field(..., description="Lower bound of optimal temperature range for spawn colonization in Fahrenheit")
    optimal_spawn_temp_high: float = Field(..., description="Upper bound of optimal temperature range for spawn colonization in Fahrenheit")
    optimal_bulk_temp_low: float = Field(..., description="Lower bound of optimal temperature range for bulk colonization in Fahrenheit")
    optimal_bulk_temp_high: float = Field(..., description="Upper bound of optimal temperature range for bulk colonization in Fahrenheit")
    optimal_bulk_relative_humidity_low: float = Field(..., description="Lower bound of optimal humidity level for bulk colonization in percentage")
    optimal_bulk_relative_humidity_high: float = Field(..., description="Upper bound of optimal humidity level for bulk colonization in percentage")
    optimal_bulk_co2_low: float = Field(..., description="Lower bound of optimal CO2 level for bulk colonization in PPM")
    optimal_bulk_co2_high: float = Field(..., description="Upper bound of optimal CO2 level for bulk colonization in PPM")
    optimal_fruiting_temp_low: float = Field(..., description="Lower bound of optimal temperature range for fruiting in Fahrenheit")
    optimal_fruiting_temp_high: float = Field(..., description="Upper bound of optimal temperature range for fruiting in Fahrenheit")
    optimal_fruiting_relative_humidity_low: float = Field(..., description="Lower bound of optimal humidity level for fruiting in percentage")
    optimal_fruiting_relative_humidity_high: float = Field(..., description="Upper bound of optimal humidity level for fruiting in percentage")
    optimal_fruiting_co2_low: float = Field(..., description="Lower bound of optimal CO2 level for fruiting in PPM") 
    optimal_fruiting_co2_high: float = Field(..., description="Upper bound of optimal CO2 level for fruiting in PPM")
    optimal_fruiting_light_low: float = Field(..., description="Lower bound of optimal light level for fruiting in lux")
    optimal_fruiting_light_high: float = Field(..., description="Upper bound of optimal light level for fruiting in lux")

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
        space=grow.space,
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


def generate_input_hash(*args) -> str:
    """Generate a hash from input parameters"""
    input_string = "|".join(str(arg) for arg in args)
    return hashlib.md5(input_string.encode()).hexdigest()

@router.get("/{grow_id}/optimal-conditions", response_model=OptimalConditionsResponse)
async def get_optimal_conditions(
    grow_id: int,
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get AI-predicted optimal conditions for a specific grow"""
    # Fetch the grow and verify ownership
    grow = db.query(Grow).filter(Grow.id == grow_id, Grow.user_id == current_user.id).first()
    if grow is None:
        raise HTTPException(status_code=404, detail="Grow not found")
    
    # Validate required data for milestone prediction
    if not grow.species:
        raise HTTPException(status_code=400, detail="Species is required for milestone prediction")
    
    if not grow.variant:
        raise HTTPException(status_code=400, detail="Variant is required for milestone prediction")
    
    if not grow.spawn_type:
        raise HTTPException(status_code=400, detail="Spawn type is required for milestone prediction")
    
    if not grow.bulk_type:
        raise HTTPException(status_code=400, detail="Bulk type is required for milestone prediction")
    
    # Prepare input parameters
    species = grow.species
    variant = grow.variant or "standard"
    spawn_type = grow.spawn_type
    bulk_type = grow.bulk_type
    
    # Generate hash of current inputs
    current_hash = generate_input_hash(species, variant, spawn_type, bulk_type)
    
    # Check if we have cached conditions with the same input hash
    if (grow.conditions_inputs_hash and 
        grow.conditions_inputs_hash == current_hash and
        grow.optimal_spawn_temp_low is not None and
        grow.optimal_spawn_temp_high is not None and
        grow.optimal_bulk_temp_low is not None and
        grow.optimal_bulk_temp_high is not None and
        grow.optimal_bulk_relative_humidity_low is not None and
        grow.optimal_bulk_relative_humidity_high is not None and
        grow.optimal_bulk_co2_low is not None and
        grow.optimal_bulk_co2_high is not None and
        grow.optimal_fruiting_temp_low is not None and
        grow.optimal_fruiting_temp_high is not None and
        grow.optimal_fruiting_relative_humidity_low is not None and
        grow.optimal_fruiting_relative_humidity_high is not None and
        grow.optimal_fruiting_co2_low is not None and
        grow.optimal_fruiting_co2_high is not None and
        grow.optimal_fruiting_light_low is not None and
        grow.optimal_fruiting_light_high is not None and False):
        print(f"DEBUG: Using cached optimal conditions for grow {grow_id}")
        return {
            "optimal_spawn_temp_low": grow.optimal_spawn_temp_low,
            "optimal_spawn_temp_high": grow.optimal_spawn_temp_high,
            "optimal_bulk_temp_low": grow.optimal_bulk_temp_low,
            "optimal_bulk_temp_high": grow.optimal_bulk_temp_high,
            "optimal_bulk_relative_humidity_low": grow.optimal_bulk_relative_humidity_low,
            "optimal_bulk_relative_humidity_high": grow.optimal_bulk_relative_humidity_high,
            "optimal_bulk_co2_low": grow.optimal_bulk_co2_low,
            "optimal_bulk_co2_high": grow.optimal_bulk_co2_high,
            "optimal_fruiting_temp_low": grow.optimal_fruiting_temp_low,
            "optimal_fruiting_temp_high": grow.optimal_fruiting_temp_high,
            "optimal_fruiting_relative_humidity_low": grow.optimal_fruiting_relative_humidity_low,
            "optimal_fruiting_relative_humidity_high": grow.optimal_fruiting_relative_humidity_high,
            "optimal_fruiting_co2_low": grow.optimal_fruiting_co2_low,
            "optimal_fruiting_co2_high": grow.optimal_fruiting_co2_high,
            "optimal_fruiting_light_low": grow.optimal_fruiting_light_low,
            "optimal_fruiting_light_high": grow.optimal_fruiting_light_high,
        }
    
    print(f"DEBUG: Generating new optimal conditions for grow {grow_id}")

    # Load configuration
    config = load_config()
    anthropic_api_key = config.get("anthropic_api_key")
    if not anthropic_api_key:
        raise HTTPException(status_code=500, detail="Anthropic API key not configured")
    
    # System prompt for AI predictions
    system_prompt = """You are an expert mycologist and trusted mushroom cultivator with extensive knowledge of mushroom cultivation timelines. 
    You provide accurate predictions for cultivation milestones based on species, variety, spawn types, and bulk substrate types. You also are
    an expert in optimal growing conditions and environmental factors that affect mushroom growth.
    Always provide dates in YYYY-MM-DD format and ensure logical progression."""
    
    # User prompt for AI predictions
    user_prompt = f"""Based on the following mushroom monotub grow parameters:

Species: {species}
Variant: {variant}
Spawn Type: {spawn_type}
Bulk Type: {bulk_type}

Provide the optimal temperature range for spawn colonization as a decimal number in Fahrenheit for the following fields:
"optimal_spawn_temp_low": Lower bound of the optimal temperature range for spawn colonization
"optimal_spawn_temp_high": Upper bound of the optimal temperature range for spawn colonization

Provide the optimal ranges for temperature, relative humidity right next to the substrate surface, and CO2 levels during bulk colonization
as decimal numbers in Fahrenheit, percentage, and parts per million respectively for the following fields:
"optimal_bulk_temp_low": Lower bound of the optimal temperature range for bulk colonization
"optimal_bulk_temp_high": This is the upper bound of the optimal temperature range for bulk colonization
"optimal_bulk_relative_humidity_low": Lower bound of optimal relative humidity level for bulk colonization in percentage
"optimal_bulk_relative_humidity_high": Upper bound of optimal relative humidity level for bulk colonization in percentage
"optimal_bulk_co2_low": Lower bound of optimal CO2 level for bulk colonization in parts per million
"optimal_bulk_co2_high": Upper bound of optimal CO2 level for bulk colonization in parts per million

Provide the optimal ranges for temperature, relative humidity right next to the substrate surface, CO2 levels, and light during fruiting
as decimal numbers in Fahrenheit, percentage, parts per million, and lux respectively for the following fields
"optimal_fruiting_temp_low": Lower bound of the optimal temperature range for fruiting
"optimal_fruiting_temp_high": Upper bound of the optimal temperature range for fruiting
"optimal_fruiting_relative_humidity_low": Lower bound of optimal relative humidity level for fruiting in percentage
"optimal_fruiting_relative_humidity_high": Upper bound of optimal relative humidity level for fruiting in percentage
"optimal_fruiting_co2_low": Lower bound of optimal CO2 level for fruiting in parts per million
"optimal_fruiting_co2_high": Upper bound of optimal CO2 level for fruiting in parts per million
"optimal_fruiting_light_low": Lower bound of optimal light level for fruiting in lux
"optimal_fruiting_light_high": Upper bound of optimal light level for fruiting in lux

Skip the preamble in your response and only return the JSON object with the provided fields."""

    ac = anthropic.Anthropic(api_key=anthropic_api_key)
    
    message = ac.messages.create(
        model="claude-3-7-sonnet-20250219",
        max_tokens=1024,
        temperature=0.1,
        system=system_prompt,
        messages=[
            {"role": "user", "content": user_prompt},
            {"role": "assistant", "content": "{"}
        ]
    )

    print(f"DEBUG: Anthropic API response: {message}")
    conditions = message.content[0].text
    conditions = "{" + conditions
    print(f"DEBUG: Optimal conditions response: {conditions}")
    conditions = json.loads(conditions)
    
    # Cache the conditions in the database
    grow.optimal_spawn_temp_low = conditions["optimal_spawn_temp_low"]
    grow.optimal_spawn_temp_high = conditions["optimal_spawn_temp_high"]
    grow.optimal_bulk_temp_low = conditions["optimal_bulk_temp_low"]
    grow.optimal_bulk_temp_high = conditions["optimal_bulk_temp_high"]
    grow.optimal_bulk_relative_humidity_low = conditions["optimal_bulk_relative_humidity_low"]
    grow.optimal_bulk_relative_humidity_high = conditions["optimal_bulk_relative_humidity_high"]
    grow.optimal_bulk_co2_low = conditions["optimal_bulk_co2_low"]
    grow.optimal_bulk_co2_high = conditions["optimal_bulk_co2_high"]
    grow.optimal_fruiting_temp_low = conditions["optimal_fruiting_temp_low"]
    grow.optimal_fruiting_temp_high = conditions["optimal_fruiting_temp_high"]
    grow.optimal_fruiting_relative_humidity_low = conditions["optimal_fruiting_relative_humidity_low"]
    grow.optimal_fruiting_relative_humidity_high = conditions["optimal_fruiting_relative_humidity_high"]
    grow.optimal_fruiting_co2_low = conditions["optimal_fruiting_co2_low"]
    grow.optimal_fruiting_co2_high = conditions["optimal_fruiting_co2_high"]
    grow.optimal_fruiting_light_low = conditions["optimal_fruiting_light_low"]
    grow.optimal_fruiting_light_high = conditions["optimal_fruiting_light_high"]
    grow.conditions_inputs_hash = current_hash
    
    db.commit()
    db.refresh(grow)
    
    return conditions


@router.get("/{grow_id}/milestones", response_model=MilestoneResponse)
async def get_grow_milestones(
    grow_id: int,
    db: Session = Depends(get_grow_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get AI-predicted milestones for a specific grow"""
    # Fetch the grow and verify ownership
    grow = db.query(Grow).filter(Grow.id == grow_id, Grow.user_id == current_user.id).first()
    if grow is None:
        raise HTTPException(status_code=404, detail="Grow not found")
    
    # Validate required data for milestone prediction
    if not grow.species:
        raise HTTPException(status_code=400, detail="Species is required for milestone prediction")
    
    if not grow.variant:
        raise HTTPException(status_code=400, detail="Variant is required for milestone prediction")
    
    if not grow.spawn_type:
        raise HTTPException(status_code=400, detail="Spawn type is required for milestone prediction")
    
    if not grow.bulk_type:
        raise HTTPException(status_code=400, detail="Bulk type is required for milestone prediction")
    
    if not grow.inoculation_date:
        raise HTTPException(status_code=400, detail="Inoculation date is required for milestone prediction")
    
    # Prepare input parameters
    species = grow.species
    variant = grow.variant or "standard"
    spawn_type = grow.spawn_type
    bulk_type = grow.bulk_type
    inoculation_date = grow.inoculation_date.strftime("%Y-%m-%d")
    
    # Generate hash of current inputs
    current_hash = generate_input_hash(species, variant, spawn_type, bulk_type, inoculation_date)
    
    # Check if we have cached predictions with the same input hash
    if (grow.prediction_inputs_hash and 
        grow.prediction_inputs_hash == current_hash and
        grow.predicted_full_spawn_colonization and
        grow.predicted_full_bulk_colonization and
        grow.predicted_first_harvest_date):
        
        print(f"DEBUG: Using cached predictions for grow {grow_id}")
        return {
            "full_spawn_colonization": grow.predicted_full_spawn_colonization.strftime("%Y-%m-%d"),
            "full_bulk_colonization": grow.predicted_full_bulk_colonization.strftime("%Y-%m-%d"),
            "first_harvest_date": grow.predicted_first_harvest_date.strftime("%Y-%m-%d")
        }
    
    print(f"DEBUG: Generating new predictions for grow {grow_id}")
    
    # Load configuration
    config = load_config()
    anthropic_api_key = config.get("anthropic_api_key")
    if not anthropic_api_key:
        raise HTTPException(status_code=500, detail="Anthropic API key not configured")
    
    # System prompt for AI predictions
    system_prompt = """You are an expert mycologist and trusted mushroom cultivator with extensive knowledge of mushroom cultivation timelines. 
    You provide accurate predictions for cultivation milestones based on species, variety, spawn types, and bulk substrate types. You also are
    an expert of optimal growing conditions and environmental factors that affect mushroom growth.
    Always provide dates in YYYY-MM-DD format and ensure logical progression."""
    
    # User prompt for AI predictions
    user_prompt = f"""Based on the following grow parameters:

Species: {species}
Variant: {variant}
Spawn Type: {spawn_type}
Bulk Type: {bulk_type}
Inoculation Date: {inoculation_date}

Provide date predictions for the following fields:
"full_spawn_colonization": This is the date when spawn is fully colonized
"full_bulk_colonization": This is the date when bulk substrate is fully colonized 
"first_harvest_date": This is the date when the harvest of the first flush can be expected

Assume optimal growing conditions throughout the grow based on the provided parameters
and consider typical cultivation timelines for this species, variety, spawn type, bulk substrate type.
Ensure dates progress logically from the inoculation date. Skip the preamble in your response and only 
return the JSON object with the provided fields."""

    ac = anthropic.Anthropic(api_key=anthropic_api_key)
    
    message = ac.messages.create(
        model="claude-3-7-sonnet-20250219",
        max_tokens=1024,
        temperature=0.1,
        system=system_prompt,
        messages=[
            {"role": "user", "content": user_prompt},
            {"role": "assistant", "content": "{"}
        ]
    )

    print(f"DEBUG: Anthropic API response: {message}")
    schedule = message.content[0].text
    schedule = "{" + schedule
    print(f"DEBUG: Milestones response: {schedule}")
    schedule = json.loads(schedule)

    # Validate logical date progression
    s2b_date = datetime.strptime(schedule["full_spawn_colonization"], "%Y-%m-%d").date()
    fruiting_date = datetime.strptime(schedule["full_bulk_colonization"], "%Y-%m-%d").date() 
    harvest_date = datetime.strptime(schedule["first_harvest_date"], "%Y-%m-%d").date()
    
    if not (grow.inoculation_date < s2b_date < fruiting_date < harvest_date):
        raise HTTPException(status_code=500, detail="Milestone dates are not in logical progression")
    
    # Cache the predictions in the database
    grow.predicted_full_spawn_colonization = s2b_date
    grow.predicted_full_bulk_colonization = fruiting_date
    grow.predicted_first_harvest_date = harvest_date
    grow.prediction_inputs_hash = current_hash
    
    db.commit()
    db.refresh(grow)
    
    return schedule
