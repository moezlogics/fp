"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NotFound() {
    const [searchQuery, setSearchQuery] = useState("");
    const router = useRouter();

    function getUserCity(): string {
        if (typeof document === "undefined") return "lahore";
        const match = document.cookie.match(/foodies_city=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : "lahore";
    }

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        const city = getUserCity();
        router.push(`/${city}?q=${encodeURIComponent(searchQuery.trim())}`);
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <title>Page Not Found | Foodies Pakistan</title>
            <meta name="robots" content="noindex, nofollow" />
            <div className="max-w-md w-full text-center space-y-8">
                {/* Visual Icon/Graphics */}
                <div className="relative">
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-[150px] font-black text-gray-100 select-none z-0">
                        404
                    </div>
                    <div className="relative z-10 w-32 h-32 mx-auto bg-white rounded-full shadow-xl shadow-primary/10 flex items-center justify-center border-4 border-gray-50">
                        <span className="text-5xl">🍽️</span>
                    </div>
                </div>

                <div className="relative z-10 space-y-3">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Are You Lost?</h1>
                    <p className="text-gray-500 font-medium leading-relaxed">
                        We searched high and low, but couldn&apos;t find the page you&apos;re looking for. The link might be broken or the page was removed.
                    </p>
                </div>

                <div className="relative z-10 space-y-4 pt-4">
                    <form onSubmit={handleSearch} className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Find your favorite restaurants..."
                            className="w-full bg-white border border-gray-200 rounded-2xl py-4 pl-12 pr-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
                        />
                    </form>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <Link href="/" className="flex-1 bg-primary text-white py-3.5 rounded-xl font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all text-sm flex items-center justify-center gap-2">
                            Go Home
                        </Link>
                        <Link href="/account" className="flex-1 bg-white border border-gray-200 text-gray-700 py-3.5 rounded-xl font-bold hover:border-gray-300 hover:bg-gray-50 transition-all text-sm flex items-center justify-center gap-2">
                            My Account
                        </Link>
                    </div>
                </div>

                <div className="relative z-10 pt-6 border-t border-gray-200">
                    <p className="text-xs text-gray-400 font-medium">
                        Need help? <a href="/contact-us" className="text-primary hover:underline">Contact Support</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
