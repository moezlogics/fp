"use client";

import { useState, useEffect } from "react";
import { Gift, Save, Sparkles, Star, Users, BookOpen, Camera, Crown, Zap } from "lucide-react";

const EVENT_ICONS: Record<string, any> = {
    Signup: Users, Booking: BookOpen, Review: Star,
    PhotoReview: Camera, Referral: Users, PrimeBooking: Crown,
    FirstBooking: Sparkles, BirthdayBooking: Gift, ReferralFirstBooking: Zap,
};

export default function AdminRewardsPage() {
    const [configs, setConfigs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/admin/rewards")
            .then(r => r.json())
            .then(d => setConfigs(Array.isArray(d) ? d : d.configs || []))
            .catch(() => setConfigs([]))
            .finally(() => setLoading(false));
    }, []);

    async function saveConfig(cfg: any) {
        setSaving(cfg._id || cfg.event);
        await fetch("/api/admin/rewards", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(cfg),
        });
        setSaving(null);
    }

    function updateConfig(index: number, field: string, value: any) {
        const updated = [...configs];
        updated[index] = { ...updated[index], [field]: value };
        setConfigs(updated);
    }

    return (
        <div className="space-y-5">
            <h1 className="text-xl font-bold flex items-center gap-2"><Gift className="w-5 h-5" /> Rewards Configuration</h1>
            <p className="text-sm text-gray-500">Configure how many Foodie Coins users earn for each action. Multipliers apply temporarily for promotions.</p>

            {loading ? (
                <div className="space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : configs.length === 0 ? (
                <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
                    <Gift className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="font-bold">No reward configurations found</p>
                    <p className="text-xs mt-1">Rewards will appear here once they are seeded</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {configs.map((cfg: any, i: number) => {
                        const Icon = EVENT_ICONS[cfg.event] || Gift;
                        return (
                            <div key={cfg._id || i} className="bg-white rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                                        <Icon className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-sm">{cfg.event}</p>
                                        <p className="text-[10px] text-gray-400 truncate">{cfg.description || ""}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 block">Coins</label>
                                        <input type="number" value={cfg.coinsAwarded || 0}
                                            onChange={e => updateConfig(i, "coinsAwarded", Number(e.target.value))}
                                            className="w-20 border rounded px-2 py-1 text-sm text-center" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 block">Multiplier</label>
                                        <input type="number" step="0.1" value={cfg.multiplier || 1}
                                            onChange={e => updateConfig(i, "multiplier", Number(e.target.value))}
                                            className="w-20 border rounded px-2 py-1 text-sm text-center" />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <label className="text-[10px] font-bold text-gray-400">Active</label>
                                        <input type="checkbox" checked={cfg.isActive !== false}
                                            onChange={e => updateConfig(i, "isActive", e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                                    </div>
                                    <button onClick={() => saveConfig(configs[i])} disabled={saving === (cfg._id || cfg.event)}
                                        className="bg-gray-900 text-white p-2 rounded-lg hover:bg-gray-800 disabled:opacity-50">
                                        <Save className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
