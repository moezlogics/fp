"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Mail,
    Search,
    ChevronLeft,
    ChevronRight,
    Trash2,
    X,
    Clock,
    Eye,
    MessageSquareReply,
    Archive,
    Inbox,
    Send,
    StickyNote,
    ExternalLink,
    Copy,
    CheckCircle,
    AlertCircle,
    Loader2,
} from "lucide-react";

// ── Types ──
interface ContactLead {
    _id: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    status: "new" | "read" | "replied" | "archived";
    adminNotes: string;
    ip: string;
    readAt: string | null;
    repliedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

interface Stats {
    total: number;
    new: number;
    read: number;
    replied: number;
    archived: number;
}

// ── Constants ──
const SUBJECT_LABELS: Record<string, string> = {
    booking: "Booking Issue",
    partnership: "Partnership",
    feedback: "Feedback",
    payment: "Payment",
    other: "Other",
};

const SUBJECT_COLORS: Record<string, string> = {
    booking: "bg-blue-50 text-blue-700 border-blue-200",
    partnership: "bg-purple-50 text-purple-700 border-purple-200",
    feedback: "bg-green-50 text-green-700 border-green-200",
    payment: "bg-amber-50 text-amber-700 border-amber-200",
    other: "bg-gray-50 text-gray-700 border-gray-200",
};

const STATUS_CONFIG: Record<
    string,
    { label: string; color: string; icon: any; bgColor: string }
> = {
    new: {
        label: "New",
        color: "text-blue-700",
        icon: Inbox,
        bgColor: "bg-blue-50 border-blue-200",
    },
    read: {
        label: "Read",
        color: "text-gray-600",
        icon: Eye,
        bgColor: "bg-gray-50 border-gray-200",
    },
    replied: {
        label: "Replied",
        color: "text-green-700",
        icon: MessageSquareReply,
        bgColor: "bg-green-50 border-green-200",
    },
    archived: {
        label: "Archived",
        color: "text-orange-600",
        icon: Archive,
        bgColor: "bg-orange-50 border-orange-200",
    },
};

const STATUS_FILTERS = [
    { value: "", label: "All Leads" },
    { value: "new", label: "New" },
    { value: "read", label: "Read" },
    { value: "replied", label: "Replied" },
    { value: "archived", label: "Archived" },
];

export default function ContactLeadsAdmin() {
    // ── State ──
    const [leads, setLeads] = useState<ContactLead[]>([]);
    const [stats, setStats] = useState<Stats>({
        total: 0,
        new: 0,
        read: 0,
        replied: 0,
        archived: 0,
    });
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [statusFilter, setStatusFilter] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const limit = 30;

    // Detail modal state
    const [selectedLead, setSelectedLead] = useState<ContactLead | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [notesInput, setNotesInput] = useState("");
    const [savingNotes, setSavingNotes] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [copied, setCopied] = useState(false);

    // ── Fetch leads ──
    const fetchLeads = useCallback(async () => {
        setLoading(true);
        try {
            let url = `/api/contact-leads?page=${page}&limit=${limit}`;
            if (statusFilter) url += `&status=${statusFilter}`;
            if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

            const res = await fetch(url);
            const data = await res.json();
            setLeads(data.docs || []);
            setTotal(data.total || 0);
        } catch {
            setLeads([]);
        }
        setLoading(false);
    }, [page, statusFilter, searchQuery]);

    // ── Fetch stats ──
    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch("/api/contact-leads?stats=true");
            const data = await res.json();
            setStats({
                total: data.total || 0,
                new: data.new || 0,
                read: data.read || 0,
                replied: data.replied || 0,
                archived: data.archived || 0,
            });
        } catch {
            /* silent */
        }
    }, []);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const totalPages = Math.ceil(total / limit);

    // ── Search handler ──
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        setSearchQuery(searchInput.trim());
    };

    // ── Open lead detail ──
    const openLeadDetail = async (leadId: string) => {
        setDetailLoading(true);
        setSelectedLead(null);
        try {
            const res = await fetch(`/api/contact-leads/${leadId}`);
            const data = await res.json();
            if (data._id) {
                setSelectedLead(data);
                setNotesInput(data.adminNotes || "");
                // Refresh list and stats since opening marks as "read"
                fetchLeads();
                fetchStats();
            }
        } catch {
            /* silent */
        }
        setDetailLoading(false);
    };

    // ── Update status ──
    const updateStatus = async (
        id: string,
        newStatus: string
    ) => {
        setUpdatingStatus(true);
        try {
            const res = await fetch(`/api/contact-leads/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            const data = await res.json();
            if (data._id) {
                setSelectedLead(data);
                fetchLeads();
                fetchStats();
            }
        } catch {
            /* silent */
        }
        setUpdatingStatus(false);
    };

    // ── Save admin notes ──
    const saveNotes = async () => {
        if (!selectedLead) return;
        setSavingNotes(true);
        try {
            const res = await fetch(`/api/contact-leads/${selectedLead._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ adminNotes: notesInput }),
            });
            const data = await res.json();
            if (data._id) {
                setSelectedLead(data);
            }
        } catch {
            /* silent */
        }
        setSavingNotes(false);
    };

    // ── Delete lead ──
    const deleteLead = async (id: string) => {
        if (!confirm("Delete this lead permanently? This cannot be undone.")) return;
        try {
            await fetch(`/api/contact-leads/${id}`, { method: "DELETE" });
            setSelectedLead(null);
            fetchLeads();
            fetchStats();
        } catch {
            /* silent */
        }
    };

    // ── Copy email ──
    const copyEmail = (email: string) => {
        navigator.clipboard.writeText(email);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // ── Format date ──
    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString("en-PK", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });

    const formatShortDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString("en-PK", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });

    // ── Time ago ──
    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "just now";
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return formatShortDate(dateStr);
    };

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Mail className="w-6 h-6 text-blue-600" /> Contact Leads
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {stats.total} total leads from the contact form
                    </p>
                </div>
            </div>

            {/* ── Stats Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                    {
                        label: "Total",
                        value: stats.total,
                        color: "from-gray-50 to-gray-100 border-gray-200",
                        textColor: "text-gray-900",
                        labelColor: "text-gray-500",
                    },
                    {
                        label: "New",
                        value: stats.new,
                        color: "from-blue-50 to-blue-100 border-blue-200",
                        textColor: "text-blue-900",
                        labelColor: "text-blue-600",
                    },
                    {
                        label: "Read",
                        value: stats.read,
                        color: "from-gray-50 to-slate-100 border-slate-200",
                        textColor: "text-slate-900",
                        labelColor: "text-slate-500",
                    },
                    {
                        label: "Replied",
                        value: stats.replied,
                        color: "from-green-50 to-emerald-100 border-green-200",
                        textColor: "text-green-900",
                        labelColor: "text-green-600",
                    },
                    {
                        label: "Archived",
                        value: stats.archived,
                        color: "from-orange-50 to-amber-100 border-orange-200",
                        textColor: "text-orange-900",
                        labelColor: "text-orange-600",
                    },
                ].map((s) => (
                    <div
                        key={s.label}
                        className={`bg-gradient-to-br ${s.color} border rounded-xl p-4`}
                    >
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${s.labelColor}`}>
                            {s.label}
                        </p>
                        <p className={`text-2xl font-black mt-1 ${s.textColor}`}>
                            {s.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* ── Filters & Search ── */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
                {/* Status filter tabs */}
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {STATUS_FILTERS.map((f) => (
                        <button
                            key={f.value}
                            onClick={() => {
                                setStatusFilter(f.value);
                                setPage(1);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                                statusFilter === f.value
                                    ? "bg-primary text-white shadow-md"
                                    : "bg-white border text-gray-600 hover:bg-gray-50"
                            }`}
                        >
                            {f.label}
                            {f.value === "new" && stats.new > 0 && (
                                <span className="ml-1.5 bg-white/20 text-[10px] px-1.5 py-0.5 rounded-full">
                                    {stats.new}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <form onSubmit={handleSearch} className="relative max-w-xs w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search name, email..."
                        className="w-full pl-9 pr-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                    />
                </form>
            </div>

            {/* ── Leads Table ── */}
            <div className="bg-card border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500">
                                    Status
                                </th>
                                <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500">
                                    Name
                                </th>
                                <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500">
                                    Email
                                </th>
                                <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500">
                                    Subject
                                </th>
                                <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500">
                                    Preview
                                </th>
                                <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500">
                                    Date
                                </th>
                                <th className="p-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="p-10 text-center text-muted-foreground">
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                                        Loading leads...
                                    </td>
                                </tr>
                            ) : leads.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-10 text-center text-muted-foreground">
                                        <Inbox className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                                        <p className="font-bold text-gray-500">No leads found</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {searchQuery || statusFilter
                                                ? "Try adjusting your filters or search query."
                                                : "Contact form submissions will appear here."}
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                leads.map((lead) => {
                                    const statusCfg = STATUS_CONFIG[lead.status];
                                    const StatusIcon = statusCfg.icon;
                                    return (
                                        <tr
                                            key={lead._id}
                                            onClick={() => openLeadDetail(lead._id)}
                                            className={`hover:bg-muted/20 transition-colors cursor-pointer ${
                                                lead.status === "new"
                                                    ? "bg-blue-50/30 font-medium"
                                                    : ""
                                            }`}
                                        >
                                            <td className="p-3">
                                                <span
                                                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border ${statusCfg.bgColor} ${statusCfg.color}`}
                                                >
                                                    <StatusIcon className="w-3 h-3" />
                                                    {statusCfg.label}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <span className="text-gray-900 font-bold">
                                                    {lead.name}
                                                </span>
                                            </td>
                                            <td className="p-3 text-gray-600 text-xs">
                                                {lead.email}
                                            </td>
                                            <td className="p-3">
                                                <span
                                                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${
                                                        SUBJECT_COLORS[lead.subject] ||
                                                        SUBJECT_COLORS.other
                                                    }`}
                                                >
                                                    {SUBJECT_LABELS[lead.subject] || lead.subject}
                                                </span>
                                            </td>
                                            <td className="p-3 max-w-[180px]">
                                                <p className="text-xs text-gray-500 truncate">
                                                    {lead.message}
                                                </p>
                                            </td>
                                            <td className="p-3 text-xs text-gray-400 whitespace-nowrap">
                                                {timeAgo(lead.createdAt)}
                                            </td>
                                            <td className="p-3">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteLead(lead._id);
                                                    }}
                                                    className="bg-red-50 text-red-500 p-2 rounded-lg hover:bg-red-100 transition"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-3">
                    <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="p-2 rounded-lg border hover:bg-muted/50 disabled:opacity-30 transition"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-bold">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        className="p-2 rounded-lg border hover:bg-muted/50 disabled:opacity-30 transition"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* ── Detail Modal / Drawer ── */}
            {(selectedLead || detailLoading) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => !detailLoading && setSelectedLead(null)}
                    />

                    {/* Modal */}
                    <div className="relative bg-white rounded-2xl shadow-2xl border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        {detailLoading ? (
                            <div className="p-12 flex flex-col items-center justify-center gap-3">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                <p className="text-sm text-gray-500">Loading lead details...</p>
                            </div>
                        ) : selectedLead ? (
                            <>
                                {/* Modal Header */}
                                <div className="sticky top-0 bg-white border-b p-5 flex items-center justify-between rounded-t-2xl z-10">
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900">
                                            {selectedLead.name}
                                        </h2>
                                        <p className="text-sm text-gray-500 mt-0.5">
                                            Lead received{" "}
                                            {formatDate(selectedLead.createdAt)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedLead(null)}
                                        className="p-2 rounded-xl hover:bg-gray-100 transition"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="p-5 space-y-5">
                                    {/* ── Contact Info ── */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Mail className="w-4 h-4 text-gray-400" />
                                                <div>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase">
                                                        Email
                                                    </p>
                                                    <p className="text-sm font-bold text-gray-900">
                                                        {selectedLead.email}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => copyEmail(selectedLead.email)}
                                                    className="p-1.5 rounded-lg hover:bg-gray-200 transition"
                                                    title="Copy email"
                                                >
                                                    {copied ? (
                                                        <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                                    ) : (
                                                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                                                    )}
                                                </button>
                                                <a
                                                    href={`mailto:${selectedLead.email}`}
                                                    className="p-1.5 rounded-lg hover:bg-gray-200 transition"
                                                    title="Send email"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                                                </a>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 rounded-xl p-3">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">
                                                Subject
                                            </p>
                                            <span
                                                className={`inline-flex text-xs font-bold px-2 py-1 rounded-lg border mt-1 ${
                                                    SUBJECT_COLORS[selectedLead.subject] ||
                                                    SUBJECT_COLORS.other
                                                }`}
                                            >
                                                {SUBJECT_LABELS[selectedLead.subject] ||
                                                    selectedLead.subject}
                                            </span>
                                        </div>
                                    </div>

                                    {/* ── Message ── */}
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">
                                            Message
                                        </p>
                                        <div className="bg-gray-50 border rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                            {selectedLead.message}
                                        </div>
                                    </div>

                                    {/* ── Status Actions ── */}
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">
                                            Update Status
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {(
                                                [
                                                    "new",
                                                    "read",
                                                    "replied",
                                                    "archived",
                                                ] as const
                                            ).map((s) => {
                                                const cfg = STATUS_CONFIG[s];
                                                const Icon = cfg.icon;
                                                const isActive = selectedLead.status === s;
                                                return (
                                                    <button
                                                        key={s}
                                                        onClick={() =>
                                                            !isActive &&
                                                            updateStatus(selectedLead._id, s)
                                                        }
                                                        disabled={isActive || updatingStatus}
                                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                                                            isActive
                                                                ? `${cfg.bgColor} ${cfg.color} ring-2 ring-offset-1 ring-current`
                                                                : "bg-white text-gray-500 hover:bg-gray-50 border-gray-200"
                                                        } disabled:cursor-not-allowed`}
                                                    >
                                                        <Icon className="w-3.5 h-3.5" />
                                                        {cfg.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* ── Timeline ── */}
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">
                                            Timeline
                                        </p>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <Clock className="w-3.5 h-3.5 text-blue-500" />
                                                <span>
                                                    Submitted:{" "}
                                                    <strong>
                                                        {formatDate(selectedLead.createdAt)}
                                                    </strong>
                                                </span>
                                            </div>
                                            {selectedLead.readAt && (
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <Eye className="w-3.5 h-3.5 text-gray-500" />
                                                    <span>
                                                        Read:{" "}
                                                        <strong>
                                                            {formatDate(selectedLead.readAt)}
                                                        </strong>
                                                    </span>
                                                </div>
                                            )}
                                            {selectedLead.repliedAt && (
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <MessageSquareReply className="w-3.5 h-3.5 text-green-500" />
                                                    <span>
                                                        Replied:{" "}
                                                        <strong>
                                                            {formatDate(selectedLead.repliedAt)}
                                                        </strong>
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* ── Admin Notes ── */}
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
                                            <StickyNote className="w-3 h-3" /> Admin Notes
                                        </p>
                                        <textarea
                                            value={notesInput}
                                            onChange={(e) => setNotesInput(e.target.value)}
                                            rows={3}
                                            placeholder="Add internal notes about this lead..."
                                            className="w-full border rounded-xl px-4 py-2.5 text-sm resize-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                                        />
                                        <button
                                            onClick={saveNotes}
                                            disabled={
                                                savingNotes ||
                                                notesInput === (selectedLead.adminNotes || "")
                                            }
                                            className="mt-2 bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                                        >
                                            {savingNotes ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Send className="w-3.5 h-3.5" />
                                            )}
                                            Save Notes
                                        </button>
                                    </div>

                                    {/* ── Danger Zone ── */}
                                    <div className="pt-3 border-t">
                                        <button
                                            onClick={() => deleteLead(selectedLead._id)}
                                            className="flex items-center gap-1.5 text-xs text-red-500 font-bold hover:text-red-700 transition"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Delete this lead permanently
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
}
