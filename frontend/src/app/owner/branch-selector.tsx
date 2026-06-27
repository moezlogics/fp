"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
    Store, Plus, Lock, Eye, EyeOff, Loader2, ArrowLeft,
    MapPin, AlertTriangle, CheckCircle2, X, KeyRound
} from "lucide-react";
import { useRouter } from "next/navigation";

/* ─── Constants ─── */
const STORAGE_KEY = "foodies_branch_lock";

interface Branch {
    _id: string;
    brandName: string;
    branchName: string;
    logo?: string;
    coverImage?: string;
    city?: string;
    area?: string;
    hasPinSet?: boolean;
}

interface BranchSelectorProps {
    branches: Branch[];
    onBranchSelected: (branchId: string) => void;
    canAddBranch: boolean;
}

/* ─── localStorage helpers ─── */
export function getSavedBranchId(): string | null {
    if (typeof window === "undefined") return null;
    try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        return data?.branchId || null;
    } catch { return null; }
}

export function saveBranchToDevice(branchId: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ branchId, ts: Date.now() }));
}

export function clearDeviceBranch() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
}

/* ─── Gradient palette per card index ─── */
const CARD_GRADIENTS = [
    "linear-gradient(135deg, #f0f8db 0%, #ffffff 100%)",
    "linear-gradient(135deg, #f4f9e8 0%, #ffffff 100%)",
    "linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)",
    "linear-gradient(135deg, #fef2f2 0%, #ffffff 100%)",
    "linear-gradient(135deg, #f5f3ff 0%, #ffffff 100%)",
    "linear-gradient(135deg, #ecfeff 0%, #ffffff 100%)",
];

