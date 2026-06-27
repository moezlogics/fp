"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Gift, Copy, Check, Share2, Users, Award, TrendingUp, Sparkles } from "lucide-react";

export default function ReferPage() {
    const { data: session, status: authStatus } = useSession();
    const router = useRouter();
    const [referralCode, setReferralCode] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (authStatus === "unauthenticated") {
            router.push("/login");
            return;
        }
        if (authStatus === "authenticated") {
            fetch("/api/users/profile")
                .then((r) => r.json())
                .then((data) => setReferralCode(data.referralCode || ""))
                .catch(() => { });
        }
    }, [authStatus, router]);

    const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/register?ref=${referralCode}`;

    function copyCode() {
        navigator.clipboard.writeText(referralCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    function shareWhatsApp() {
        const text = `Join Foodies Pakistan 🍽️ and get exclusive restaurant deals! Use my code ${referralCode} when you sign up: ${shareUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }

    const steps = [
        { icon: Share2, title: "Share Your Code", desc: "Send your unique referral code to friends & family." },
        { icon: Users, title: "They Sign Up", desc: "Your friend registers and uses your code during signup." },
        { icon: Award, title: "Both Earn Coins", desc: "You get 500 Foodie Coins, they get 200. Win-win!" },
    ];

    return (
        <div className="bg-gray-50 min-h-screen pb-16">
            {/* Hero */}
            <div className="bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 text-white py-16 px-4">
                <div className="max-w-2xl mx-auto text-center">
                    <Gift className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                    <h1 className="text-4xl font-bold mb-2">Refer & Earn</h1>
                    <p className="text-purple-200 text-base">
                        Invite your friends to Foodies Pakistan and earn rewards for every referral!
                    </p>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 -mt-8 space-y-6">
                {/* Referral Code Card */}
                <div className="bg-white rounded-2xl shadow-lg border p-6 text-center space-y-4">
                    <p className="text-sm text-gray-500 font-medium">Your Referral Code</p>
                    {referralCode ? (
                        <div className="flex items-center justify-center gap-3">
                            <div className="bg-gray-100 border-2 border-dashed border-primary rounded-xl px-6 py-3">
                                <span className="text-2xl font-bold tracking-wider text-gray-900">{referralCode}</span>
                            </div>
                            <button
                                onClick={copyCode}
                                className={`p-3 rounded-xl transition ${copied ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600 hover:bg-primary/10 hover:text-primary"
                                    }`}
                            >
                                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                            </button>
                        </div>
                    ) : (
                        <p className="text-gray-400 text-sm">Loading your code...</p>
                    )}

                    <div className="flex justify-center gap-3 pt-2">
                        <button
                            onClick={shareWhatsApp}
                            className="bg-green-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-green-700 transition flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.616l4.52-1.478A11.937 11.937 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.3 0-4.438-.712-6.213-1.932l-.353-.247-2.676.876.86-2.633-.267-.367A9.963 9.963 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" /></svg>
                            Share on WhatsApp
                        </button>
                        <button
                            onClick={copyCode}
                            className="bg-gray-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-800 transition flex items-center gap-2"
                        >
                            <Copy className="w-4 h-4" />
                            {copied ? "Copied!" : "Copy Code"}
                        </button>
                    </div>
                </div>

                {/* How it Works */}
                <div className="bg-white rounded-2xl border p-6 space-y-4">
                    <h2 className="text-lg font-bold text-center">How it Works</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {steps.map((step, i) => (
                            <div key={i} className="text-center space-y-2 p-4">
                                <div className="w-14 h-14 bg-purple-50 rounded-xl flex items-center justify-center mx-auto">
                                    <step.icon className="w-6 h-6 text-purple-600" />
                                </div>
                                <p className="font-bold text-sm">{step.title}</p>
                                <p className="text-xs text-gray-500">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Rewards Table */}
                <div className="bg-white rounded-2xl border p-6 space-y-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-yellow-500" />  Reward Tiers
                    </h2>
                    <div className="overflow-hidden rounded-xl border">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500">Referrals</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500">Your Reward</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500">Badge</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                <tr><td className="px-4 py-3">1-5</td><td className="px-4 py-3 font-bold text-green-700">500 coins each</td><td className="px-4 py-3">🌱 Starter</td></tr>
                                <tr><td className="px-4 py-3">6-15</td><td className="px-4 py-3 font-bold text-green-700">750 coins each</td><td className="px-4 py-3">⭐ Ambassador</td></tr>
                                <tr><td className="px-4 py-3">16-50</td><td className="px-4 py-3 font-bold text-green-700">1000 coins each</td><td className="px-4 py-3">🏆 Champion</td></tr>
                                <tr><td className="px-4 py-3">50+</td><td className="px-4 py-3 font-bold text-green-700">1500 coins each</td><td className="px-4 py-3">👑 Legend</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <p className="text-xs text-gray-400 text-center">1000 Foodie Coins = Rs. 100 booking credit</p>
                </div>
            </div>
        </div>
    );
}
