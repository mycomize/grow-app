import bcrypt
import json
import jwt

from jwt import PyJWKClient
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from backend.schemas.user import TokenData
from backend.models.user import User
from backend.database import get_mycomize_db

# Security configurations
ALGORITHM = "HS256"
TOKEN_URL = "token"

def load_config(config_file="config/config.json"):
    """Load configuration from a JSON file"""
    with open(config_file, 'r') as f:
        config = json.load(f)
    return config

# OAuth2 scheme for token handling
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=TOKEN_URL)

# Config
config = load_config()
jwt_secret_key = config["jwt_secret_key"]
access_token_expiration = config["access_token_expiration"]

def verify_password(plain_password, hashed_password):
    """Verify a password against a hash"""
    password_utf8_enc = plain_password.encode('utf-8')
    return bcrypt.checkpw(password_utf8_enc, hashed_password)

def get_password_hash(password):
    """Hash a password"""
    password_utf8_enc = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password_utf8_enc, salt)

    return hashed_password

def get_user(db: Session, username: str):
    """Get a user by username"""
    return db.query(User).filter(User.username == username).first()

def authenticate_user(db: Session, username: str, password: str):
    """Authenticate a user by username and password"""
    user = get_user(db, username)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=access_token_expiration)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, jwt_secret_key, algorithm=ALGORITHM)

    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_mycomize_db)):
    """Get the current user from the JWT token"""
    print(f"Token received: {token}")
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, jwt_secret_key, algorithms=[ALGORITHM])
        username: str = payload.get("sub")

        if username is None:
            print("Username not found in token payload")
            raise credentials_exception

        token_data = TokenData(username=username)
    except jwt.ExpiredSignatureError:
        print("Token has expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        print("Invalid token")
        raise credentials_exception

    user = get_user(db, username=token_data.username)
    if user is None:
        raise credentials_exception

    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    """Get the current active user"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    return current_user
