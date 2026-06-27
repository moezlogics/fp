"use client";

import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff, Save, Loader2, X, Image as ImageIcon, Upload } from "lucide-react";

const ReactQuill = lazy(() => import("react-quill-new"));
import "react-quill-new/dist/quill.snow.css";

export default function AdminArticlesPage() {
    const [articles, setArticles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    // Media library modal
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const quillRef = useRef<any>(null);

    const blank = { title: "", slug: "", content: "", excerpt: "", coverImage: "", author: "", tags: "", isPublished: false };

    const fetchArticles = async () => {
        const res = await fetch("/api/articles");
        setArticles(await res.json());
        setLoading(false);
    };

    useEffect(() => { fetchArticles(); }, []);

    const handleSave = async () => {
        setSaving(true);
        const body = {
            ...editing,
            tags: typeof editing.tags === "string"
                ? editing.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
                : editing.tags
        };
        // Remove citySlug entirely before saving as per plan
        if ('citySlug' in body) delete body.citySlug;

        try {
            const res = await fetch(editing._id ? `/api/articles/${editing._id}` : "/api/articles", {
                method: editing._id ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to save");
            setSaving(false);
            setEditing(null);
            fetchArticles();
        } catch (err: any) {
            alert(err.message);
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this article permanently?")) return;
        await fetch(`/api/articles/${id}`, { method: "DELETE" });
        fetchArticles();
    };

    const togglePublish = async (article: any) => {
        await fetch(`/api/articles/${article._id}`, {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isPublished: !article.isPublished }),
        });
        fetchArticles();
    };

    // ── Cover Image Uploader ──
    const handleImageUpload = async (file: File) => {
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("image", file);
            formData.append("slug", `article-cover-${Date.now()}`);
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            if (res.ok) {
                const data = await res.json();
                setEditing((prev: any) => ({ ...prev, coverImage: data.url }));
                setShowMediaPicker(false);
            } else {
                alert("Upload failed. Please try again.");
            }
        } catch {
            alert("Upload failed. Please try again.");
        }
        setUploading(false);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleImageUpload(file);
    };

    // ── Quill Image Handler (Uploads inline images to CDN) ──
    const imageHandler = useCallback(() => {
        const input = document.createElement("input");
        input.setAttribute("type", "file");
        input.setAttribute("accept", "image/*");
        input.click();

        input.onchange = async () => {
            const file = input.files?.[0];
            if (file) {
                const formData = new FormData();
                formData.append("image", file);
                formData.append("slug", `article-inline-${Date.now()}`);
                try {
                    const res = await fetch("/api/upload", { method: "POST", body: formData });
                    const data = await res.json();
                    if (data.url) {
                        const quill = quillRef.current?.getEditor();
                        const range = quill?.getSelection();
                        if (range && quill) {
                            quill.insertEmbed(range.index, "image", data.url);
                        }
                    } else {
                        throw new Error(data.message || "Failed to upload image");
                    }
                } catch (e: any) {
                    alert(e.message || "Image upload failed");
                }
            }
        };
    }, []);

    const modules = useMemo(() => ({
        toolbar: {
            container: [
                [{ header: [2, 3, 4, false] }],
                ["bold", "italic", "underline", "strike"],
                [{ list: "ordered" }, { list: "bullet" }],
                ["blockquote"],
                ["link", "image", "video"],
                ["clean"],
            ],
            handlers: { image: imageHandler }
        }
    }), [imageHandler]);

    // Editor view
    if (editing) {
        return (
            <div className="space-y-6 max-w-4xl mx-auto pb-20">
                <div className="flex justify-between items-center bg-white p-5 rounded-2xl border shadow-sm sticky top-4 z-50">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">{editing._id ? "Edit Article" : "Write New Article"}</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{editing.title || "Untitled Document"}</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setEditing(null)} className="px-5 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition">Cancel</button>
                        <button onClick={handleSave} disabled={saving} className="bg-primary text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-primary-dark transition flex items-center gap-2 disabled:opacity-50">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {saving ? "Saving..." : "Save Article"}
                        </button>
                    </div>
                </div>

                <div className="bg-white border rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
                    {/* Cover Image Upload UI */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" /> Cover Image
                        </label>
                        {editing.coverImage ? (
                            <div className="relative group rounded-xl overflow-hidden border border-gray-200">
                                <img src={editing.coverImage} alt="Cover" className="w-full h-48 md:h-64 object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                    <button onClick={() => setShowMediaPicker(true)} className="bg-white text-gray-800 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-gray-100 transition">
                                        <ImageIcon className="w-4 h-4" /> Change Image
                                    </button>
                                    <button onClick={() => setEditing((prev: any) => ({ ...prev, coverImage: "" }))} className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-red-600 transition">
                                        <Trash2 className="w-4 h-4" /> Remove
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => setShowMediaPicker(true)} className="w-full h-40 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-all outline-none cursor-pointer">
                                <ImageIcon className="w-8 h-8 text-gray-400" />
                                <span className="text-sm font-bold text-gray-500">Upload Cover Image</span>
                                <span className="text-[10px] text-gray-400">Drag & drop or click to select</span>
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-600 uppercase">Title *</label>
                            <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} required className="w-full border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-sm outline-none transition" placeholder="The Best Biryani in Karachi..." />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-600 uppercase">URL Slug (Optional)</label>
                            <input value={editing.slug || ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} className="w-full border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-sm outline-none transition" placeholder="Leave blank to auto-generate from title" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600 uppercase">Excerpt (Short Summary)</label>
                        <textarea value={editing.excerpt} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} rows={2} className="w-full border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-sm outline-none transition resize-none" placeholder="A brief hook about the blog post..."></textarea>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-600 uppercase">Author *</label>
                            <input value={editing.author} onChange={(e) => setEditing({ ...editing, author: e.target.value })} required className="w-full border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-sm outline-none transition" placeholder="Moez Tariq" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-600 uppercase">Tags (comma-separated)</label>
                            <input value={Array.isArray(editing.tags) ? editing.tags.join(", ") : editing.tags || ""} onChange={(e) => setEditing({ ...editing, tags: e.target.value })} placeholder="biryani, lahore, guides" className="w-full border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-sm outline-none transition" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600 uppercase">Content (Rich Text Editor) *</label>
                        <div className="border border-gray-200 rounded-xl overflow-hidden [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-container]:border-0 [&_.ql-editor]:min-h-[400px] [&_.ql-editor]:text-base">
                            <Suspense fallback={<div className="p-10 text-center text-gray-400 font-bold border rounded-xl">Loading Editor...</div>}>
                                <ReactQuill ref={quillRef} theme="snow" value={editing.content} onChange={(val: string) => setEditing({ ...editing, content: val })} modules={modules} placeholder="Start writing your article..." />
                            </Suspense>
                        </div>
                    </div>

                    <div className="pt-4 border-t">
                        <label className="flex items-center gap-3 cursor-pointer max-w-max">
                            <input type="checkbox" checked={editing.isPublished} onChange={(e) => setEditing({ ...editing, isPublished: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary" />
                            <span className="text-sm font-bold text-gray-800">Publish immediately to live site</span>
                        </label>
                    </div>
                </div>

                {/* ── Media Picker Modal (For Cover Image) ── */}
                {showMediaPicker && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl border w-full max-w-lg">
                            <div className="border-b p-5 flex justify-between items-center">
                                <h3 className="font-bold text-lg flex items-center gap-2"><ImageIcon className="w-5 h-5 text-primary" /> Select Cover</h3>
                                <button onClick={() => setShowMediaPicker(false)} className="p-2 hover:bg-gray-100 rounded-lg transition"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-6 space-y-5">
                                <div onClick={() => fileInputRef.current?.click()} className="w-full h-40 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer">
                                    {uploading ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                                            <span className="text-sm font-bold text-gray-500">Uploading Cover to CDN...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 text-gray-400" />
                                            <span className="text-sm font-bold text-gray-600">Upload from computer</span>
                                            <span className="text-[10px] text-gray-400">Upload high quality cover image</span>
                                        </>
                                    )}
                                </div>
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-px bg-gray-200" />
                                    <span className="text-xs font-bold text-gray-400 uppercase">Or Paste Cover URL</span>
                                    <div className="flex-1 h-px bg-gray-200" />
                                </div>
                                <div className="flex gap-2">
                                    <input id="pasteCoverUrl" type="text" placeholder="https://cdn.foodiespakistan.pk/..." className="flex-1 border rounded-xl px-4 py-2.5 text-sm" />
                                    <button onClick={() => {
                                        const input = document.getElementById("pasteCoverUrl") as HTMLInputElement;
                                        if (input.value.trim()) {
                                            setEditing((prev: any) => ({ ...prev, coverImage: input.value.trim() }));
                                            setShowMediaPicker(false);
                                        }
                                    }} className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary-dark transition">
                                        Use URL
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // List view
    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Articles & Blog</h1>
                    <p className="text-sm text-gray-500 mt-1">{articles.length} published or draft articles</p>
                </div>
                <button onClick={() => setEditing({ ...blank })} className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-dark transition flex items-center gap-2 shadow-sm">
                    <Plus className="w-4 h-4" /> Write New Article
                </button>
            </div>

            <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-left p-4 font-bold text-xs uppercase text-gray-500 tracking-wider">Article</th>
                                <th className="text-left p-4 font-bold text-xs uppercase text-gray-500 tracking-wider hidden md:table-cell">Author</th>
                                <th className="text-left p-4 font-bold text-xs uppercase text-gray-500 tracking-wider">Status</th>
                                <th className="text-right p-4 font-bold text-xs uppercase text-gray-500 tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? <tr><td colSpan={4} className="p-12 text-center text-gray-400 font-bold">Loading Articles...</td></tr> :
                                articles.length === 0 ? <tr><td colSpan={4} className="p-12 text-center text-gray-500 font-medium">No articles yet. Create your first one to kick off the blog!</td></tr> :
                                    articles.map((a) => (
                                        <tr key={a._id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4 flex items-center gap-4">
                                                {a.coverImage ? (
                                                    <img src={a.coverImage} alt="" className="w-20 h-14 rounded-lg object-cover shadow-sm flex-shrink-0" />
                                                ) : (
                                                    <div className="w-20 h-14 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center border border-dashed"><ImageIcon className="w-5 h-5 text-gray-300" /></div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="font-bold text-gray-900 line-clamp-1">{a.title}</p>
                                                    <code className="text-[10px] text-primary/70 bg-primary/5 px-1.5 py-0.5 rounded mt-1 inline-block line-clamp-1">/{a.slug}</code>
                                                </div>
                                            </td>
                                            <td className="p-4 text-gray-600 font-medium hidden md:table-cell">{a.author}</td>
                                            <td className="p-4">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${a.isPublished ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                                                    {a.isPublished ? "Published" : "Draft"}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => togglePublish(a)} className={`${a.isPublished ? "text-primary hover:bg-primary/5" : "text-emerald-500 hover:bg-emerald-50"} p-2 rounded-lg transition`} title={a.isPublished ? "Revert to Draft" : "Publish to Live Site"}>
                                                        {a.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                    <button onClick={() => setEditing({ ...a, tags: a.tags?.join(", ") || "" })} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition" title="Edit Article"><Pencil className="w-4 h-4" /></button>
                                                    <button onClick={() => handleDelete(a._id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition" title="Delete Article permanently"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
