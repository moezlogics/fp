"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";

export default function CategoriesAdminPage() {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ name: "", image: "", order: 0, isActive: true });

    const fetchCategories = async () => {
        const res = await fetch("/api/categories");
        const data = await res.json();
        setCategories(data);
        setLoading(false);
    };

    useEffect(() => { fetchCategories(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            await fetch(`/api/categories/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        } else {
            await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        }
        setForm({ name: "", image: "", order: 0, isActive: true });
        setEditingId(null);
        fetchCategories();
    };

    const handleEdit = (cat: any) => {
        setEditingId(cat._id);
        setForm({ name: cat.name, image: cat.image, order: cat.order, isActive: cat.isActive });
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        await fetch(`/api/categories/${id}`, { method: "DELETE" });
        fetchCategories();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold tracking-tight">Food Categories</h1>
                <span className="text-sm text-muted-foreground">{categories.length} categories</span>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="bg-card border rounded-xl p-5 grid grid-cols-1 md:grid-cols-5 gap-4">
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Category Name" required className="border rounded-lg px-3 py-2 text-sm" />
                <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="Image URL" required className="border rounded-lg px-3 py-2 text-sm" />
                <input value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })} placeholder="Order" type="number" className="border rounded-lg px-3 py-2 text-sm" />
                <button type="submit" className="bg-primary text-white rounded-lg px-4 py-2 text-sm font-bold hover:bg-primary-dark transition flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> {editingId ? "Update" : "Add"}
                </button>
            </form>

            {/* Table */}
            <div className="bg-card border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="text-left p-3 font-semibold">Order</th>
                            <th className="text-left p-3 font-semibold">Image</th>
                            <th className="text-left p-3 font-semibold">Name</th>
                            <th className="text-left p-3 font-semibold">Slug</th>
                            <th className="text-left p-3 font-semibold">Status</th>
                            <th className="text-right p-3 font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {loading ? (
                            <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
                        ) : categories.length === 0 ? (
                            <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No categories yet. Add your first one above.</td></tr>
                        ) : categories.map((cat) => (
                            <tr key={cat._id} className="hover:bg-muted/30">
                                <td className="p-3"><GripVertical className="w-4 h-4 text-gray-400" /> {cat.order}</td>
                                <td className="p-3"><img src={cat.image} alt={cat.name} className="w-8 h-8 rounded-full object-cover" /></td>
                                <td className="p-3 font-medium">{cat.name}</td>
                                <td className="p-3 text-muted-foreground">{cat.slug}</td>
                                <td className="p-3">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cat.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                        {cat.isActive ? "Active" : "Hidden"}
                                    </span>
                                </td>
                                <td className="p-3 text-right space-x-2">
                                    <button onClick={() => handleEdit(cat)} className="text-blue-600 hover:text-blue-800"><Pencil className="w-4 h-4 inline" /></button>
                                    <button onClick={() => handleDelete(cat._id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4 inline" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
