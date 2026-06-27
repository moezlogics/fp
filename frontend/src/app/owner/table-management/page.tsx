"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Settings, Loader2, Save, CheckCircle, AlertCircle, Plus, Trash2, Pause, Play, X } from "lucide-react";
import { useBranch } from "../owner-shell";



const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SLOT_DURATIONS = [
    { value: 15, label: "15 min" },
    { value: 30, label: "30 min" },
    { value: 60, label: "60 min" },
];

interface BookingSettings {
    isBookingEnabled: boolean;
    isPrimePartner: boolean;
    slotDurationMinutes: number;
    maxPartySize: number;
    minPartySize: number;
    maxAdvanceBookingDays: number;
    autoConfirm: boolean;
    cancellationWindowMinutes: number;
    bookableDays: string[];
    bookableTimeStart: string;
    bookableTimeEnd: string;
    coversPerSlot: { lunch: number; afternoon: number; dinner: number };
    minimumBillForDiscountPaisa: number;
    maxDiscountCap: number;
    bankDealsOnCash: string;
}

interface YieldRuleData {
    _id: string;
    name: string;
    daysOfWeek: string[];
    timeSlotStart: string;
    timeSlotEnd: string;
    discountPercent: number;
    validFrom: string;
    validTo: string;
    priority: number;
    isActive: boolean;
}

const DEFAULT_SETTINGS: BookingSettings = {
    isBookingEnabled: false,
    isPrimePartner: false,
    slotDurationMinutes: 30,
    maxPartySize: 10,
    minPartySize: 1,
    maxAdvanceBookingDays: 30,
    autoConfirm: true,
    cancellationWindowMinutes: 360,
    bookableDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    bookableTimeStart: "12:00",
    bookableTimeEnd: "23:00",
    coversPerSlot: { lunch: 20, afternoon: 12, dinner: 30 },
    minimumBillForDiscountPaisa: 150000,
    maxDiscountCap: 50,
    bankDealsOnCash: "trust",
};

const DEFAULT_NEW_RULE = {
    name: "",
    daysOfWeek: [] as string[],
    timeSlotStart: "14:00",
    timeSlotEnd: "17:00",
    discountPercent: 20,
    validFrom: "",
    validTo: "",
    priority: 0,
};

const inputClasses = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-gray-50 focus:bg-white transition-all";
const labelClasses = "block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5";

