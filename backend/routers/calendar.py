from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.models.calendar_task import CalendarTask
from backend.models.grow import BulkGrow
from backend.models.user import User
from backend.schemas.calendar_task import (
    CalendarTaskCreate,
    CalendarTask as CalendarTaskSchema,
    CalendarTaskUpdate,
    CalendarTaskResponse,
    CalendarTaskBulkCreate,
    CalendarTaskBulkResponse
)
from backend.database import get_mycomize_db, engine
from backend.security import get_current_paid_user

# Create the models
from backend.models.calendar_task import Base
Base.metadata.create_all(bind=engine)

router = APIRouter(
    prefix="/calendar-tasks",
    tags=["calendar-tasks"],
    responses={401: {"detail": "Not authenticated"}},
)


@router.post("/", response_model=CalendarTaskResponse, status_code=status.HTTP_201_CREATED)
async def create_calendar_task(
    task: CalendarTaskCreate,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_paid_user)
):
    """Create a new calendar task"""
    # Verify the grow exists and belongs to the current user
    grow = db.query(BulkGrow).filter(
        BulkGrow.id == task.grow_id,
        BulkGrow.user_id == current_user.id
    ).first()
    if not grow:
        raise HTTPException(status_code=404, detail="Grow not found")

    # Create the calendar task - store encrypted values directly
    db_task = CalendarTask(
        parent_task_id=task.parent_task_id,
        grow_id=task.grow_id,
        action=task.action,
        stage_key=task.stage_key,
        date=task.date,
        time=task.time,
        status=task.status
    )

    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


@router.post("/bulk", response_model=CalendarTaskBulkResponse, status_code=status.HTTP_201_CREATED)
async def create_calendar_tasks_bulk(
    bulk_data: CalendarTaskBulkCreate,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_paid_user)
):
    """Create multiple calendar tasks in a single request"""
    if not bulk_data.tasks:
        raise HTTPException(status_code=400, detail="No tasks provided for bulk creation")
    
    # Verify all grows exist and belong to the current user
    grow_ids = list(set(task.grow_id for task in bulk_data.tasks))
    
    for grow_id in grow_ids:
        grow = db.query(BulkGrow).filter(
            BulkGrow.id == grow_id,
            BulkGrow.user_id == current_user.id
        ).first()

        if not grow:
            raise HTTPException(status_code=404, detail=f"Grow {grow_id} not found")

    # Create all calendar tasks in a single transaction
    created_tasks = []
    
    for task_data in bulk_data.tasks:
        db_task = CalendarTask(
            parent_task_id=task_data.parent_task_id,
            grow_id=task_data.grow_id,
            action=task_data.action,
            stage_key=task_data.stage_key,
            date=task_data.date,
            time=task_data.time,
            status=task_data.status
        )
        db.add(db_task)
        created_tasks.append(db_task)
    
    db.commit()
    
    # Refresh all tasks to get their IDs and timestamps
    for task in created_tasks:
        db.refresh(task)
    
    return CalendarTaskBulkResponse(
        tasks=created_tasks,
        created_count=len(created_tasks)
    )


@router.get("/", response_model=List[CalendarTaskResponse])
async def read_calendar_tasks(
    grow_id: Optional[int] = None,
    parent_task_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_paid_user)
):
    """Get calendar tasks with optional filtering"""
    query = db.query(CalendarTask).join(BulkGrow).filter(BulkGrow.user_id == current_user.id)
    
    if grow_id is not None:
        query = query.filter(CalendarTask.grow_id == grow_id)
    
    if parent_task_id is not None:
        query = query.filter(CalendarTask.parent_task_id == parent_task_id)
    
    tasks = query.offset(skip).limit(limit).all()
    return tasks


@router.get("/{task_id}", response_model=CalendarTaskResponse)
async def read_calendar_task(
    task_id: int,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_paid_user)
):
    """Get a specific calendar task by ID"""
    task = db.query(CalendarTask).join(BulkGrow).filter(
        CalendarTask.id == task_id,
        BulkGrow.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Calendar task not found")

    return task


@router.put("/{task_id}", response_model=CalendarTaskResponse)
async def update_calendar_task(
    task_id: int,
    task: CalendarTaskUpdate,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_paid_user)
):
    """Update a calendar task"""
    db_task = db.query(CalendarTask).join(BulkGrow).filter(
        CalendarTask.id == task_id,
        BulkGrow.user_id == current_user.id
    ).first()

    if not db_task:
        raise HTTPException(status_code=404, detail="Calendar task not found")

    # Update task attributes - store encrypted values directly
    task_data = task.dict(exclude_unset=True)
    for key, value in task_data.items():
        setattr(db_task, key, value)

    db.commit()
    db.refresh(db_task)
    return db_task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_calendar_task(
    task_id: int,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_paid_user)
):
    """Delete a calendar task"""
    db_task = db.query(CalendarTask).join(BulkGrow).filter(
        CalendarTask.id == task_id,
        BulkGrow.user_id == current_user.id
    ).first()

    if not db_task:
        raise HTTPException(status_code=404, detail="Calendar task not found")

    db.delete(db_task)
    db.commit()
    return {"detail": "Calendar task deleted"}


@router.delete("/by-parent-task/{parent_task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_calendar_tasks_by_parent(
    parent_task_id: str,
    grow_id: int,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_paid_user)
):
    """Delete all calendar tasks for a specific parent task"""
    # Verify the grow belongs to the current user
    grow = db.query(BulkGrow).filter(
        BulkGrow.id == grow_id,
        BulkGrow.user_id == current_user.id
    ).first()
    if not grow:
        raise HTTPException(status_code=404, detail="Grow not found")

    # Delete all calendar tasks for this parent task
    deleted_count = db.query(CalendarTask).filter(
        CalendarTask.parent_task_id == parent_task_id,
        CalendarTask.grow_id == grow_id
    ).delete()

    db.commit()
    return {"detail": f"Deleted {deleted_count} calendar tasks"}
