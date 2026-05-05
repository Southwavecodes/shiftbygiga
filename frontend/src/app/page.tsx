"use client";

import { useState, useEffect } from "react";

interface Staff {
  id: number;
  name: string;
}

interface RosterWeek {
  week_number: number;
  sunday: Staff[];
  nights: { [key: string]: Staff[] };
}

export default function Dashboard() {
  const [mounted, setMounted]         = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 5, 1));
  const [staff, setStaff]             = useState<Staff[]>([]);
  const [weeks, setWeeks]             = useState<{ [key: string]: RosterWeek }>({});
  const [loading, setLoading]         = useState(true);
  const [view, setView]               = useState<"calendar" | "staff">("calendar");
  const [editStaff, setEditStaff]     = useState<Staff | null>(null);
  const [newName, setNewName]         = useState("");
  const [searchTerm, setSearchTerm]   = useState("");

  useEffect(() => { setMounted(true); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const staffRes  = await fetch("/api/staff");
      const staffData = await staffRes.json();
      setStaff(Array.isArray(staffData) ? staffData : []);

      const year  = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const rosterRes  = await fetch(`/api/roster/month/${year}/${month}`);
      const rosterData = await rosterRes.json();
      setWeeks(rosterData?.weeks ?? {});
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (mounted) fetchData(); }, [currentDate, mounted]);

  const handleUpdateStaff = async (id: number, name: string) => {
    await fetch(`/api/staff/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name }),
    });
    setEditStaff(null);
    fetchData();
  };

  const handleAddStaff = async () => {
    if (staff.length >= 33 || !newName.trim()) return;
    await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: 0, name: newName }),
    });
    setNewName("");
    fetchData();
  };

  const handleDeleteStaff = async (id: number) => {
    await fetch(`/api/staff/${id}`, { method: "DELETE" });
    fetchData();
  };

  const daysInMonth     = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const getShiftForDay = (day: number) => {
    const d        = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const anchor   = new Date(2026, 5, 1);
    const diffDays = Math.floor((d.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24));
    const weekNum  = Math.floor(diffDays / 7) + 1;
    const week     = weeks[weekNum];
    if (!week) return null;
    const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
    if (dayName === "Sun") return { type: "Sunday", staff: week.sunday };
    return { type: "Night", staff: week.nights[dayName] || [] };
  };

  const filteredStaff = Array.isArray(staff) ? staff.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  if (!mounted) return <div className="min-h-screen bg-[#0f172a]" />;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">

      {/* ── Header ── */}
      <header className="bg-[#1e293b] border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">

          <div>
            <h1 className="text-xl font-bold text-white">Shift OS</h1>
            <p className="text-sm text-slate-400 mt-0.5">Rotation management system</p>
          </div>

          <nav className="flex gap-1 bg-[#0f172a] p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setView("calendar")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                view === "calendar"
                  ? "bg-sky-500 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              Roster
            </button>
            <button
              onClick={() => setView("staff")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                view === "staff"
                  ? "bg-sky-500 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              Staff
            </button>
          </nav>

          <div className="hidden lg:block text-right">
            <p className="text-sm font-medium text-white">{staff.length} / 33 staff</p>
            <p className={`text-xs mt-0.5 ${staff.length === 33 ? "text-green-400" : "text-amber-400"}`}>
              {staff.length === 33 ? "Roster complete" : "Roster incomplete"}
            </p>
          </div>

        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* ── CALENDAR VIEW ── */}
        {view === "calendar" ? (
          <div className="space-y-6">

            {/* Month navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                className="px-4 py-2 bg-[#1e293b] border border-slate-700 rounded-md text-sm text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
              >
                ← Previous
              </button>

              <div className="text-center">
                <h2 className="text-2xl font-bold text-white">
                  {currentDate.toLocaleString("default", { month: "long" })} {currentDate.getFullYear()}
                </h2>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const year = currentDate.getFullYear();
                    const month = currentDate.getMonth() + 1;
                    const response = await fetch(`/api/roster/export/pdf/${year}/${month}`);
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `roster_${year}_${month}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  }}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Export PDF
                </button>
                <button
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                  className="px-4 py-2 bg-[#1e293b] border border-slate-700 rounded-md text-sm text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>

            {/* Calendar grid */}
            <div className="border border-slate-700 rounded-lg overflow-hidden">

              {/* Day-of-week header row */}
              <div className="grid grid-cols-7 bg-[#1e293b] border-b border-slate-700">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                  <div key={d} className="py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    {d}
                  </div>
                ))}
              </div>

              {/* Cells */}
              <div className="grid grid-cols-7 gap-px bg-slate-700">

                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-72 bg-[#0f172a] opacity-50" />
                ))}

                {Array.from({ length: daysInMonth(currentDate.getFullYear(), currentDate.getMonth()) }).map((_, i) => {
                  const day   = i + 1;
                  const shift = getShiftForDay(day);
                  const isToday = new Date().toDateString() ===
                    new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

                  return (
                    <div
                      key={day}
                      className={`h-72 p-3 flex flex-col bg-[#0f172a] transition-colors group ${
                        isToday ? "ring-2 ring-inset ring-sky-500" : "hover:bg-[#1e293b]/40"
                      }`}
                    >
                      {/* Date number */}
                      <span className={`text-sm font-semibold mb-2 ${
                        isToday ? "text-sky-400" : "text-slate-500 group-hover:text-slate-300"
                      }`}>
                        {day}
                      </span>

                      {/* Staff names */}
                      <div className="flex-1 overflow-y-auto no-scrollbar space-y-1">
                        {shift?.staff.map((s, idx) => (
                          <p
                            key={`${day}-${s.id}-${idx}`}
                            className="text-xs text-slate-300 leading-snug truncate"
                          >
                            {s.name}
                          </p>
                        ))}
                      </div>

                      {/* Shift type */}
                      {shift && (
                        <span className={`mt-2 text-[10px] font-medium px-1.5 py-0.5 rounded self-start ${
                          shift.type === "Sunday"
                            ? "bg-sky-500/20 text-sky-300"
                            : "bg-slate-700/60 text-slate-400"
                        }`}>
                          {shift.type === "Sunday" ? "Sunday" : "Night"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {loading && (
              <p className="text-sm text-slate-500 text-center">Loading roster...</p>
            )}
          </div>

        ) : (
        /* ── STAFF VIEW ── */
          <div className="max-w-3xl mx-auto space-y-6">

            {/* Panel header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Personnel</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Exactly 33 staff members are required for a balanced rotation.
                </p>
              </div>
              <input
                type="text"
                placeholder="Search staff..."
                className="bg-[#1e293b] border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-sky-500 transition-colors w-48"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Staff list */}
            <div className="border border-slate-700 rounded-lg overflow-hidden divide-y divide-slate-700/60">
              {filteredStaff.map((s, idx) => (
                <div
                  key={s.id}
                  className="flex items-center gap-4 px-4 py-3 bg-[#1e293b]/30 hover:bg-[#1e293b]/70 transition-colors group"
                >
                  <span className="text-xs text-slate-500 w-6 text-right shrink-0">{idx + 1}</span>

                  <div className="flex-1">
                    {editStaff?.id === s.id ? (
                      <input
                        className="bg-[#0f172a] border border-sky-500/50 rounded px-2 py-1 text-sm text-slate-100 outline-none focus:border-sky-400 w-full transition-colors"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleUpdateStaff(s.id, newName)}
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm text-slate-200 group-hover:text-white transition-colors">
                        {s.name}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 shrink-0">
                    {editStaff?.id === s.id ? (
                      <button
                        onClick={() => handleUpdateStaff(s.id, newName)}
                        className="px-3 py-1 bg-sky-500 hover:bg-sky-400 text-white text-xs font-medium rounded transition-colors"
                      >
                        Save
                      </button>
                    ) : (
                      <button
                        onClick={() => { setEditStaff(s); setNewName(s.name); }}
                        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded transition-colors"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteStaff(s.id)}
                      className="px-3 py-1 bg-slate-700 hover:bg-red-900/60 text-slate-400 hover:text-red-300 text-xs font-medium rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add staff */}
            {staff.length < 33 && (
              <div className="border border-dashed border-slate-600 rounded-lg p-5 bg-[#1e293b]/20">
                <p className="text-sm text-slate-400 mb-3">
                  Add a new staff member ({33 - staff.length} spot{33 - staff.length !== 1 ? "s" : ""} remaining)
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Full name"
                    className="flex-1 bg-[#0f172a] border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-sky-500 transition-colors"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddStaff()}
                  />
                  <button
                    onClick={handleAddStaff}
                    className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium rounded-md transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

          </div>
        )}
      </main>

      <footer className="border-t border-slate-800 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <p className="text-xs text-slate-600 text-center">Shift OS — Rotation Control System</p>
        </div>
      </footer>

    </div>
  );
}
