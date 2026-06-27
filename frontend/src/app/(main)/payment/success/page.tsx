"use client";

import { useSearchParams } from "next/navigation";
import { CheckCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

function SuccessContent() {
    const searchParams = useSearchParams();
    const ref = searchParams.get("ref");
    const kind = searchParams.get("kind") || "payment";
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
            ? "View Prime Status"
            : kind === "foodiepay"
                ? "View My Bookings"
                : kind === "card-save"
                    ? "View Payment Methods"
                    : "Continue";
    const description =
        kind === "prime"
            ? "Your Prime payment was received and the latest membership state is now available."
            : kind === "foodiepay"
                ? "Your FoodiePay bill was completed successfully."
                : kind === "card-save"
                    ? "Your card verification finished successfully."
                    : "Your transaction was completed successfully.";

    return (
        <div className="bg-white rounded-2xl border p-8 max-w-md w-full text-center shadow-lg">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
            <p className="text-gray-500 mb-6">
                {description}
            </p>
            {ref && (
                <div className="bg-gray-50 rounded-xl p-4 mb-8 text-sm border font-mono text-gray-600">
                    Ref: {ref}
                </div>
            )}

            <div className="space-y-3">
                <Link
                    href={primaryHref}
                    className="w-full bg-teal-600 text-white py-4 rounded-xl font-bold hover:bg-teal-700 transition flex items-center justify-center gap-2"
                >
                    {primaryLabel} <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                    href="/"
                    className="w-full text-gray-500 hover:text-gray-900 py-3 block font-medium"
                >
                    Return Home
                </Link>
            </div>
        </div>
    );
}

export default function PaymentSuccessPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Suspense fallback={<div className="animate-pulse w-full max-w-md h-96 bg-gray-200 rounded-2xl"></div>}>
                <SuccessContent />
            </Suspense>
        </div>
    );
}
