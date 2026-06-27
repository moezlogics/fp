"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Clock, Phone, Mail, Building2 } from "lucide-react";

export default function OwnersAdminPage() {
    const [owners, setOwners] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

    const fetchOwners = async () => {
        const res = await fetch(`/api/owners?filter=${filter}`);
        setOwners(await res.json());
        setLoading(false);
    };

    useEffect(() => { fetchOwners(); }, [filter]);

    const handleAction = async (userId: string, action: "approve" | "reject", reason?: string) => {
        await fetch(`/api/owners/${userId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, rejectionReason: reason }),
        });
        fetchOwners();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold tracking-tight">Owner Applications</h1>
                <div className="flex gap-2">
                    {(["pending", "approved", "rejected", "all"] as const).map((f) => (
                        <button key={f} onClick={() => setFilter(f)} className={`text-xs px-3 py-1.5 rounded-full font-bold capitalize transition ${filter === f ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                {loading ? <p className="text-muted-foreground p-6 text-center">Loading...</p> :
                    !Array.isArray(owners) || owners.length === 0 ? <p className="text-muted-foreground p-6 text-center bg-card border rounded-xl">No {filter} applications found.</p> :
                        owners.map((owner) => (
                            <div key={owner._id} className="bg-card border rounded-xl p-5 flex flex-col md:flex-row md:items-center gap-4">
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                                            {owner.name?.charAt(0) || "?"}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm">{owner.name}</h3>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> {owner.email}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                        <div className="flex items-center gap-1 text-muted-foreground"><Phone className="w-3 h-3" /> {owner.phone || "N/A"}</div>
                                        <div className="flex items-center gap-1 text-muted-foreground"><Building2 className="w-3 h-3" /> {owner.businessName || "N/A"}</div>
                                        <div className="text-muted-foreground">CNIC: {owner.cnicNumber || "N/A"}</div>
                                        <div className="text-muted-foreground">City: {owner.city || "N/A"}</div>
                                    </div>
                                    {owner.rejectionReason && (
                                        <p className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">Rejection: {owner.rejectionReason}</p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    {!owner.isApproved && !owner.rejectionReason && (
                                        <>
                                            <button onClick={() => handleAction(owner._id, "approve")} className="bg-green-600 text-white text-xs px-4 py-2 rounded-lg font-bold flex items-center gap-1 hover:bg-green-700">
                                                <CheckCircle2 className="w-4 h-4" /> Approve
                                            </button>
                                            <button onClick={() => { const reason = prompt("Reason for rejection?"); if (reason) handleAction(owner._id, "reject", reason); }} className="bg-red-600 text-white text-xs px-4 py-2 rounded-lg font-bold flex items-center gap-1 hover:bg-red-700">
                                                <XCircle className="w-4 h-4" /> Reject
                                            </button>
                                        </>
                                    )}
                                    {owner.isApproved && (
                                        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Approved</span>
                                    )}
                                </div>
                            </div>
                        ))}
            </div>
        </div>
    );
}
