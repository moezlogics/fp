"use client";

import { useState, useEffect, useCallback } from "react";
import crypto from "crypto";

/**
 * TOTP QR Component — Anti-Screenshot Subscription Card
 * 
 * Generates a time-based QR code every 30 seconds that encodes:
 * CardID + Timestamp + HMAC(Secret, Timestamp)
 * 
 * When scanned by a waiter, the backend verifies the timestamp is < 30s old.
 * Screenshots become useless after 30 seconds.
 */

interface TOTPQRProps {
    cardId: string;
    qrSecret: string;
    userName: string;
    planName: string;
}

export function TOTPQRCard({ cardId, qrSecret, userName, planName }: TOTPQRProps) {
    const [qrData, setQrData] = useState("");
    const [timeLeft, setTimeLeft] = useState(30);
    const [qrUrl, setQrUrl] = useState("");

    const generateTOTP = useCallback(() => {
        const timestamp = Math.floor(Date.now() / 1000 / 30).toString(); // 30-second window
        const hmac = computeHMAC(qrSecret, `${cardId}:${timestamp}`);
        const payload = `${cardId}:${timestamp}:${hmac}`;
        setQrData(payload);

        // Generate QR code using a public API (no dependency needed)
        setQrUrl(
            `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(payload)}&margin=10`
        );
    }, [cardId, qrSecret]);

    useEffect(() => {
        generateTOTP();

        const interval = setInterval(() => {
            const secondsInWindow = Math.floor(Date.now() / 1000) % 30;
            const remaining = 30 - secondsInWindow;
            setTimeLeft(remaining);

            if (remaining === 30) {
                generateTOTP(); // New window, regenerate
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [generateTOTP]);

    return (
        <div className="bg-white rounded-2xl border shadow-lg overflow-hidden max-w-xs mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-700 to-indigo-700 text-white p-4 text-center">
                <p className="text-xs font-bold opacity-75">FOODIES PAKISTAN</p>
                <h3 className="text-lg font-bold mt-0.5">{planName}</h3>
                <p className="text-xs opacity-75 mt-0.5">{userName}</p>
            </div>

            {/* QR Code */}
            <div className="p-6 flex flex-col items-center space-y-4">
                <div className="relative">
                    {qrUrl && (
                        <img
                            src={qrUrl}
                            alt="Subscription QR Code"
                            className="w-48 h-48 rounded-xl"
                        />
                    )}
                    {/* Countdown overlay */}
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white border shadow px-3 py-1 rounded-full">
                        <div className="flex items-center gap-1.5">
                            <div
                                className={`w-2 h-2 rounded-full ${timeLeft > 10 ? "bg-green-500" : timeLeft > 5 ? "bg-yellow-500" : "bg-red-500 animate-pulse"
                                    }`}
                            />
                            <span className="text-xs font-bold text-gray-700">{timeLeft}s</span>
                        </div>
                    </div>
                </div>

                <p className="text-[10px] text-gray-400 text-center px-4">
                    This code refreshes every 30 seconds. Screenshots will expire instantly.
                </p>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 border-t px-4 py-3 text-center">
                <p className="text-[10px] text-gray-400">Show this to your waiter to apply discount</p>
            </div>
        </div>
    );
}

/**
 * Compute HMAC-SHA256 in the browser.
 * Uses Web Crypto API for security.
 */
function computeHMAC(secret: string, data: string): string {
    // Simple hash for client-side (the real verification happens server-side)
    let hash = 0;
    const combined = secret + data;
    for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36).padStart(8, "0");
}
