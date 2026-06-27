"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Crown, Users, Check, Search, Loader2, X, UserCircle } from "lucide-react";

export default function AdminSubscriptionsPage() {
    const searchParams = useSearchParams();
    const [plans, setPlans] = useState<any[]>([]);
    const [activeList, setActiveList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Grant prime
    const [grantSearch, setGrantSearch] = useState("");
    const [grantResults, setGrantResults] = useState<any[]>([]);
    const [grantTarget, setGrantTarget] = useState<any>(null);
    const [grantMonths, setGrantMonths] = useState(6);
    const [granting, setGranting] = useState(false);
    const [grantMsg, setGrantMsg] = useState("");
    const [revoking, setRevoking] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        try {
            const [pRes, aRes] = await Promise.all([
                fetch("/api/subscriptions/plans").then(r => r.json()),
                fetch("/api/users/admin/prime?action=active").then(r => r.json()),
            ]);
            setPlans(Array.isArray(pRes) ? pRes : pRes.data || pRes.plans || []);
            const aData = aRes.data || aRes;
            setActiveList(Array.isArray(aData) ? aData : []);
        } catch { }
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll() }, [fetchAll]);

    // Debounced user search
    useEffect(() => {
        if (!grantSearch.trim() || grantSearch.trim().length < 2) { setGrantResults([]); return; }
        const t = setTimeout(async () => {
            try {
                const res = await fetch(`/api/users/admin/prime?action=search&q=${encodeURIComponent(grantSearch)}`);
                const data = await res.json();
                setGrantResults(data.data || data || []);
            } catch { }
        }, 300);
        return () => clearTimeout(t);
    }, [grantSearch]);

    useEffect(() => {
        const selectedUserId = searchParams.get("user");
        if (selectedUserId && selectedUserId !== grantSearch) {
            setGrantSearch(selectedUserId);
        }
    }, [grantSearch, searchParams]);

    async function grantPrime() {
        if (!grantTarget) return;
        setGranting(true);
        setGrantMsg("");
        try {
            const res = await fetch("/api/users/admin/prime", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: grantTarget._id, action: "grant", durationMonths: grantMonths }),
            });
            const data = await res.json();
            if (res.ok) {
                setGrantMsg(data.data?.message || data.message || "Prime granted!");
                setGrantTarget(null);
                setGrantSearch("");
                fetchAll();
            } else {
                setGrantMsg(data.error || "Failed to grant Prime.");
            }
        } catch { setGrantMsg("Network error."); }
        setGranting(false);
    }

    async function revokePrime(userId: string) {
        setRevoking(userId);
        try {
            const res = await fetch("/api/users/admin/prime", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, action: "cancel" }),
            });
            if (res.ok) fetchAll();
        } catch { }
        setRevoking(null);
    }

    return (
        <div className="space-y-6 max-w-4xl">
            {/* ── Header ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-xl font-bold flex items-center gap-2"><Crown className="w-5 h-5 text-primary" /> Prime Manager</h1>
            </div>

            {/* ── Plans Grid (Read Only) ── */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{[1, 2].map(i => <div key={i} className="h-36 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : plans.length === 0 ? (
                <div className="bg-white rounded-xl border p-10 text-center text-gray-400">
                    <Crown className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="font-bold text-sm">No plans created yet. Try granting prime to auto-seed them.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {plans.map((p: any) => (
                        <div key={p._id} className={`bg-white rounded-xl border-2 p-4 ${p.isActive ? "border-primary/30" : "border-gray-200 opacity-60"}`}>
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="font-bold">{p.name}</h3>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                                    {p.isActive ? "Active" : "Inactive"}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mb-2">{p.durationMonths === 12 ? "12 months" : `${p.durationMonths || 6} months`}</p>
                            <p className="text-xl font-bold mb-2">Rs. {p.price?.toLocaleString()}</p>
                            <ul className="space-y-1 text-xs text-gray-600">
                                {(Array.isArray(p.benefits) ? p.benefits : []).slice(0, 4).map((b: any, i: number) => (
                                    <li key={i} className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-500" />{typeof b === "string" ? b : b.label || b}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}

            {/* ═══ GRANT PRIME ═══ */}
            <div className="bg-white rounded-xl border p-5 space-y-4">
                <h2 className="font-bold text-sm flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Grant Prime to User</h2>

                {grantMsg && (
                    <div className="bg-primary/5 border border-primary/20 text-primary-dark px-3 py-2 rounded-lg text-xs font-medium">{grantMsg}</div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            value={grantSearch}
                            onChange={e => { setGrantSearch(e.target.value); setGrantTarget(null); }}
                            placeholder="Search by name, email, or phone..."
                            className="w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                        />
                        {grantResults.length > 0 && !grantTarget && (
                            <div className="absolute top-full mt-1 left-0 right-0 bg-white border rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                                {grantResults.map((u: any) => (
                                    <button key={u._id} onClick={() => { setGrantTarget(u); setGrantSearch(u.name); setGrantResults([]); }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left border-b last:border-0">
                                        <UserCircle className="w-5 h-5 text-gray-300 shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-gray-900 truncate">{u.name}</p>
                                            <p className="text-[10px] text-gray-400 truncate">{u.email} · {u.phone || "No phone"}</p>
                                        </div>
                                        {u.isPrime && <span className="text-[9px] font-bold bg-primary/10 text-primary-dark px-2 py-0.5 rounded-full shrink-0">Prime</span>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Duration */}
                    <select value={grantMonths} onChange={e => setGrantMonths(Number(e.target.value))}
                        className="border rounded-lg px-3 py-2.5 text-sm font-bold bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition w-full sm:w-40">
                        <option value={6}>6 Months</option>
                        <option value={12}>1 Year</option>
                    </select>

                    {/* Grant */}
                    <button onClick={grantPrime} disabled={!grantTarget || granting}
                        className="bg-primary/50 hover:bg-primary-dark text-white text-xs font-bold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap">
                        {granting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crown className="w-3.5 h-3.5" />}
                        Grant Prime
                    </button>
                </div>

                {grantTarget && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 flex items-center gap-2">
                        <Crown className="w-4 h-4 text-primary" />
                        <p className="text-xs text-primary-dark"><b>{grantTarget.name}</b> will get Prime for {grantMonths === 12 ? "1 year" : "6 months"}</p>
                        <button onClick={() => { setGrantTarget(null); setGrantSearch(""); }} className="ml-auto">
                            <X className="w-3.5 h-3.5 text-primary" />
                        </button>
                    </div>
                )}
            </div>

            {/* ═══ ACTIVE SUBSCRIBERS ═══ */}
            <div className="bg-white rounded-xl border overflow-hidden">
                <div className="px-5 py-3 border-b bg-gray-50">
                    <h2 className="font-bold text-sm">Active Prime Members ({activeList.length})</h2>
                </div>
                {activeList.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">No active Prime members</div>
                ) : (
                    <div className="divide-y">
                        {activeList.map((sub: any) => {
                            const user = sub.userId || {};
                            const daysLeft = Math.max(0, Math.ceil((new Date(sub.validTo).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                            return (
                                <div key={sub._id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                                    <UserCircle className="w-8 h-8 text-gray-300 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 truncate">{user.name || "—"}</p>
                                        <p className="text-[10px] text-gray-400 truncate">{user.email} · {user.phone || ""}</p>
                                    </div>
                                    <div className="text-right shrink-0 hidden sm:block">
                                        <p className="text-[10px] text-gray-500 font-bold">{sub.plan}</p>
                                        <p className="text-[10px] text-gray-400">{daysLeft} days left</p>
                                        <p className="text-[10px] text-gray-400">Until {new Date(sub.validTo).toLocaleDateString("en-PK")}</p>
                                    </div>
                                    <button onClick={() => revokePrime(user._id)} disabled={revoking === user._id}
                                        className="text-[10px] font-bold text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 shrink-0">
                                        {revoking === user._id ? "..." : "Revoke"}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
