from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from datetime import date
from backend.database import Base

class Grow(Base):
    """Grow model for mushroom cultivation tracking"""
    __tablename__ = "grows"

    id = Column(Integer, primary_key=True, index=True)
    species = Column(String, index=True)
    variant = Column(String)
    inoculation_date = Column(Date)
    spawn_substrate = Column(String)
    bulk_substrate = Column(String)
    
    # Foreign key to user
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Relationship with User (back reference)
    user = relationship("User", back_populates="grows")