export default function TableManagementPage() {
    const { data: session } = useSession();
    const { branch } = useBranch();
    const [restaurantId, setRestaurantId] = useState("");
    const [settings, setSettings] = useState<BookingSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState<"success" | "error">("success");

    const [yieldRules, setYieldRules] = useState<YieldRuleData[]>([]);
    const [showAddRule, setShowAddRule] = useState(false);
    const [newRule, setNewRule] = useState({ ...DEFAULT_NEW_RULE });
    const [savingRule, setSavingRule] = useState(false);

    const fetchSettings = useCallback(async () => {
        if (!session?.user || !branch?._id) return;
        try {
            setRestaurantId(branch._id);

            // Fetch booking settings via proxy
            const settingsRes = await fetch(`/api/owner/booking-settings?restaurantId=${branch._id}`);
            const settingsData = await settingsRes.json();
            if (settingsData.data?.bookingSettings) {
                setSettings({ ...DEFAULT_SETTINGS, ...settingsData.data.bookingSettings });
            } else if (settingsData.bookingSettings) {
                setSettings({ ...DEFAULT_SETTINGS, ...settingsData.bookingSettings });
            }

            // Fetch yield rules via proxy
            const rulesRes = await fetch(`/api/owner/yield-rules?restaurantId=${branch._id}`);
            const rulesData = await rulesRes.json();
            if (rulesData.data) setYieldRules(rulesData.data);
            else if (Array.isArray(rulesData)) setYieldRules(rulesData);
        } catch (err) {
            console.error("Failed to fetch settings:", err);
        }
        setLoading(false);
    }, [branch?._id, session]);

    useEffect(() => { fetchSettings(); }, [fetchSettings]);

    const showMsg = (msg: string, type: "success" | "error") => {
        setMessage(msg);
        setMessageType(type);
        setTimeout(() => setMessage(""), 4000);
    };

    const saveSettings = async () => {
        if (!restaurantId || !session?.user) return;
        setSaving(true);
        setMessage("");
        try {
            const res = await fetch(`/api/owner/booking-settings?restaurantId=${restaurantId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });
            const data = await res.json();
            showMsg(res.ok ? "Settings saved successfully!" : (data.error || "Failed to save settings"), res.ok ? "success" : "error");
        } catch {
            showMsg("Network error. Please try again.", "error");
        }
        setSaving(false);
    };

    const toggleDay = (day: string) => {
        setSettings((prev: any) => ({
            ...prev,
            bookableDays: prev.bookableDays.includes(day)
                ? prev.bookableDays.filter((d: any) => d !== day)
                : [...prev.bookableDays, day],
        }));
    };

    const createYieldRule = async () => {
        if (!restaurantId || !session?.user) return;
        if (!newRule.name || !newRule.daysOfWeek.length || !newRule.validFrom || !newRule.validTo) {
            showMsg("Please fill all required fields for the discount rule.", "error");
            return;
        }
        setSavingRule(true);
        try {
            const res = await fetch(`/api/owner/yield-rules`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...newRule, restaurantId }),
            });
            const data = await res.json();
            if (res.ok && (data.data || data)) {
                setYieldRules((prev) => [data.data || data, ...prev]);
                setNewRule({ ...DEFAULT_NEW_RULE });
                setShowAddRule(false);
                showMsg("Discount rule created!", "success");
            } else {
                showMsg(data.error || "Failed to create rule", "error");
            }
        } catch {
            showMsg("Network error", "error");
        }
        setSavingRule(false);
    };

    const toggleYieldRule = async (ruleId: string, isActive: boolean) => {
        if (!session?.user) return;
        try {
            await fetch(`/api/owner/yield-rules?ruleId=${ruleId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !isActive }),
            });
            setYieldRules((prev) => prev.map((r) => (r._id === ruleId ? { ...r, isActive: !isActive } : r)));
        } catch {
            showMsg("Failed to toggle rule", "error");
        }
    };

    const deleteYieldRule = async (ruleId: string) => {
        if (!session?.user || !confirm("Are you sure you want to delete this discount rule?")) return;
        try {
            await fetch(`/api/owner/yield-rules?ruleId=${ruleId}`, {
                method: "DELETE",
            });
            setYieldRules((prev) => prev.filter((r) => r._id !== ruleId));
            showMsg("Rule deleted", "success");
        } catch {
            showMsg("Failed to delete rule", "error");
        }
    };

    const toggleRuleDay = (day: string) => {
        setNewRule((prev) => ({
            ...prev,
            daysOfWeek: prev.daysOfWeek.includes(day)
                ? prev.daysOfWeek.filter((d) => d !== day)
                : [...prev.daysOfWeek, day],
        }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-3xl">
            {/* ═══ HEADER ═══ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black tracking-tight text-gray-900 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-primary" /> Table Management
                    </h1>
                    <p className="text-[12px] text-gray-400 font-medium mt-0.5">Configure bookings, capacity, discounts and time slots</p>
                </div>
                <button onClick={saveSettings} disabled={saving}
                    className="text-white px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 disabled:opacity-50 shrink-0 active:scale-95"
                    style={{ backgroundColor: "#e8323b", boxShadow: "0 4px 12px rgba(232, 50, 59,0.25)" }}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? "Saving..." : "Save Settings"}
                </button>
            </div>

            {message && (
                <div className={`flex items-center gap-2 text-[13px] font-bold px-4 py-3 rounded-xl ${messageType === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"}`}>
                    {messageType === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {message}
                </div>
            )}

            {/* ═══ GENERAL SETTINGS ═══ */}
            <SectionCard title="General Settings" icon="⚙" color="blue">
                <ToggleRow label="Enable Bookings" desc="Allow customers to book tables on your restaurant page"
                    checked={settings.isBookingEnabled} onChange={(v) => setSettings((p: any) => ({ ...p, isBookingEnabled: v }))} />
                <ToggleRow label="Auto-Confirm Bookings" desc="Bookings are confirmed instantly without manual approval"
                    checked={settings.autoConfirm} onChange={(v) => setSettings((p: any) => ({ ...p, autoConfirm: v }))} />
                <div className={`mt-4 rounded-2xl border p-4 ${settings.isPrimePartner ? "border-emerald-200 bg-emerald-50/80" : "border-primary/20 bg-primary/10"}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-[12px] font-black uppercase tracking-wider text-gray-500">Branch Prime</p>
                            <p className="mt-1 text-sm font-bold text-gray-900">
                                {settings.isPrimePartner ? "Prime features are active on this branch." : "Prime features are managed from the branch plan page."}
                            </p>
                            <p className="mt-1 text-[12px] leading-relaxed text-gray-600">
                                Zero platform commission, crown badge, featured placement, and verified tick are no longer free toggles.
                            </p>
                        </div>
                        <Link href="/owner/prime" className="inline-flex items-center justify-center rounded-xl bg-primary/50 px-4 py-2.5 text-[12px] font-black uppercase tracking-wide text-white transition hover:bg-primary-dark active:scale-95">
                            Manage Branch Prime
                        </Link>
                    </div>
                </div>
            </SectionCard>

            {/* ═══ CAPACITY ═══ */}
            <SectionCard title="Capacity & Party Size" icon="👥" color="purple">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelClasses}>Min Party Size</label>
                        <input type="number" value={settings.minPartySize} min={1} max={20}
                            onChange={(e: any) => setSettings((p: any) => ({ ...p, minPartySize: Math.max(1, Math.min(20, Number(e.target.value))) }))}
                            className={inputClasses} />
                    </div>
                    <div>
                        <label className={labelClasses}>Max Party Size</label>
                        <input type="number" value={settings.maxPartySize} min={1} max={50}
                            onChange={(e: any) => setSettings((p: any) => ({ ...p, maxPartySize: Math.max(1, Math.min(50, Number(e.target.value))) }))}
                            className={inputClasses} />
                    </div>
                </div>
                <div className="mt-5">
                    <h4 className="text-[13px] font-bold text-gray-700 mb-1">Covers Per Slot</h4>
                    <p className="text-[11px] text-gray-400 mb-3">Maximum seats bookable per time slot during each meal period</p>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className={labelClasses}>🍳 Lunch (12-3PM)</label>
                            <input type="number" value={settings.coversPerSlot.lunch} min={0} max={200}
                                onChange={(e: any) => setSettings((p: any) => ({ ...p, coversPerSlot: { ...p.coversPerSlot, lunch: Math.max(0, Number(e.target.value)) } }))}
                                className={inputClasses} />
                        </div>
                        <div>
                            <label className={labelClasses}>☕ Afternoon (3-6PM)</label>
                            <input type="number" value={settings.coversPerSlot.afternoon} min={0} max={200}
                                onChange={(e: any) => setSettings((p: any) => ({ ...p, coversPerSlot: { ...p.coversPerSlot, afternoon: Math.max(0, Number(e.target.value)) } }))}
                                className={inputClasses} />
                        </div>
                        <div>
                            <label className={labelClasses}>🌙 Dinner (6-11PM)</label>
                            <input type="number" value={settings.coversPerSlot.dinner} min={0} max={200}
                                onChange={(e: any) => setSettings((p: any) => ({ ...p, coversPerSlot: { ...p.coversPerSlot, dinner: Math.max(0, Number(e.target.value)) } }))}
                                className={inputClasses} />
                        </div>
                    </div>
                </div>
            </SectionCard>

            {/* ═══ SCHEDULE ═══ */}
            <SectionCard title="Schedule" icon="📅" color="emerald">
                <div className="mb-4">
                    <h4 className="text-[13px] font-bold text-gray-700 mb-2">Bookable Days</h4>
                    <div className="flex flex-wrap gap-2">
                        {DAYS.map((day) => (
                            <button key={day} onClick={() => toggleDay(day)}
                                className={`text-[12px] px-3 py-2 rounded-xl font-bold transition-all active:scale-95 ${settings.bookableDays.includes(day) ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100"}`}>
                                {settings.bookableDays.includes(day) ? "✅ " : ""}{day.slice(0, 3)}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className={labelClasses}>Opening Time</label>
                        <input type="time" value={settings.bookableTimeStart}
                            onChange={(e: any) => setSettings((p: any) => ({ ...p, bookableTimeStart: e.target.value }))}
                            className={inputClasses} />
                    </div>
                    <div>
                        <label className={labelClasses}>Closing Time</label>
                        <input type="time" value={settings.bookableTimeEnd}
                            onChange={(e: any) => setSettings((p: any) => ({ ...p, bookableTimeEnd: e.target.value }))}
                            className={inputClasses} />
                    </div>
                    <div>
                        <label className={labelClasses}>Slot Duration</label>
                        <select value={settings.slotDurationMinutes}
                            onChange={(e: any) => setSettings((p: any) => ({ ...p, slotDurationMinutes: Number(e.target.value) }))}
                            className={inputClasses}>
                            {SLOT_DURATIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                        <label className={labelClasses}>Advance Booking (Days)</label>
                        <input type="number" value={settings.maxAdvanceBookingDays} min={1} max={90}
                            onChange={(e: any) => setSettings((p: any) => ({ ...p, maxAdvanceBookingDays: Math.max(1, Math.min(90, Number(e.target.value))) }))}
                            className={inputClasses} />
                    </div>
                    <div>
                        <label className={labelClasses}>Cancellation Window (Hours)</label>
                        <input type="number" value={settings.cancellationWindowMinutes / 60} min={1} max={48}
                            onChange={(e: any) => setSettings((p: any) => ({ ...p, cancellationWindowMinutes: Math.max(60, Number(e.target.value) * 60) }))}
                            className={inputClasses} />
                    </div>
                </div>
                <div className="mt-4 p-3 bg-blue-50 text-blue-700 text-[12px] rounded-xl border border-blue-100 font-medium">
                    <strong>ℹ️ How it works:</strong> Customers can book <strong>any time</strong> between
                    your opening and closing time. Discounts only apply at times YOU set below in
                    &quot;Discount Time Slots&quot;. No rule = no discount, but still bookable!
                </div>
            </SectionCard>

            {/* ═══ DISCOUNTS & BILLING ═══ */}
            <SectionCard title="Discounts & Billing" icon="💰" color="amber">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelClasses}>Max Discount Cap (%)</label>
                        <input type="number" value={settings.maxDiscountCap} min={10} max={70}
                            onChange={(e: any) => setSettings((p: any) => ({ ...p, maxDiscountCap: Math.max(10, Math.min(70, Number(e.target.value))) }))}
                            className={inputClasses} />
                    </div>
                    <div>
                        <label className={labelClasses}>Min Bill for Discount (Rs.)</label>
                        <input type="number" value={settings.minimumBillForDiscountPaisa / 100} min={0} max={50000}
                            onChange={(e: any) => setSettings((p: any) => ({ ...p, minimumBillForDiscountPaisa: Math.round(Number(e.target.value) * 100) }))}
                            className={inputClasses} />
                    </div>
                </div>
                <div className="mt-3">
                    <label className={labelClasses}>Bank Deals on Cash Payments</label>
                    <select value={settings.bankDealsOnCash}
                        onChange={(e: any) => setSettings((p: any) => ({ ...p, bankDealsOnCash: e.target.value as string }))}
                        className={inputClasses}>
                        <option value="trust">Trust-Based (owner asks which bank)</option>
                        <option value="last4">Card Last 4 Digits</option>
                        <option value="disabled">FoodiePay Only</option>
                    </select>
                </div>
                <div className="mt-4 p-3 bg-primary/5 text-primary-dark text-[12px] rounded-xl border border-primary/10 font-medium">
                    <strong>💡 How MDC works:</strong> Total combined discount (Yield + Prime + Bank + Coins)
                    will NEVER exceed <strong>{settings.maxDiscountCap}%</strong> of the food bill.
                    Bills below <strong>Rs. {(settings.minimumBillForDiscountPaisa / 100).toLocaleString()}</strong> get no discount.
                </div>
                {settings.isPrimePartner && (
                    <div className="mt-3 p-3 bg-emerald-50 text-emerald-700 text-[12px] rounded-xl border border-emerald-100 font-medium">
                        <strong>Prime branch benefits are active.</strong> FoodiePay commission is currently waived for this branch.
                        Public badges and listing placement are being driven from your paid branch plan.
                    </div>
                )}
            </SectionCard>

            {/* ═══ YIELD RULES ═══ */}
            <SectionCard title="Discount Time Slots (Yield Rules)" icon="📊" color="primary">
                <p className="text-[12px] text-gray-400 mb-4">
                    Set discount percentages for specific time slots. Customers booking during these times get the discount.
                    Times <strong>without</strong> a rule are still bookable — just at 0% discount.
                </p>

                {yieldRules.length > 0 ? (
                    <div className="space-y-3 mb-4">
                        {yieldRules.map((rule) => (
                            <div key={rule._id}
                                className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-all ${rule.isActive ? "bg-emerald-50/50 border-emerald-200" : "bg-gray-50 border-gray-200"}`}>
                                <div className="flex-1 min-w-0">
                                    <p className={`font-bold text-[13px] ${rule.isActive ? "text-gray-900" : "text-gray-400"}`}>{rule.name}</p>
                                    <p className="text-[11px] text-gray-500 mt-0.5">
                                        📅 {rule.daysOfWeek.map(d => d.slice(0, 3)).join(", ")} &nbsp;·&nbsp;
                                        ⏰ {rule.timeSlotStart} – {rule.timeSlotEnd} &nbsp;·&nbsp;
                                        <span className="font-bold text-primary">{rule.discountPercent}% OFF</span>
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                        Valid: {new Date(rule.validFrom).toLocaleDateString("en-PK")} → {new Date(rule.validTo).toLocaleDateString("en-PK")}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button onClick={() => toggleYieldRule(rule._id, rule.isActive)}
                                        className={`text-[11px] px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all active:scale-95 ${rule.isActive ? "bg-primary/5 text-primary-dark border border-primary/20" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
                                        {rule.isActive ? <><Pause className="w-3 h-3" /> Pause</> : <><Play className="w-3 h-3" /> Activate</>}
                                    </button>
                                    <button onClick={() => deleteYieldRule(rule._id)}
                                        className="text-[11px] px-3 py-1.5 rounded-lg font-bold text-red-500 bg-red-50 border border-red-100 flex items-center gap-1 transition-all hover:bg-red-100 active:scale-95">
                                        <Trash2 className="w-3 h-3" /> Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 mb-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <p className="text-[12px] text-gray-400">No discount rules yet. Add your first one below!</p>
                    </div>
                )}

                {!showAddRule ? (
                    <button onClick={() => setShowAddRule(true)}
                        className="w-full py-3 rounded-xl border-2 border-dashed border-primary/30 text-primary font-bold text-[13px] flex items-center justify-center gap-2 hover:bg-primary/5 transition-all active:scale-[0.98]">
                        <Plus className="w-4 h-4" /> Add Discount Rule
                    </button>
                ) : (
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="font-bold text-[14px] text-gray-900">New Discount Rule</h4>
                            <button onClick={() => { setShowAddRule(false); setNewRule({ ...DEFAULT_NEW_RULE }); }}
                                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition active:scale-95">
                                <X className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                        </div>
                        <div>
                            <label className={labelClasses}>Rule Name</label>
                            <input type="text" placeholder="e.g., Off-Peak Afternoon Deal" value={newRule.name}
                                onChange={(e) => setNewRule((p) => ({ ...p, name: e.target.value }))}
                                className={inputClasses} />
                        </div>
                        <div>
                            <label className={labelClasses}>Days of Week</label>
                            <div className="flex flex-wrap gap-1.5">
                                {DAYS.map((day) => (
                                    <button key={day} onClick={() => toggleRuleDay(day)}
                                        className={`text-[11px] px-2.5 py-1.5 rounded-lg font-bold transition-all active:scale-95 ${newRule.daysOfWeek.includes(day) ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"}`}>
                                        {day.slice(0, 3)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className={labelClasses}>Start Time</label>
                                <input type="time" value={newRule.timeSlotStart}
                                    onChange={(e) => setNewRule((p) => ({ ...p, timeSlotStart: e.target.value }))}
                                    className={inputClasses} />
                            </div>
                            <div>
                                <label className={labelClasses}>End Time</label>
                                <input type="time" value={newRule.timeSlotEnd}
                                    onChange={(e) => setNewRule((p) => ({ ...p, timeSlotEnd: e.target.value }))}
                                    className={inputClasses} />
                            </div>
                            <div>
                                <label className={labelClasses}>Discount %</label>
                                <input type="number" value={newRule.discountPercent} min={1} max={100}
                                    onChange={(e) => setNewRule((p) => ({ ...p, discountPercent: Math.max(1, Math.min(100, Number(e.target.value))) }))}
                                    className={inputClasses} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClasses}>Valid From</label>
                                <input type="date" value={newRule.validFrom}
                                    onChange={(e) => setNewRule((p) => ({ ...p, validFrom: e.target.value }))}
                                    className={inputClasses} />
                            </div>
                            <div>
                                <label className={labelClasses}>Valid To</label>
                                <input type="date" value={newRule.validTo}
                                    onChange={(e) => setNewRule((p) => ({ ...p, validTo: e.target.value }))}
                                    className={inputClasses} />
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end pt-1">
                            <button onClick={() => { setShowAddRule(false); setNewRule({ ...DEFAULT_NEW_RULE }); }}
                                className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors text-[13px]">
                                Cancel
                            </button>
                            <button onClick={createYieldRule} disabled={savingRule}
                                className="px-5 py-2.5 text-white font-bold rounded-xl transition-all disabled:opacity-50 active:scale-95 text-[13px] flex items-center gap-2"
                                style={{ backgroundColor: "#e8323b", boxShadow: "0 4px 12px rgba(232, 50, 59,0.25)" }}>
                                {savingRule ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                {savingRule ? "Creating..." : "Create Rule"}
                            </button>
                        </div>
                    </div>
                )}
            </SectionCard>
        </div>
    );
}

/* ── Reusable Components ── */

function SectionCard({ title, icon, color, children }: { title: string; icon: string; color: string; children: React.ReactNode }) {
    const colorMap: Record<string, string> = {
        blue: "bg-blue-50",
        purple: "bg-purple-50",
        emerald: "bg-emerald-50",
        amber: "bg-primary/5",
        orange: "bg-primary/5",
    };
    const textMap: Record<string, string> = {
        blue: "text-blue-500",
        purple: "text-purple-500",
        emerald: "text-emerald-500",
        amber: "text-primary",
        orange: "text-primary",
    };
    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.02)" }}>
            <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${colorMap[color]} flex items-center justify-center`}>
                    <span className="text-[16px]">{icon}</span>
                </div>
                <h2 className="font-bold text-[14px] text-gray-900">{title}</h2>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

function ToggleRow({ label, desc, checked, onChange, highlight }: {
    label: string; desc: string; checked: boolean; onChange: (v: boolean) => void; highlight?: boolean;
}) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
            <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-gray-800">{label}</p>
                <p className={`text-[11px] font-medium ${checked && highlight ? "text-emerald-600" : "text-gray-400"}`}>{desc}</p>
            </div>
            <button onClick={() => onChange(!checked)}
                className={`relative w-11 h-6 rounded-full transition-all duration-200 shrink-0 ml-4 ${checked ? (highlight ? "bg-emerald-500" : "bg-emerald-500") : "bg-gray-200"}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200 ${checked ? "left-[22px]" : "left-0.5"}`} />
            </button>
        </div>
    );
}
