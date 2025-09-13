from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from typing import Annotated

from backend.models.user import User
from backend.schemas.user import UserCreate, UserResponse, Token, ChangePassword, UserProfileImageUpdate
from backend.database import get_mycomize_db, engine
from backend.security import (
    get_password_hash,
    verify_password,
    authenticate_user,
    create_access_token,
    get_current_active_user,
    get_current_paid_user,
    access_token_expiration
)

# Create the models
from backend.models.user import Base
Base.metadata.create_all(bind=engine)

router = APIRouter(
    prefix="/auth",
    tags=["authentication"],
    responses={401: {"detail": "Not authenticated"}},
)

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user: UserCreate, db: Session = Depends(get_mycomize_db)):
    """Register a new user"""
    # Check if user already exists
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        print(f"User {user.username} already exists")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )

    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        hashed_password=hashed_password,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )

    # Add to database
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user

@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_mycomize_db)
):
    print(f"Attempting to authenticate user {form_data.username}")
    """Login and get access token"""
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        print(f"Authentication failed for user {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create access token
    access_token_expires = timedelta(minutes=access_token_expiration)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """Get current user information"""
    return current_user

@router.post("/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    password_data: ChangePassword,
    current_user: User = Depends(get_current_paid_user),
    db: Session = Depends(get_mycomize_db)
):
    """Change user password"""
    # Verify current password
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Hash new password and update
    new_hashed_password = get_password_hash(password_data.new_password)
    current_user.hashed_password = new_hashed_password
    current_user.updated_at = datetime.now()
    
    db.commit()
    
    return {"message": "Password changed successfully"}

@router.put("/profile-image", response_model=UserResponse)
async def update_profile_image(
    profile_data: UserProfileImageUpdate,
    current_user: User = Depends(get_current_paid_user),
    db: Session = Depends(get_mycomize_db)
):
    """Update user profile image"""
    # Update profile image
    current_user.profile_image = profile_data.profile_image
    current_user.updated_at = datetime.now()
    
    db.commit()
    db.refresh(current_user)
    
    return current_user
