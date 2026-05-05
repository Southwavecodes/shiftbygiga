# Shift OS — Rotation Management System

A fair, automatic shift roster for exactly 33 staff members across a 7-day week.

---

## How the Rotation Formula Works (Plain English)

### The Basic Setup

Every week has 7 days and needs **5 staff per day**, giving us **35 shift-slots** to fill. But we only have **33 staff**. That means 2 people must work twice in any given week — there is no way around this with these numbers. The goal of the formula is to make sure that burden rotates fairly so no one gets stuck with it more than anyone else.

---

### Imagining the Staff as a Circle

Picture all 33 staff members standing in a circle, each assigned a number from 1 to 33. The roster works by pointing at a position on that circle and reading off groups of 5.

Every week, the pointer moves **5 steps forward** around the circle.

That's it. That one rule drives the entire system.

---

### What Happens Each Week

**Step 1 — Pick the Sunday Team.**
Starting from wherever the pointer is, the next 5 consecutive people on the circle form the Sunday team.

**Step 2 — Build the Night Pool.**
Everyone not on Sunday duty (the remaining 28 people) goes into the night pool, in the same circular order.

**Step 3 — Fill the Night Shifts.**
The night pool fills the 6 nights in order — Monday gets the first 5 people in the pool, Tuesday gets the next 5, Wednesday the next 5, and so on through Saturday. Because the pool has 28 people but we need 30 slots, the last 2 spots on Saturday wrap back to the start of the pool. Those 2 people work both Monday and Saturday that week — a 5-day gap between their two shifts, which is the most comfortable double possible.

---

### Why Moving 5 Steps Is the Right Number

Moving the pointer by exactly 5 each week (the size of one daily team) is not arbitrary — it has a specific mathematical property:

> **The greatest common divisor of 5 and 33 is 1.**

In plain terms: 5 and 33 share no common factors. This means the pointer will visit every single position on the circle before it ever repeats — and it takes exactly **33 weeks** to complete one full lap. At that point the whole pattern resets and starts again.

If we moved by 3 instead, the pointer would only ever visit 11 of the 33 positions (because 3 and 33 share the factor 3), leaving 22 staff members permanently in the same slot. Moving by 5 avoids this entirely.

---

### What Every Staff Member Gets Over 33 Weeks

Because the pointer visits every position exactly once per 33-week cycle, the distribution is perfectly even:

| | Per person per 33-week cycle |
|---|---|
| Sunday shifts | **5** |
| Night shifts (spread across all days of the week) | **30** |
| Weeks working two shifts | **2** |
| Total shifts worked | **35** |

Every single person ends up with the same numbers. No one works more Sundays than anyone else. No one gets stuck with Monday night every week. The two double-shift weeks each person has are spaced roughly **16 weeks apart**, giving plenty of recovery time in between.

---

### How This Compares to the Previous Formula

The old formula moved the pointer by 2 steps each week and selected the Sunday team by picking every 7th person from the starting point (rather than 5 consecutive people).

This caused three problems:

1. **Uneven Sunday gaps.** Because the Sunday team was picked by skipping 7 positions at a time within a pool of 33, some staff members would go 3 weeks between Sundays while others waited 10+ weeks. It depended entirely on where your number fell.

2. **Night-shift bias.** Filling the night pool sequentially from low-numbered IDs meant those staff almost always landed on Monday or Tuesday nights. Higher-numbered staff ended up on Fridays and Saturdays more often.

3. **Double-shift burden was unpredictable.** The two people working twice in a week were always in a specific part of the pool, and it was not obvious or evenly distributed when each person would face it.

The new formula eliminates all three issues.

---

### The 33-Week Calendar

One full rotation cycle is **33 weeks** (roughly 8 months). After those 33 weeks every staff member will have worked identical totals and the cycle begins again automatically — no manual resets needed.

---

### Anchor Date

The system counts weeks relative to **June 1, 2026** (a Monday), which is defined as the start of Week 1. Every date the system calculates is derived from how many full weeks have passed since that anchor.

---

## Running the System Locally

**Requirements:** Docker Desktop must be running.

```bash
# Start everything (database + backend + frontend)
docker compose up --build -d

# Frontend: http://localhost:3001
# Backend API: http://localhost:8000
# API docs: http://localhost:8000/docs
```

```bash
# Stop everything
docker compose down
```

---

## Project Structure

```
shiftbygiga/
├── backend/
│   ├── main.py            — API routes and startup seeding
│   ├── rotation_logic.py  — The rotation formula (start here to understand the math)
│   ├── models.py          — Database models
│   ├── schemas.py         — Request/response shapes
│   └── database.py        — Database connection
├── frontend/
│   └── src/app/
│       ├── page.tsx       — Main calendar and staff views
│       └── globals.css    — Global styles
└── docker-compose.yml
```
