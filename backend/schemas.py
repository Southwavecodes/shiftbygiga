from pydantic import BaseModel
from typing import List, Dict

class StaffBase(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class RosterResponse(BaseModel):
    week_number: int
    sunday: List[StaffBase]
    nights: Dict[str, List[StaffBase]]
    next_sunday_start: int
