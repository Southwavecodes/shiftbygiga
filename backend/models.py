from sqlalchemy import Column, Integer, String, Date
from database import Base

class Staff(Base):
    __tablename__ = "staff"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)

class Config(Base):
    __tablename__ = "config"
    key = Column(String, primary_key=True)
    value = Column(String)
