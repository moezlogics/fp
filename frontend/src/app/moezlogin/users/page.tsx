"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, Search, LogIn, RefreshCw, Crown, Settings2 } from "lucide-react";

interface UserItem {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    role: "user" | "admin" | "owner";
    city?: string;
    isApproved: boolean;
    isEmailVerified: boolean;
    profileCompleted: boolean;
    foodieLevel: number;
    points: number;
    reviewCount: number;
    createdAt: string;
    isPrime?: boolean;
}

export default function AdminUsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<UserItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQ, setSearchQ] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [impersonating, setImpersonating] = useState<string | null>(null);

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/users/admin");
            const data = await res.json();
            setUsers(Array.isArray(data) ? data : (data.data || []));
        } catch { setUsers([]); }
        setLoading(false);
    };

    const handleImpersonate = async (userId: string, userRole: string) => {
        if (!confirm(`Login as this ${userRole}? You will be redirected to their dashboard.`)) return;
        setImpersonating(userId);
        try {
            const res = await fetch("/api/auth/impersonate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            const data = await res.json();
            if (data.tokens) {
                // Store impersonation tokens and redirect
                const redirectPath = userRole === "owner" ? "/owner" : userRole === "admin" ? "/moezlogin" : "/account";
                // Open in new tab with token context
                const params = new URLSearchParams({
                    accessToken: data.tokens.accessToken,
                    refreshToken: data.tokens.refreshToken,
                    id: data.user.id,
                    name: data.user.name,
                    email: data.user.email,
                    role: data.user.role,
                });
                window.open(`${redirectPath}?impersonate=true&${params.toString()}`, "_blank");
            } else {
                alert(data.error || "Failed to impersonate");
            }
        } catch {
            alert("Failed to impersonate user");
        }
        setImpersonating(null);
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = !searchQ || u.name.toLowerCase().includes(searchQ.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQ.toLowerCase()) ||
            (u.phone || "").includes(searchQ);
        const matchesRole = !roleFilter || u.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const roleBadge = (role: string) => {
        const colors: Record<string, string> = {
            admin: "bg-red-100 text-red-700",
            owner: "bg-blue-100 text-blue-700",
            user: "bg-gray-100 text-gray-700",
        };
        return (
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${colors[role] || colors.user}`}>
                {role}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Users className="w-6 h-6 text-primary" /> Users
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">{users.length} total users. Click "Login As" to impersonate any account.</p>
                </div>
                <button onClick={fetchUsers} className="border px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-50 transition flex items-center gap-2 self-start">
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                        placeholder="Search by name, email, phone..." className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm" />
                </div>
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="border rounded-xl px-3 py-2.5 text-sm bg-white">
                    <option value="">All Roles</option>
                    <option value="user">Users Only</option>
                    <option value="owner">Owners Only</option>
                    <option value="admin">Admins Only</option>
                </select>
                <div className="flex items-center text-sm text-muted-foreground">
                    Showing {filteredUsers.length} of {users.length}
                </div>
            </div>

            {/* Table */}
            <div className="bg-card border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500">User</th>
                                <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500">Contact</th>
                                <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500">Role</th>
                                <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500">City</th>
                                <th className="text-center p-3 font-bold text-xs uppercase tracking-wider text-gray-500">Prime</th>
                                <th className="text-left p-3 font-bold text-xs uppercase tracking-wider text-gray-500">Joined</th>
                                <th className="p-3 text-right font-bold text-xs uppercase tracking-wider text-gray-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">Loading users...</td></tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">No users found.</td></tr>
                            ) : filteredUsers.map(u => (
                                <tr key={u._id} className="hover:bg-muted/20 transition-colors">
                                    <td className="p-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                {u.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{u.name}</p>
                                                <p className="text-[10px] text-gray-400">{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-3 text-xs text-gray-600">{u.phone || "—"}</td>
                                    <td className="p-3">{roleBadge(u.role)}</td>
                                    <td className="p-3 text-xs">{u.city || "—"}</td>
                                    <td className="p-3 text-center">
                                        {u.isPrime ? (
                                            <span className="inline-flex items-center gap-1 bg-primary/5 text-primary-dark px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                <Crown className="w-3 h-3" /> Prime
                                            </span>
                                        ) : (
                                            <span className="text-gray-300 text-[10px]">—</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-xs text-gray-500">
                                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className="flex items-center gap-2 justify-end">
                                            <button
                                                onClick={() => router.push(`/moezlogin/subscriptions?user=${u._id}`)}
                                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition flex items-center gap-1 ${u.isPrime
                                                    ? "bg-primary/5 text-primary-dark hover:bg-primary/10 border border-primary/20"
                                                    : "bg-zinc-50 text-zinc-700 hover:bg-zinc-100 border border-zinc-200"}`}
                                            >
                                                <Settings2 className="w-3 h-3" />
                                                Manage Prime
                                            </button>
                                            <button
                                                onClick={() => handleImpersonate(u._id, u.role)}
                                                disabled={impersonating === u._id}
                                                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:from-blue-600 hover:to-blue-700 transition disabled:opacity-50 flex items-center gap-1"
                                            >
                                                <LogIn className="w-3 h-3" />
                                                {impersonating === u._id ? "..." : "Login"}
                                            </button>
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
