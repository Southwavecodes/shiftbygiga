from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, date, timedelta
from io import BytesIO
import calendar

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from database import engine, Base, get_db
from models import Staff, Config
from schemas import RosterResponse, StaffBase
from rotation_logic import generate_weekly_roster, get_week_number
from staff_data import STAFF_NAMES

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Shift Management System API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ANCHOR_DATE = date(2026, 6, 1)


@app.on_event("startup")
def startup_populate_db():
    db = next(get_db())
    if not db.query(Config).filter(Config.key == "anchor_date").first():
        db.add(Config(key="anchor_date", value=ANCHOR_DATE.isoformat()))
        db.commit()

    if db.query(Staff).count() == 0:
        db.add_all([Staff(name=name) for name in STAFF_NAMES])
        db.commit()


# --- Staff CRUD ---

@app.get("/api/staff", response_model=List[StaffBase])
def get_staff(db: Session = Depends(get_db)):
    return db.query(Staff).order_by(Staff.id).all()


@app.post("/api/staff", response_model=StaffBase)
def create_staff(staff: StaffBase, db: Session = Depends(get_db)):
    if db.query(Staff).count() >= 33:
        raise HTTPException(status_code=400, detail="System strictly limited to 33 staff members. Remove one first.")
    new_staff = Staff(name=staff.name)
    db.add(new_staff)
    db.commit()
    db.refresh(new_staff)
    return new_staff


@app.put("/api/staff/{staff_id}", response_model=StaffBase)
def update_staff(staff_id: int, staff_data: StaffBase, db: Session = Depends(get_db)):
    db_staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not db_staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    db_staff.name = staff_data.name
    db.commit()
    db.refresh(db_staff)
    return db_staff


@app.delete("/api/staff/{staff_id}")
def delete_staff(staff_id: int, db: Session = Depends(get_db)):
    db_staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not db_staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    db.delete(db_staff)
    db.commit()
    return {"message": "Staff removed successfully"}


# --- Roster Logic ---

@app.get("/api/roster/date/{date_str}", response_model=RosterResponse)
def get_roster_by_date(date_str: str, db: Session = Depends(get_db)):
    try:
        requested_date = date.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    all_staff = db.query(Staff).order_by(Staff.id).all()
    if len(all_staff) != 33:
        raise HTTPException(status_code=400, detail=f"System requires exactly 33 staff members. Currently: {len(all_staff)}")

    week_num = get_week_number(requested_date, ANCHOR_DATE)
    roster = generate_weekly_roster(all_staff, week_num)
    return roster


@app.get("/api/roster/month/{year}/{month}")
def get_calendar_month(year: int, month: int, db: Session = Depends(get_db)):
    all_staff = db.query(Staff).order_by(Staff.id).all()
    if len(all_staff) != 33:
        return {"error": "System requires exactly 33 staff members", "count": len(all_staff)}

    first_day = date(year, month, 1)
    last_day = date(year, month, calendar.monthrange(year, month)[1])

    weeks = {}
    curr = first_day
    while curr <= last_day:
        week_num = get_week_number(curr, ANCHOR_DATE)
        if week_num not in weeks:
            weeks[week_num] = generate_weekly_roster(all_staff, week_num)
        curr += timedelta(days=1)

    return {"year": year, "month": month, "weeks": weeks}


@app.get("/api/roster/export/pdf/{year}/{month}")
def export_roster_pdf(year: int, month: int, db: Session = Depends(get_db)):
    all_staff = db.query(Staff).order_by(Staff.id).all()
    if len(all_staff) != 33:
        raise HTTPException(status_code=400, detail="System requires exactly 33 staff members")

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4), rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=18,
        alignment=1,
        spaceAfter=20,
        textColor=colors.HexColor("#1e293b")
    )
    cell_style = ParagraphStyle('CellBody', fontSize=7, leading=8)

    month_name = calendar.month_name[month]
    elements = [Paragraph(f"Shift Roster: {month_name} {year}", title_style)]

    days_of_week = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    first_day = date(year, month, 1)
    last_day = date(year, month, calendar.monthrange(year, month)[1])

    # Offset leading empty cells so the first day lands on the right column
    start_day_idx = (first_day.weekday() + 1) % 7
    current_row = [""] * start_day_idx

    data = [days_of_week]
    curr = first_day
    while curr <= last_day:
        week_num = get_week_number(curr, ANCHOR_DATE)
        roster = generate_weekly_roster(all_staff, week_num)

        day_name = days_of_week[(curr.weekday() + 1) % 7]
        if day_name == "Sun":
            staff_names = [s.name for s in roster["sunday"]]
        else:
            staff_names = [s.name for s in roster["nights"].get(day_name, [])]

        cell_content = f"<b>{curr.day}</b><br/>" + "<br/>".join(staff_names)
        current_row.append(Paragraph(cell_content, cell_style))

        if len(current_row) == 7:
            data.append(current_row)
            current_row = []

        curr += timedelta(days=1)

    if current_row:
        current_row += [""] * (7 - len(current_row))
        data.append(current_row)

    t = Table(data, colWidths=[110] * 7)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
    ]))

    elements.append(t)
    doc.build(elements)

    pdf_value = buffer.getvalue()
    buffer.close()

    return Response(
        content=pdf_value,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=roster_{year}_{month}.pdf"}
    )


@app.get("/")
def read_root():
    return {"message": "Shift Management System API is running"}
