"use client";

import { useSearchParams } from "next/navigation";
import { XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

function FailedContent() {
    const searchParams = useSearchParams();
    const ref = searchParams.get("ref");
    const kind = searchParams.get("kind") || "payment";
    const reason = searchParams.get("reason") || "Transaction declined by gateway.";
    const primaryHref =
        kind === "prime"
            ? "/prime"
            : kind === "foodiepay"
                ? "/my-bookings"
                : kind === "card-save"
                    ? "/account/payment-methods"
                    : "/";
    const primaryLabel =
        kind === "prime"
            ? "Back to Prime"
            : kind === "foodiepay"
                ? "Back to My Bookings"
                : kind === "card-save"
                    ? "Back to Payment Methods"
                    : "Return Home";
    const retryHref =
        kind === "prime"
            ? "/prime"
            : kind === "foodiepay"
                ? "/my-bookings"
                : kind === "card-save"
                    ? "/account/payment-methods"
                    : "/";

    return (
        <div className="bg-white rounded-2xl border p-8 max-w-md w-full text-center shadow-lg border-red-100">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Failed</h1>
            <p className="text-gray-600 mb-6 font-medium bg-red-50 p-4 rounded-xl border border-red-100 text-sm">
                {reason}
            </p>
            {ref && (
                <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm border font-mono text-gray-600">
                    Ref: {ref}
                </div>
            )}

            <div className="space-y-3">
                <Link
                    href={primaryHref}
                    className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition flex items-center justify-center gap-2"
                >
                    {primaryLabel}
                </Link>
                <Link
                    href={retryHref}
                    className="w-full text-gray-500 hover:text-gray-900 py-3 flex items-center justify-center gap-2 font-medium"
                >
                    <ArrowLeft className="w-4 h-4" /> Try Again
                </Link>
            </div>
        </div>
    );
}

export default function PaymentFailedPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Suspense fallback={<div className="animate-pulse w-full max-w-md h-96 bg-gray-200 rounded-2xl"></div>}>
                <FailedContent />
            </Suspense>
        </div>
    );
}
