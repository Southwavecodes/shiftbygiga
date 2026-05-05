from database import SessionLocal, engine, Base
from models import Staff
from staff_data import STAFF_NAMES


def reset_staff():
    db = SessionLocal()
    try:
        db.query(Staff).delete()
        db.add_all([Staff(name=name) for name in STAFF_NAMES])
        db.commit()
        print(f"Database reset with {len(STAFF_NAMES)} staff members.")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    reset_staff()
