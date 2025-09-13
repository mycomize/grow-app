import math
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List

from backend.models.order import Order
from backend.models.user import User
from backend.schemas.order import OrderResponse, OrderListResponse
from backend.database import get_mycomize_db
from backend.routers.auth import get_current_active_user

router = APIRouter(
    prefix="/orders",
    tags=["orders"],
)


def get_user_orders(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 20
) -> tuple[List[Order], int]:
    """Retrieve paginated user orders with total count"""
    # Get total count of orders for this user
    total = db.query(Order).filter(Order.user_id == user_id).count()
    
    # Get paginated orders, ordered by created_at descending (newest first)
    orders = (
        db.query(Order)
        .filter(Order.user_id == user_id)
        .order_by(Order.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    return orders, total


@router.get("/", response_model=OrderListResponse)
async def get_orders(
    page: int = Query(1, ge=1, description="Page number (starts from 1)"),
    size: int = Query(20, ge=1, le=100, description="Number of orders per page"),
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get paginated list of orders for the authenticated user.
    
    - **page**: Page number (starts from 1)
    - **size**: Number of orders per page (1-100)
    
    Returns orders sorted by creation date (newest first) with pagination metadata.
    """
    try:
        # Calculate skip value for pagination
        skip = (page - 1) * size
        
        # Get user orders and total count
        orders, total = get_user_orders(
            db=db,
            user_id=current_user.id,
            skip=skip,
            limit=size
        )
        
        # Calculate total pages
        pages = math.ceil(total / size) if total > 0 else 1
        
        # Convert orders to response models
        order_responses = [OrderResponse.model_validate(order) for order in orders]
        
        return OrderListResponse(
            orders=order_responses,
            total=total,
            page=page,
            size=size,
            pages=pages
        )
        
    except Exception as e:
        print(f"Error retrieving orders for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving orders"
        )


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order_by_id(
    order_id: int,
    db: Session = Depends(get_mycomize_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific order by ID for the authenticated user.
    
    - **order_id**: The ID of the order to retrieve
    
    Returns the order details if it belongs to the authenticated user.
    """
    try:
        # Query for the order, ensuring it belongs to the current user
        order = (
            db.query(Order)
            .filter(Order.id == order_id, Order.user_id == current_user.id)
            .first()
        )
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        return OrderResponse.model_validate(order)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error retrieving order {order_id} for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving order"
        )
