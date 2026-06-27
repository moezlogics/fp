"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Tag, Building2, Calendar } from "lucide-react";

export default function AdminDealsPage() {
    const [deals, setDeals] = useState<any[]>([]);
    const [banks, setBanks] = useState<any[]>([]);
    const [restaurants, setRestaurants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ restaurantId: "", bankId: "", discountPercent: 0, description: "", validTill: "", isActive: true });

    const fetchData = async () => {
        const [dealsRes, banksRes, restRes] = await Promise.all([
            fetch("/api/deals"), fetch("/api/banks"),
            fetch("/api/restaurants/admin?status=approved"),
        ]);
        setDeals(await dealsRes.json());
        setBanks(await banksRes.json());
        const restData = await restRes.json();
        setRestaurants(restData.restaurants || []);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        await fetch("/api/deals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        setForm({ restaurantId: "", bankId: "", discountPercent: 0, description: "", validTill: "", isActive: true });
        fetchData();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this deal?")) return;
        await fetch(`/api/deals/${id}`, { method: "DELETE" });
        fetchData();
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">Deals Management</h1>

            {/* Create Deal */}
            <form onSubmit={handleCreate} className="bg-card border rounded-xl p-5 space-y-4">
                <h2 className="font-bold text-sm border-b pb-2 flex items-center gap-2"><Tag className="w-4 h-4 text-primary" /> Create New Deal</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select value={form.restaurantId} onChange={(e) => setForm({ ...form, restaurantId: e.target.value })} required className="border rounded-lg px-3 py-2 text-sm">
                        <option value="">Select Restaurant</option>
                        {restaurants.map((r: any) => <option key={r._id} value={r._id}>{r.name} — {r.city}</option>)}
                    </select>
                    <select value={form.bankId} onChange={(e) => setForm({ ...form, bankId: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                        <option value="">No Bank (Direct Deal)</option>
                        {banks.map((b: any) => <option key={b._id} value={b._id}>{b.name}</option>)}
                    </select>
                    <input value={form.discountPercent || ""} onChange={(e) => setForm({ ...form, discountPercent: parseInt(e.target.value) || 0 })} placeholder="Discount %" type="number" className="border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Deal description (e.g. 20% off on entire bill)" className="border rounded-lg px-3 py-2 text-sm" />
                    <div className="flex gap-2">
                        <input type="date" value={form.validTill} onChange={(e) => setForm({ ...form, validTill: e.target.value })} className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                        <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-dark flex items-center gap-1"><Plus className="w-4 h-4" /> Create</button>
                    </div>
                </div>
            </form>

            {/* Deals List */}
            <div className="bg-card border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="text-left p-3 font-semibold">Restaurant</th>
                            <th className="text-left p-3 font-semibold">Bank</th>
                            <th className="text-left p-3 font-semibold">Discount</th>
                            <th className="text-left p-3 font-semibold">Description</th>
                            <th className="text-left p-3 font-semibold">Valid Till</th>
                            <th className="text-right p-3 font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {loading ? <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading...</td></tr> :
                            deals.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No deals yet.</td></tr> :
                                deals.map((deal: any) => (
                                    <tr key={deal._id} className="hover:bg-muted/30">
                                        <td className="p-3 font-medium">{deal.restaurantId?.name || deal.restaurantId || "—"}</td>
                                        <td className="p-3">{deal.bankId?.name || "Direct"}</td>
                                        <td className="p-3 font-bold text-green-600">{deal.discountPercent}%</td>
                                        <td className="p-3 text-muted-foreground">{deal.description || "—"}</td>
                                        <td className="p-3 text-muted-foreground">{deal.validTill ? new Date(deal.validTill).toLocaleDateString() : "—"}</td>
                                        <td className="p-3 text-right"><button onClick={() => handleDelete(deal._id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button></td>
                                    </tr>
                                ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
