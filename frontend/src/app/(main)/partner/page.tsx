import { Metadata } from "next";
import { buildPageMetadata } from "@/lib/public-site-settings";
import Link from "next/link";
import { Building2, TrendingUp, Users, Smartphone, BarChart3, Shield, Zap, ArrowRight } from "lucide-react";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://foodiespakistan.pk";

export async function generateMetadata(): Promise<Metadata> {
    return buildPageMetadata({
        title: "List Your Restaurant — Partner with Foodies Pakistan",
        description: "Join Pakistan's leading restaurant platform. Get more diners, boost revenue with deals, and manage your restaurant from a powerful owner dashboard.",
        canonicalPath: "/partner",
    });
}

export default function PartnerPage() {
    const benefits = [
        { icon: Users, title: "More Diners", desc: "Get discovered by thousands of food lovers in your city looking for their next meal." },
        { icon: TrendingUp, title: "Increase Revenue", desc: "Fill empty tables during off-peak hours with smart yield management and promotional deals." },
        { icon: BarChart3, title: "Powerful Dashboard", desc: "Track bookings, manage yield calendar, view settlements, and reply to reviews — all in one place." },
        { icon: Smartphone, title: "Real-Time Bookings", desc: "Live booking notifications with auto-refresh every 15 seconds. Never miss a reservation." },
        { icon: Shield, title: "Secure Payments", desc: "PCI-compliant payment processing. Weekly automatic settlements to your bank account." },
        { icon: Zap, title: "Bank Deal Partnerships", desc: "We partner with top banks (HBL, UBL, MCB, Meezan) to bring card-holder traffic to your restaurant." },
    ];

    const steps = [
        { num: "01", title: "Register", desc: "Create your owner account with your CNIC and business details." },
        { num: "02", title: "Get Approved", desc: "Our team verifies your restaurant within 24-48 hours." },
        { num: "03", title: "Set Up", desc: "Add your menu, photos, opening hours, and bank deals from the dashboard." },
        { num: "04", title: "Go Live", desc: "Your restaurant goes live on Foodies Pakistan and starts receiving bookings!" },
    ];

    const stats = [
        { value: "50,000+", label: "Monthly Diners" },
        { value: "500+", label: "Partner Restaurants" },
        { value: "12", label: "Cities" },
        { value: "4.8★", label: "Avg Rating" },
    ];

    const jsonLd = [
        {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "List Your Restaurant — Foodies Pakistan",
            "description": "Join Pakistan's leading restaurant platform and start receiving bookings.",
            "url": `${SITE_URL}/partner`,
        },
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL },
                { "@type": "ListItem", "position": 2, "name": "Partner", "item": `${SITE_URL}/partner` },
            ],
        },
    ];

    return (
        <div className="bg-gray-50 min-h-screen">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

            {/* Hero */}
            <div className="bg-gradient-to-br from-primary-dark via-primary to-secondary text-white py-20 px-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
                <div className="max-w-3xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur rounded-full px-4 py-1.5 text-sm font-bold mb-6">
                        <Building2 className="w-4 h-4" /> For Restaurant Owners
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        Grow Your Restaurant with Foodies Pakistan
                    </h1>
                    <p className="text-lg text-white/80 max-w-xl mx-auto mb-8">
                        Pakistan&apos;s leading restaurant booking and deals platform. Zero setup fees. Zero monthly charges. Pay only when you get booked.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-3">
                        <Link
                            href="/register/owner"
                            className="bg-white text-primary px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-primary/5 transition flex items-center justify-center gap-2 shadow-lg"
                        >
                            List Your Restaurant <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                            href="/contact-us"
                            className="bg-white/10 border border-white/30 text-white px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-white/20 transition"
                        >
                            Contact Sales
                        </Link>
                    </div>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="max-w-4xl mx-auto px-4 -mt-10 relative z-20">
                <div className="bg-white rounded-2xl shadow-lg border grid grid-cols-2 md:grid-cols-4 divide-x">
                    {stats.map((s) => (
                        <div key={s.label} className="p-5 text-center">
                            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Benefits */}
            <div className="max-w-4xl mx-auto px-4 py-16">
                <h2 className="text-2xl font-bold text-center mb-8">Why Partner with Us?</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {benefits.map((b) => (
                        <div key={b.title} className="bg-white rounded-xl border p-5 space-y-3 hover:shadow-md transition">
                            <div className="w-11 h-11 bg-primary/5 rounded-xl flex items-center justify-center">
                                <b.icon className="w-5 h-5 text-primary" />
                            </div>
                            <h3 className="font-bold">{b.title}</h3>
                            <p className="text-sm text-gray-500">{b.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* How it Works */}
            <div className="bg-white py-16 border-t">
                <div className="max-w-3xl mx-auto px-4">
                    <h2 className="text-2xl font-bold text-center mb-8">Get Started in 4 Steps</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {steps.map((s) => (
                            <div key={s.num} className="flex items-start gap-4 p-4">
                                <div className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center font-bold shrink-0">
                                    {s.num}
                                </div>
                                <div>
                                    <h3 className="font-bold">{s.title}</h3>
                                    <p className="text-sm text-gray-500 mt-0.5">{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* CTA */}
            <div className="max-w-3xl mx-auto px-4 py-16 text-center">
                <h2 className="text-2xl font-bold mb-4">Ready to Fill More Tables?</h2>
                <p className="text-gray-500 mb-6">Join 500+ restaurants already growing with Foodies Pakistan.</p>
                <Link
                    href="/register/owner"
                    className="inline-flex items-center gap-2 bg-primary text-white px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-primary-dark transition shadow-lg shadow-primary/20"
                >
                    Register Your Restaurant <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        </div>
    );
}
