from typing import List, Any
from datetime import date


def generate_weekly_roster(staff_list: List[Any], week_number: int):
    """
    Generates a fair weekly roster for exactly 33 staff.

    Formula: the roster window advances by 5 positions each week (one full
    daily team). This guarantees every staff member works the same number of
    Sundays, the same spread of night-shift days, and the same number of
    double-shift weeks over the 33-week full cycle.

    staff_list  : List of Staff objects ordered by ID (must be 33 items)
    week_number : 1-based week index relative to the anchor date
    """
    num_staff = len(staff_list)
    if num_staff == 0:
        return {"sunday": [], "nights": {}, "next_sunday_start": 0}

    # ── 1. Starting position advances by 5 each week ─────────────────────────
    # gcd(5, 33) = 1  →  full cycle resets after exactly 33 weeks,
    # so every staff member visits every slot position once per cycle.
    start = ((week_number - 1) * 5) % num_staff

    # ── 2. Sunday team: 5 consecutive staff from start ───────────────────────
    # Consecutive selection means the Sunday gap for any person is a uniform
    # 6–7 weeks (never shorter, never longer).
    sunday_team = [staff_list[(start + i) % num_staff] for i in range(5)]

    # ── 3. Night pool: the remaining 28 staff ────────────────────────────────
    sunday_ids = {s.id for s in sunday_team}
    night_pool = [staff_list[(start + 5 + i) % num_staff] for i in range(num_staff - 5)]
    # night_pool has 28 people; we need 30 slots (5 per night × 6 nights),
    # so exactly 2 staff will appear twice — always pool[0] and pool[1],
    # which means they work Mon AND Sat (a 5-day gap within the same week).

    # ── 4. Fill 30 night slots sequentially ──────────────────────────────────
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    pool_size  = len(night_pool)   # 28
    night_shifts = {}
    pool_ptr = 0

    for day in days:
        daily_team = [night_pool[(pool_ptr + j) % pool_size] for j in range(5)]
        pool_ptr += 5
        night_shifts[day] = daily_team

    return {
        "week_number":       week_number,
        "sunday":            sunday_team,
        "nights":            night_shifts,
        "next_sunday_start": (start + 5) % num_staff,
    }


def get_week_number(requested_date: date, anchor_date: date) -> int:
    """
    Returns the 1-based rotation week number for a given date.
    Anchor date (June 1 2026, a Monday) is the start of Week 1.
    """
    delta = requested_date - anchor_date
    return (delta.days // 7) + 1
