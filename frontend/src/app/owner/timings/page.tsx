"use client";

import { useState, useEffect } from "react";
import { useBranch } from "../owner-shell";
import { Save, Loader2, Plus, Trash2, Clock, Moon, CheckCircle } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function OwnerTimingsPage() {
    const { branch } = useBranch();
    const [hours, setHours] = useState<any[]>([]);
    const [overrides, setOverrides] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");

    useEffect(() => {
        if (!branch) return;
        if (branch.openingHours?.length > 0) {
            setHours(branch.openingHours.map((h: any) => ({ ...h })));
        } else {
            setHours(DAYS.map(d => ({ day: d, open: "09:00", close: "23:00", isClosed: false })));
        }
        setOverrides(branch.specialOverrides || []);
    }, [branch]);

    const updateHour = (i: number, field: string, val: any) => {
        const arr = [...hours]; arr[i] = { ...arr[i], [field]: val }; setHours(arr);
    };

    const addOverride = () => setOverrides([...overrides, { label: "", open: "09:00", close: "23:00", isClosed: false }]);
    const removeOverride = (i: number) => setOverrides(overrides.filter((_, idx) => idx !== i));

    const handleSave = async () => {
        setSaving(true);
        await fetch("/api/owner/restaurant", {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: branch._id, openingHours: hours, specialOverrides: overrides }),
        });
        setSaving(false);
        setMsg("Saved!"); setTimeout(() => setMsg(""), 3000);
    };

    if (!branch) return null;

    return (
        <div className="space-y-6 max-w-3xl">
            {/* ═══ HEADER ═══ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black tracking-tight text-gray-900 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" /> Operating Hours
                    </h1>
                    <p className="text-[12px] text-gray-400 font-medium mt-0.5">Set your weekly schedule and special hours</p>
                </div>
                <button onClick={handleSave} disabled={saving}
                    className="text-white px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 disabled:opacity-50 shrink-0 active:scale-95"
                    style={{ backgroundColor: "#e8323b", boxShadow: "0 4px 12px rgba(232, 50, 59,0.25)" }}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? "Saving..." : "Save Changes"}
                </button>
            </div>

            {msg && (
                <div className="flex items-center gap-2 text-[13px] font-bold px-4 py-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <CheckCircle className="w-4 h-4" /> {msg}
                </div>
            )}

            {/* ═══ WEEKLY SCHEDULE ═══ */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.02)" }}>
                <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-blue-500" />
                    </div>
                    <h2 className="font-bold text-[14px] text-gray-900">Weekly Schedule</h2>
                </div>
                <div className="p-5 space-y-1">
                    {hours.map((h, i) => (
                        <div key={h.day} className={`flex items-center gap-4 py-3 px-3 rounded-xl transition-colors ${h.isClosed ? "bg-red-50/50" : "hover:bg-gray-50"}`}>
                            <span className="w-24 text-[13px] font-bold text-gray-800">{h.day}</span>

                            {/* Toggle */}
                            <button
                                onClick={() => updateHour(i, "isClosed", !h.isClosed)}
                                className={`relative w-10 h-6 rounded-full transition-all duration-200 shrink-0 ${h.isClosed ? "bg-red-200" : "bg-emerald-500"}`}
                            >
                                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200 ${h.isClosed ? "left-0.5" : "left-[18px]"}`} />
                            </button>
                            <span className={`text-[11px] font-bold w-12 ${h.isClosed ? "text-red-500" : "text-emerald-600"}`}>
                                {h.isClosed ? "Closed" : "Open"}
                            </span>

                            {!h.isClosed && (
                                <div className="flex items-center gap-2">
                                    <input type="time" value={h.open} onChange={e => updateHour(i, "open", e.target.value)}
                                        className="border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-gray-50 transition-all" />
                                    <span className="text-[11px] text-gray-400 font-medium">to</span>
                                    <input type="time" value={h.close} onChange={e => updateHour(i, "close", e.target.value)}
                                        className="border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-gray-50 transition-all" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══ SPECIAL HOURS ═══ */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.02)" }}>
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                            <Moon className="w-4 h-4 text-purple-500" />
                        </div>
                        <div>
                            <h2 className="font-bold text-[14px] text-gray-900">Special Hours</h2>
                            <p className="text-[10px] text-gray-400 font-medium">Ramadan, Eid, holidays etc.</p>
                        </div>
                    </div>
                    <button onClick={addOverride}
                        className="text-[12px] text-primary font-bold flex items-center gap-1 bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-xl transition-colors active:scale-95">
                        <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                </div>
                <div className="p-5">
                    {overrides.length === 0 ? (
                        <p className="text-[12px] text-gray-400 text-center py-6">No special hours set. Add overrides for Ramadan, Eid, or holidays.</p>
                    ) : (
                        <div className="space-y-3">
                            {overrides.map((o, i) => (
                                <div key={i} className="flex items-center gap-3 py-3 px-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <input value={o.label} onChange={e => { const arr = [...overrides]; arr[i] = { ...arr[i], label: e.target.value }; setOverrides(arr); }} placeholder="e.g. Ramadan Sehri"
                                        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white transition-all min-w-0" />
                                    <button
                                        onClick={() => { const arr = [...overrides]; arr[i] = { ...arr[i], isClosed: !arr[i].isClosed }; setOverrides(arr); }}
                                        className={`relative w-10 h-6 rounded-full transition-all duration-200 shrink-0 ${o.isClosed ? "bg-red-200" : "bg-emerald-500"}`}
                                    >
                                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200 ${o.isClosed ? "left-0.5" : "left-[18px]"}`} />
                                    </button>
                                    {!o.isClosed && (
                                        <>
                                            <input type="time" value={o.open || ""} onChange={e => { const arr = [...overrides]; arr[i] = { ...arr[i], open: e.target.value }; setOverrides(arr); }}
                                                className="border border-gray-200 rounded-lg px-2 py-1.5 text-[12px] bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-[100px]" />
                                            <input type="time" value={o.close || ""} onChange={e => { const arr = [...overrides]; arr[i] = { ...arr[i], close: e.target.value }; setOverrides(arr); }}
                                                className="border border-gray-200 rounded-lg px-2 py-1.5 text-[12px] bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-[100px]" />
                                        </>
                                    )}
                                    <button onClick={() => removeOverride(i)} className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-all shrink-0">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
