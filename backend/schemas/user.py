from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

    @validator('password')
    def password_strength(cls, v):
        """Validate password strength"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

    @validator('username')
    def username_validator(cls, v):
        """Validate username"""
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters long')
        return v

class UserLogin(UserBase):
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class ChangePassword(BaseModel):
    current_password: str
    new_password: str

    @validator('new_password')
    def new_password_strength(cls, v):
        """Validate new password strength"""
        if len(v) < 8:
            raise ValueError('New password must be at least 8 characters long')
        return v

class UserProfileImageUpdate(BaseModel):
    profile_image: str  # Base64 encoded image data

class UserResponse(UserBase):
    id: int
    profile_image: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
