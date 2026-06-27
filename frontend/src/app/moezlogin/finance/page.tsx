"use client";

import { useState, useEffect } from "react";
import { Wallet, TrendingUp, CheckCircle, Clock, AlertTriangle, DollarSign } from "lucide-react";

export default function AdminFinancePage() {
    const [data, setData] = useState<any>({ settlements: [], aggregate: {} });
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [markingPaid, setMarkingPaid] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/admin/settlements")
            .then(r => r.json())
            .then(setData)
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    async function generateSettlements() {
        setGenerating(true);
        await fetch("/api/admin/settlements", { method: "POST" });
        const res = await fetch("/api/admin/settlements");
        setData(await res.json());
        setGenerating(false);
    }

    async function markPaid(id: string) {
        setMarkingPaid(id);
        // The proxy is PUT /api/admin/settlements with a { settlementId } body
        // (forwards to Core PUT /settlements). The old /[id]/mark-paid path had
        // no route → 404, so "Mark Paid" never worked.
        await fetch(`/api/admin/settlements`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ settlementId: id }),
        });
        const res = await fetch("/api/admin/settlements");
        setData(await res.json());
        setMarkingPaid(null);
    }

    const agg = data.aggregate || {};

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-xl font-bold flex items-center gap-2"><Wallet className="w-5 h-5" /> Finance Dashboard</h1>
                <button onClick={generateSettlements} disabled={generating}
                    className="bg-primary text-white text-xs px-4 py-2 rounded-lg font-bold hover:bg-primary/90 disabled:opacity-50">
                    {generating ? "Generating..." : "Generate Weekly Settlements"}
                </button>
            </div>

            {/* Aggregates */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <p className="text-xs text-blue-600 font-bold">Total Revenue</p>
                    <p className="text-2xl font-bold text-blue-700">Rs. {(agg.totalRevenue || 0).toLocaleString()}</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <p className="text-xs text-purple-600 font-bold">Total Commission</p>
                    <p className="text-2xl font-bold text-purple-700">Rs. {(agg.totalCommission || 0).toLocaleString()}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <p className="text-xs text-green-600 font-bold">Paid Out</p>
                    <p className="text-2xl font-bold text-green-700">Rs. {(agg.totalPaid || 0).toLocaleString()}</p>
                </div>
                <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
                    <p className="text-xs text-primary font-bold">Pending Payouts</p>
                    <p className="text-2xl font-bold text-primary">Rs. {(agg.totalPending || 0).toLocaleString()}</p>
                </div>
            </div>

            {/* Settlements Table */}
            {loading ? (
                <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
            ) : data.settlements.length === 0 ? (
                <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
                    <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="font-bold">No settlements generated yet</p>
                    <p className="text-xs mt-1">Click "Generate Weekly Settlements" to create settlements for completed bookings</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                <tr>
                                    <th className="px-3 py-3 text-left">Restaurant</th>
                                    <th className="px-3 py-3 text-left">Period</th>
                                    <th className="px-3 py-3 text-right">Bookings</th>
                                    <th className="px-3 py-3 text-right">Revenue</th>
                                    <th className="px-3 py-3 text-right">Commission</th>
                                    <th className="px-3 py-3 text-right">Net</th>
                                    <th className="px-3 py-3 text-center">Status</th>
                                    <th className="px-3 py-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {data.settlements.map((s: any) => (
                                    <tr key={s._id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 text-xs font-bold truncate max-w-[140px]">{s.restaurantId?.name || "—"}</td>
                                        <td className="px-3 py-2 text-xs">
                                            {new Date(s.periodStart).toLocaleDateString("en-PK", { month: "short", day: "numeric" })} - {new Date(s.periodEnd).toLocaleDateString("en-PK", { month: "short", day: "numeric" })}
                                        </td>
                                        <td className="px-3 py-2 text-right">{s.totalBookings}</td>
                                        <td className="px-3 py-2 text-right">Rs. {s.totalGrossRevenue?.toLocaleString()}</td>
                                        <td className="px-3 py-2 text-right text-purple-600">Rs. {s.totalCommission?.toLocaleString()}</td>
                                        <td className="px-3 py-2 text-right font-bold text-green-700">Rs. {s.netPayable?.toLocaleString()}</td>
                                        <td className="px-3 py-2 text-center">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.status === "Paid" ? "bg-green-50 text-green-700" : "bg-primary/5 text-primary"
                                                }`}>{s.status}</span>
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            {s.status === "Pending" && (
                                                <button onClick={() => markPaid(s._id)} disabled={markingPaid === s._id}
                                                    className="bg-green-600 text-white text-[10px] px-2.5 py-1 rounded font-bold hover:bg-green-700 disabled:opacity-50">
                                                    {markingPaid === s._id ? "..." : "Mark Paid"}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