export default function BranchSelector({ branches, onBranchSelected, canAddBranch }: BranchSelectorProps) {
    const router = useRouter();
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
    const [mode, setMode] = useState<"select" | "pin" | "set-pin">("select");
    const [pin, setPin] = useState(["", "", "", ""]);
    const [newPin, setNewPin] = useState(["", "", "", ""]);
    const [confirmPin, setConfirmPin] = useState(["", "", "", ""]);
    const [setPinStep, setSetPinStep] = useState<"create" | "confirm">("create");
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState("");
    const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
    const newPinRefs = useRef<(HTMLInputElement | null)[]>([]);
    const confirmPinRefs = useRef<(HTMLInputElement | null)[]>([]);

    /* ─── PIN Input Handlers ─── */
    const handlePinChange = useCallback((
        index: number,
        value: string,
        pinState: string[],
        setPinState: React.Dispatch<React.SetStateAction<string[]>>,
        refs: React.MutableRefObject<(HTMLInputElement | null)[]>
    ) => {
        if (!/^\d?$/.test(value)) return;
        const updated = [...pinState];
        updated[index] = value;
        setPinState(updated);

        if (value && index < 3) {
            refs.current[index + 1]?.focus();
        }
    }, []);

    const handlePinKeyDown = useCallback((
        index: number,
        e: React.KeyboardEvent,
        pinState: string[],
        setPinState: React.Dispatch<React.SetStateAction<string[]>>,
        refs: React.MutableRefObject<(HTMLInputElement | null)[]>
    ) => {
        if (e.key === "Backspace" && !pinState[index] && index > 0) {
            const updated = [...pinState];
            updated[index - 1] = "";
            setPinState(updated);
            refs.current[index - 1]?.focus();
        }
    }, []);

    /* ─── Verify PIN ─── */
    const verifyPin = async () => {
        if (!selectedBranch) return;
        const pinStr = pin.join("");
        if (pinStr.length !== 4) { setError("Enter all 4 digits"); return; }

        setVerifying(true);
        setError("");

        try {
            const res = await fetch("/api/owner/branch-auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "verify-pin", branchId: selectedBranch._id, pin: pinStr }),
            });
            const data = await res.json();
            const result = data?.data || data;

            if (result?.requiresPinSetup) {
                setMode("set-pin");
                setSetPinStep("create");
                setNewPin(["", "", "", ""]);
                setConfirmPin(["", "", "", ""]);
                setVerifying(false);
                setTimeout(() => newPinRefs.current[0]?.focus(), 100);
                return;
            }

            if (result?.verified || res.ok) {
                saveBranchToDevice(selectedBranch._id);
                onBranchSelected(selectedBranch._id);
            } else {
                setError(data?.error || result?.error || "Incorrect PIN");
                setPin(["", "", "", ""]);
                setTimeout(() => pinRefs.current[0]?.focus(), 100);
            }
        } catch {
            setError("Network error. Please try again.");
        }
        setVerifying(false);
    };

    /* ─── Set PIN (for branches without PIN) ─── */
    const setNewPinHandler = async () => {
        if (!selectedBranch) return;
        const pinStr = newPin.join("");
        const confirmStr = confirmPin.join("");

        if (setPinStep === "create") {
            if (pinStr.length !== 4) { setError("Enter all 4 digits"); return; }
            setSetPinStep("confirm");
            setError("");
            setConfirmPin(["", "", "", ""]);
            setTimeout(() => confirmPinRefs.current[0]?.focus(), 100);
            return;
        }

        // Confirm step
        if (confirmStr.length !== 4) { setError("Enter all 4 digits"); return; }
        if (pinStr !== confirmStr) {
            setError("PINs do not match. Try again.");
            setConfirmPin(["", "", "", ""]);
            setTimeout(() => confirmPinRefs.current[0]?.focus(), 100);
            return;
        }

        setVerifying(true);
        setError("");

        try {
            const res = await fetch("/api/owner/branch-auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "set-pin", branchId: selectedBranch._id, pin: pinStr }),
            });
            const data = await res.json();

            if (res.ok) {
                // PIN set — now lock to this branch
                saveBranchToDevice(selectedBranch._id);
                onBranchSelected(selectedBranch._id);
            } else {
                setError(data?.error || "Failed to set PIN.");
            }
        } catch {
            setError("Network error. Please try again.");
        }
        setVerifying(false);
    };

    /* ─── Auto-submit PIN when all 4 digits entered ─── */
    useEffect(() => {
        if (mode === "pin" && pin.every(d => d !== "") && !verifying) {
            verifyPin();
        }
    }, [pin, mode]);

    useEffect(() => {
        if (mode === "set-pin" && setPinStep === "confirm" && confirmPin.every(d => d !== "") && !verifying) {
            setNewPinHandler();
        }
    }, [confirmPin, mode, setPinStep]);

    /* ─── Back to selector ─── */
    const goBack = () => {
        setMode("select");
        setSelectedBranch(null);
        setPin(["", "", "", ""]);
        setNewPin(["", "", "", ""]);
        setConfirmPin(["", "", "", ""]);
        setError("");
        setSetPinStep("create");
    };

    /* ─── Click on a branch card ─── */
    const selectBranch = (branch: Branch) => {
        setSelectedBranch(branch);
        setMode("pin");
        setPin(["", "", "", ""]);
        setError("");
        setTimeout(() => pinRefs.current[0]?.focus(), 150);
    };

    /* ─── Render PIN Input ─── */
    const renderPinInput = (
        pinState: string[],
        setPinState: React.Dispatch<React.SetStateAction<string[]>>,
        refs: React.MutableRefObject<(HTMLInputElement | null)[]>
    ) => (
        <div className="flex gap-3 justify-center">
            {pinState.map((digit, i) => (
                <input
                    key={i}
                    ref={el => { refs.current[i] = el; }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handlePinChange(i, e.target.value, pinState, setPinState, refs)}
                    onKeyDown={e => handlePinKeyDown(i, e, pinState, setPinState, refs)}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl text-center text-2xl font-black bg-white border-2 text-gray-900 outline-none transition-all focus:border-primary focus:bg-white focus:shadow-lg focus:shadow-primary/15"
                    style={{
                        borderColor: digit ? "rgba(232, 50, 59,0.55)" : "rgba(226,232,240,1)",
                        caretColor: "#e8323b",
                    }}
                />
            ))}
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-y-auto"
            style={{ background: "linear-gradient(180deg, #f4f9e8 0%, #fff 48%, #f7f9fc 100%)" }}>

            {/* Ambient glow decorations */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20/40 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/10/60 rounded-full blur-3xl pointer-events-none" />

            {/* ═══ PROFILE SELECTOR SCREEN ═══ */}
            {mode === "select" && (
                <div className="w-full max-w-xl px-4 py-10 animate-in fade-in duration-500">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/50 to-primary-dark flex items-center justify-center mb-5 shadow-xl shadow-primary/25">
                            <Store className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Select Branch</h1>
                        <p className="text-sm text-gray-500 mt-2">Choose the branch you want to manage</p>
                    </div>

                    {/* Branch Cards Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                        {branches.map((branch, index) => (
                            <button
                                key={branch._id}
                                onClick={() => selectBranch(branch)}
                                className="group relative overflow-hidden rounded-2xl aspect-square flex flex-col items-center justify-center p-4 text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl active:scale-95 border border-white/80"
                                style={{
                                    background: CARD_GRADIENTS[index % CARD_GRADIENTS.length],
                                    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
                                }}
                            >
                                {/* Branch Logo or Initial */}
                                <div className="relative z-10 mb-3">
                                    {branch.logo ? (
                                        <img
                                            src={branch.logo}
                                            alt={branch.brandName}
                                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-primary/10 group-hover:border-primary/30 transition-colors"
                                        />
                                    ) : (
                                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/10 flex items-center justify-center group-hover:border-primary/30 transition-colors">
                                            <span className="text-xl sm:text-2xl font-black text-primary">
                                                {branch.brandName?.charAt(0) || "B"}
                                            </span>
                                        </div>
                                    )}
                                    {/* Lock indicator */}
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border-2 border-primary/10 flex items-center justify-center shadow-sm">
                                        <Lock className="w-3 h-3 text-primary" />
                                    </div>
                                </div>

                                <p className="relative z-10 text-xs sm:text-sm font-bold text-gray-900 leading-tight truncate w-full">
                                    {branch.branchName || "Main Branch"}
                                </p>
                                {branch.city && (
                                    <p className="relative z-10 text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> {branch.area || branch.city}
                                    </p>
                                )}

                                {/* Hover glow */}
                                <div className="absolute inset-0 bg-gradient-to-t from-primary/50/0 to-primary/50/0 group-hover:from-primary/50/8 group-hover:to-transparent transition-all duration-500" />
                            </button>
                        ))}

                        {/* Add New Branch */}
                        {canAddBranch && (
                            <button
                                onClick={() => router.push("/owner/new-branch")}
                                className="group relative overflow-hidden rounded-2xl aspect-square flex flex-col items-center justify-center p-4 text-center transition-all duration-300 hover:-translate-y-0.5 active:scale-95 border-2 border-dashed border-primary/20 hover:border-primary/30"
                                style={{ background: "rgba(255,255,255,0.85)" }}
                            >
                                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/5 border-2 border-primary/10 flex items-center justify-center mb-3 group-hover:border-primary/30 group-hover:bg-primary/10 transition-all">
                                    <Plus className="w-6 h-6 text-primary transition-colors" />
                                </div>
                                <p className="text-xs font-bold text-gray-700 transition-colors">Add Branch</p>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ PIN ENTRY SCREEN ═══ */}
            {mode === "pin" && selectedBranch && (
                <div className="w-full max-w-sm px-6 py-10 animate-in fade-in slide-in-from-right duration-300">
                    <div className="rounded-[28px] border border-primary/10 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
                    {/* Back button */}
                    <button onClick={goBack} className="text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-2 mb-8 text-sm font-medium">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>

                    <div className="text-center mb-8">
                        {/* Branch identity */}
                        {selectedBranch.logo ? (
                            <img src={selectedBranch.logo} alt="" className="w-16 h-16 rounded-2xl mx-auto mb-4 object-cover border-2 border-primary/10" />
                        ) : (
                            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/10 flex items-center justify-center">
                                <span className="text-2xl font-black text-primary">{selectedBranch.brandName?.charAt(0) || "B"}</span>
                            </div>
                        )}
                        <h2 className="text-xl font-black text-gray-900">{selectedBranch.branchName || "Main Branch"}</h2>
                        <p className="text-xs text-gray-500 mt-1">{selectedBranch.brandName}</p>
                    </div>

                    {/* Lock icon */}
                    <div className="flex justify-center mb-6">
                        <div className="w-12 h-12 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center">
                            <KeyRound className="w-5 h-5 text-primary" />
                        </div>
                    </div>

                    <p className="text-center text-sm text-gray-500 mb-6">Enter 4-digit Access PIN</p>

                    {/* PIN Input */}
                    {renderPinInput(pin, setPin, pinRefs)}

                    {/* Error */}
                    {error && (
                        <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium text-center flex items-center justify-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5" /> {error}
                        </div>
                    )}

                    {/* Loading */}
                    {verifying && (
                        <div className="flex items-center justify-center gap-2 mt-5 text-primary text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                        </div>
                    )}
                    </div>
                </div>
            )}

            {/* ═══ SET PIN SCREEN (for branches without PIN) ═══ */}
            {mode === "set-pin" && selectedBranch && (
                <div className="w-full max-w-sm px-6 py-10 animate-in fade-in slide-in-from-right duration-300">
                    <div className="rounded-[28px] border border-primary/10 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
                    <button onClick={goBack} className="text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-2 mb-8 text-sm font-medium">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>

                    <div className="text-center mb-6">
                        <div className="w-14 h-14 rounded-2xl mx-auto mb-4 bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-100 flex items-center justify-center">
                            <Lock className="w-6 h-6 text-emerald-600" />
                        </div>
                        <h2 className="text-xl font-black text-gray-900">
                            {setPinStep === "create" ? "Set Access PIN" : "Confirm PIN"}
                        </h2>
                        <p className="text-xs text-gray-500 mt-2 max-w-[280px] mx-auto">
                            {setPinStep === "create"
                                ? `Set a 4-digit PIN for "${selectedBranch.branchName || "Main Branch"}". This PIN will be required on every device.`
                                : "Enter the same PIN again to confirm."
                            }
                        </p>
                    </div>

                    {/* PIN Input */}
                    {setPinStep === "create"
                        ? renderPinInput(newPin, setNewPin, newPinRefs)
                        : renderPinInput(confirmPin, setConfirmPin, confirmPinRefs)
                    }

                    {/* Submit button for create step */}
                    {setPinStep === "create" && (
                        <button
                            onClick={setNewPinHandler}
                            disabled={newPin.some(d => d === "") || verifying}
                            className="w-full mt-6 py-3.5 rounded-2xl bg-gradient-to-r from-primary/50 to-primary-dark text-white font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/25"
                        >
                            Continue
                        </button>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium text-center flex items-center justify-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5" /> {error}
                        </div>
                    )}

                    {/* Loading */}
                    {verifying && (
                        <div className="flex items-center justify-center gap-2 mt-5 text-emerald-600 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" /> Setting PIN...
                        </div>
                    )}

                    {/* Warning */}
                    <div className="mt-6 p-3 rounded-xl bg-primary/5 border border-primary/10 text-primary-dark text-[11px] text-center">
                        Remember this PIN. It is required to manage this branch from any device.
                    </div>
                    </div>
                </div>
            )}
        </div>
    );
}
