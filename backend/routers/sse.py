import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sse_starlette import EventSourceResponse
import jwt
from typing import Optional

from backend.database import get_mycomize_db
from backend.models.user import User
from backend.services.sse_service import sse_manager
from backend.security import jwt_secret_key, ALGORITHM, get_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sse", tags=["sse"])

async def get_current_active_user_from_token(token: str, db: Session) -> User:
    """
    Get the current active user from a JWT token for SSE connections.
    This is a secure implementation that validates the token and user status.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, jwt_secret_key, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        
        if username is None:
            logger.warning("Username not found in token payload")
            raise credentials_exception
            
    except jwt.ExpiredSignatureError:
        logger.warning("Token has expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {e}")
        raise credentials_exception

    user = get_user(db, username=username)
    if user is None:
        logger.warning(f"User not found: {username}")
        raise credentials_exception

    if not user.is_active:
        logger.warning(f"Inactive user attempted SSE connection: {username}")
        raise HTTPException(status_code=400, detail="Inactive user")

    return user

@router.get("/payment-status")
async def payment_status_stream(
    token: str = Query(..., description="JWT authentication token"),
    db: Session = Depends(get_mycomize_db)
):
    """
    Server-Sent Events endpoint for real-time payment status updates.
    
    Authentication is handled via query parameter since EventSource API
    doesn't support custom headers.
    """
    try:
        # Authenticate and get the active user
        current_user = await get_current_active_user_from_token(token, db)
        
        logger.info(f"SSE connection established for user {current_user.id}")
        
        # Create event generator for this user
        event_generator = await sse_manager.create_event_generator(current_user.id)
        
        return EventSourceResponse(
            event_generator,
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
        
    except HTTPException as e:
        logger.error(f"SSE authentication failed: {e.detail}")
        raise e
    except Exception as e:
        logger.error(f"Unexpected error in SSE endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/health")
async def sse_health():
    """Health check endpoint for SSE service"""
    connection_count = sse_manager.get_connection_count()
    return {
        "status": "healthy",
        "active_connections": connection_count,
        "service": "sse"
    }
