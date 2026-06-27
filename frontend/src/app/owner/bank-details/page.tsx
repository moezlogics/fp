"use client";

import { useState, useEffect } from "react";
import { useBranch } from "../owner-shell";
import { Building2, CreditCard, Save, Loader2, CheckCircle, AlertTriangle, Shield } from "lucide-react";

const PAKISTAN_BANKS = [
    "Allied Bank Limited (ABL)",
    "Askari Bank",
    "Bank Alfalah",
    "Bank Al Habib",
    "Bank of Punjab (BOP)",
    "Faysal Bank",
    "Habib Bank Limited (HBL)",
    "Habib Metropolitan Bank",
    "JS Bank",
    "MCB Bank",
    "Meezan Bank",
    "National Bank of Pakistan (NBP)",
    "Samba Bank",
    "Silk Bank",
    "Soneri Bank",
    "Standard Chartered Pakistan",
    "Summit Bank",
    "The Bank of Khyber",
    "United Bank Limited (UBL)",
    "JazzCash / Mobilink Microfinance",
    "Easypaisa / Telenor Microfinance",
    "SadaPay",
    "NayaPay",
    "Other",
];

export default function OwnerBankDetailsPage() {
    const { branch } = useBranch();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const [bankName, setBankName] = useState("");
    const [accountTitle, setAccountTitle] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [iban, setIban] = useState("");

    useEffect(() => {
        if (!branch?._id) return;
        setLoading(true);
        fetch(`/api/owner/merchant-wallet/bank-details?restaurantId=${branch._id}`)
            .then(r => r.json())
            .then(res => {
                const bd = res?.data?.bankDetails || res?.bankDetails;
                if (bd) {
                    setBankName(bd.bankName || "");
                    setAccountTitle(bd.accountTitle || "");
                    setAccountNumber(bd.accountNumber || "");
                    setIban(bd.iban || "");
                }
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [branch?._id]);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setSuccess(false);

        if (!bankName || !accountTitle || !accountNumber || !iban) {
            setError("Please fill in all fields");
            return;
        }

        // Basic IBAN validation
        const cleanIban = iban.replace(/\s/g, "").toUpperCase();
        if (!/^PK\d{2}[A-Z]{4}\d{16}$/.test(cleanIban)) {
            setError("Invalid IBAN. Pakistani IBAN format: PK + 2 digits + 4 letter bank code + 16 digit account (24 characters total)");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch(`/api/owner/merchant-wallet/bank-details`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    restaurantId: branch?._id,
                    bankName,
                    accountTitle: accountTitle.trim(),
                    accountNumber: accountNumber.trim(),
                    iban: cleanIban,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Failed to save bank details");
            } else {
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
            }
        } catch {
            setError("Network error. Please try again.");
        }
        setSaving(false);
    }

    const maskedAccount = accountNumber
        ? "••••" + accountNumber.slice(-4)
        : "";

    return (
        <div className="space-y-6">
            {/* ═══ HEADER ═══ */}
            <div>
                <h1 className="text-xl font-black tracking-tight text-gray-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" /> Bank Details
                </h1>
                <p className="text-[12px] text-gray-400 font-medium mt-0.5">Add the bank account where FoodiePay wallet withdrawals should be sent.</p>
            </div>

            {/* ═══ SECURITY NOTICE ═══ */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Shield className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                    <p className="text-[13px] font-bold text-emerald-800">Your data is safe</p>
                    <p className="text-[11px] text-emerald-600 mt-0.5 leading-relaxed">Bank details are encrypted and stored securely. Only you and platform admins can access this information for payout processing.</p>
                </div>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-gray-100 rounded-2xl animate-pulse" />)}
                </div>
            ) : (
                <form onSubmit={handleSave} className="space-y-5">
                    {/* ═══ FORM FIELDS ═══ */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.02)" }}>
                        {/* Bank Name */}
                        <div>
                            <label className="block text-[12px] font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Bank Name</label>
                            <select
                                value={bankName}
                                onChange={e => setBankName(e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px] font-bold text-gray-900 bg-gray-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none"
                            >
                                <option value="">Select your bank...</option>
                                {PAKISTAN_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>

                        {/* Account Title */}
                        <div>
                            <label className="block text-[12px] font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Account Title</label>
                            <input
                                type="text"
                                value={accountTitle}
                                onChange={e => setAccountTitle(e.target.value)}
                                placeholder="e.g. MUHAMMAD ALI KHAN"
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px] font-bold text-gray-900 bg-gray-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all uppercase"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Must match the name on your bank account exactly</p>
                        </div>

                        {/* Account Number */}
                        <div>
                            <label className="block text-[12px] font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Account Number</label>
                            <input
                                type="text"
                                value={accountNumber}
                                onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                                placeholder="e.g. 1234567890123456"
                                maxLength={20}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px] font-bold text-gray-900 bg-gray-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono tracking-wider"
                            />
                        </div>

                        {/* IBAN */}
                        <div>
                            <label className="block text-[12px] font-bold text-gray-600 mb-1.5 uppercase tracking-wider">IBAN Number</label>
                            <input
                                type="text"
                                value={iban}
                                onChange={e => setIban(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())}
                                placeholder="e.g. PK36SCBL0000001123456702"
                                maxLength={24}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px] font-bold text-gray-900 bg-gray-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono tracking-wider uppercase"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">24 characters: PK + 2 digits + 4 bank code + 16 account digits</p>
                        </div>
                    </div>

                    {/* ═══ PREVIEW ═══ */}
                    {bankName && accountTitle && maskedAccount && (
                        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white relative overflow-hidden">
                            <div className="absolute -top-8 -right-8 w-28 h-28 bg-white/5 rounded-full" />
                            <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-white/3 rounded-full" />
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-6">
                                    <CreditCard className="w-8 h-8 text-primary/80" />
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Preview</span>
                                </div>
                                <p className="text-[18px] font-mono font-black tracking-[4px] mb-4">{maskedAccount}</p>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Account Holder</p>
                                        <p className="text-[13px] font-bold mt-0.5">{accountTitle.toUpperCase()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Bank</p>
                                        <p className="text-[12px] font-bold mt-0.5">{bankName.split(" (")[0]}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ ERROR / SUCCESS ═══ */}
                    {error && (
                        <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                            <p className="text-[12px] font-bold text-red-700">{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                            <p className="text-[12px] font-bold text-emerald-700">Bank details saved successfully!</p>
                        </div>
                    )}

                    {/* ═══ SUBMIT ═══ */}
                    <button
                        type="submit"
                        disabled={saving || !bankName || !accountTitle || !accountNumber || !iban}
                        className="w-full font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 active:scale-[0.98] text-white text-[13px] flex items-center justify-center gap-2"
                        style={{ backgroundColor: "#e8323b", boxShadow: "0 4px 12px rgba(232, 50, 59,0.25)" }}
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? "Saving..." : "Save Bank Details"}
                    </button>
                </form>
            )}
        </div>
    );
}
