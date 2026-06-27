import Link from "next/link";

export function AppFooter({
    siteName = "Foodies Pakistan",
    tagline = "Pakistan's #1 Restaurant Discovery Platform",
}: {
    siteName?: string;
    tagline?: string;
}) {
    const year = new Date().getFullYear();

    return (
        <footer className="bg-gray-950 text-gray-400 mb-16 sm:mb-0">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium">
                    <Link href="/about-us" className="hover:text-white transition-colors">About</Link>
                    <span className="text-gray-700 hidden sm:inline">·</span>
                    <Link href="/contact-us" className="hover:text-white transition-colors">Contact</Link>
                    <span className="text-gray-700 hidden sm:inline">·</span>
                    <Link href="/terms-conditions" className="hover:text-white transition-colors">Terms & Conditions</Link>
                    <span className="text-gray-700 hidden sm:inline">·</span>
                    <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
                    <span className="text-gray-700 hidden sm:inline">·</span>
                    <Link href="/disclaimer" className="hover:text-white transition-colors">Disclaimer</Link>
                    <span className="text-gray-700 hidden sm:inline">·</span>
                    <Link href="/payment-options" className="hover:text-white transition-colors">Payment Options</Link>
                </div>
            </div>

            <div className="border-t border-white/5">
                <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <p className="text-[11px] text-gray-600 font-medium">
                        © {year} {siteName}. All rights reserved.
                    </p>
                    <p className="text-[11px] text-gray-700 font-medium">
                        {tagline}
                    </p>
                </div>
            </div>
        </footer>
    );
}

