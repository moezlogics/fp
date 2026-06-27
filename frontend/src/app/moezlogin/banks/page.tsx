"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, CreditCard } from "lucide-react";

export default function AdminBanksPage() {
    const [banks, setBanks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ name: "", logoUrl: "", color: "#1a1a1a", cardTypes: "", order: 0, isActive: true });

    const fetchBanks = async () => {
        const res = await fetch("/api/banks");
        setBanks(await res.json());
        setLoading(false);
    };

    useEffect(() => { fetchBanks(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const body = { ...form, cardTypes: form.cardTypes.split(",").map(s => s.trim()).filter(Boolean) };
        if (editingId) {
            await fetch(`/api/banks/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        } else {
            await fetch("/api/banks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        }
        setForm({ name: "", logoUrl: "", color: "#1a1a1a", cardTypes: "", order: 0, isActive: true });
        setEditingId(null);
        fetchBanks();
    };

    const handleEdit = (bank: any) => {
        setEditingId(bank._id);
        setForm({ name: bank.name, logoUrl: bank.logoUrl || "", color: bank.color || "#1a1a1a", cardTypes: bank.cardTypes?.join(", ") || "", order: bank.order || 0, isActive: bank.isActive });
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this bank?")) return;
        await fetch(`/api/banks/${id}`, { method: "DELETE" });
        fetchBanks();
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Banks Management</h1>
                <p className="text-sm text-muted-foreground mt-1">City-bank deal archive SEO pages are auto-generated for active banks. Manage titles, meta, content, and featured images in <Link href="/moezlogin/seo-pages" className="text-primary font-semibold hover:underline">SEO Pages</Link>.</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-card border rounded-xl p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Bank Name (e.g. HBL)" required className="border rounded-lg px-3 py-2 text-sm" />
                    <input value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} placeholder="Logo URL" className="border rounded-lg px-3 py-2 text-sm" />
                    <div className="flex gap-2">
                        <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
                        <input value={form.cardTypes} onChange={(e) => setForm({ ...form, cardTypes: e.target.value })} placeholder="Platinum, Gold, Visa" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded accent-primary" /> Active</label>
                    <button type="submit" className="bg-primary text-white rounded-lg px-4 py-2 text-sm font-bold hover:bg-primary-dark transition flex items-center gap-2">
                        <Plus className="w-4 h-4" /> {editingId ? "Update" : "Add"} Bank
                    </button>
                </div>
            </form>

            <div className="bg-card border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="text-left p-3 font-semibold">Color</th>
                            <th className="text-left p-3 font-semibold">Bank</th>
                            <th className="text-left p-3 font-semibold">Card Types</th>
                            <th className="text-left p-3 font-semibold">Status</th>
                            <th className="text-right p-3 font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {loading ? <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading...</td></tr> :
                            banks.map((bank) => (
                                <tr key={bank._id} className="hover:bg-muted/30">
                                    <td className="p-3"><div className="w-8 h-8 rounded-lg" style={{ backgroundColor: bank.color || "#1a1a1a" }} /></td>
                                    <td className="p-3 font-bold">{bank.name}</td>
                                    <td className="p-3"><div className="flex flex-wrap gap-1">{bank.cardTypes?.map((c: string) => <span key={c} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{c}</span>)}</div></td>
                                    <td className="p-3"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${bank.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{bank.isActive ? "Active" : "Hidden"}</span></td>
                                    <td className="p-3 text-right space-x-2">
                                        <button onClick={() => handleEdit(bank)} className="text-blue-600 hover:text-blue-800"><Pencil className="w-4 h-4 inline" /></button>
                                        <button onClick={() => handleDelete(bank._id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4 inline" /></button>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}


