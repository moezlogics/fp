import { Metadata } from "next";
import { buildPageMetadata, getPublicSiteSettings } from "@/lib/public-site-settings";
import { MapPin, Users, Utensils, Shield, Heart, Globe, Building2, Sparkles } from "lucide-react";
import Link from "next/link";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://foodiespakistan.pk";

export async function generateMetadata(): Promise<Metadata> {
    return buildPageMetadata({
        title: "About Us — Pakistan's Leading Restaurant Platform",
        description:
            "Learn about Foodies Pakistan — the country's #1 restaurant discovery, booking, and deals platform. Connecting food lovers with the best restaurants across Pakistan.",
        canonicalPath: "/about-us",
    });
}

export default async function AboutPage() {
    const settings = await getPublicSiteSettings(300);
    const siteName = settings.siteName || "Foodies Pakistan";
    const logoUrl = settings.logoUrl || `${SITE_URL}/icon-512.png`;

    const cities = [
        "Lahore", "Islamabad", "Karachi", "Multan",
    ];

    const values = [
        { icon: Heart, title: "Passion for Food", desc: "We celebrate Pakistan's diverse culinary heritage — from street food to fine dining." },
        { icon: Shield, title: "Trust & Transparency", desc: "Verified reviews, upfront pricing, and secure payments so you can dine worry-free." },
        { icon: Users, title: "Community First", desc: "Built for foodies by foodies. Every feature is designed with our users in mind." },
        { icon: Sparkles, title: "Innovation", desc: "AI-powered recommendations, real-time availability, and industry-leading deal engines." },
    ];

    const stats = [
        { value: "500+", label: "Partner Restaurants" },
        { value: "12+", label: "Cities" },
        { value: "50,000+", label: "Monthly Diners" },
        { value: "4.8★", label: "Average Rating" },
    ];

    // JSON-LD: AboutPage + Organization + BreadcrumbList
    const jsonLd = [
        {
            "@context": "https://schema.org",
            "@type": "AboutPage",
            "name": `About ${siteName}`,
            "description": "Pakistan's #1 restaurant discovery, booking, and deals platform.",
            "url": `${SITE_URL}/about-us/`,
            "mainEntity": {
                "@type": "Organization",
                "name": siteName,
                "url": SITE_URL,
                "logo": logoUrl,
                "description": "Pakistan's leading restaurant discovery, booking, and deals platform connecting food lovers with the best restaurants across the country.",
                "foundingDate": "2022",
                "areaServed": {
                    "@type": "Country",
                    "name": "Pakistan",
                },
                "sameAs": [
                    settings.facebookUrl,
                    settings.instagramUrl,
                    settings.tiktokUrl,
                    settings.youtubeUrl,
                ].filter(Boolean),
                "contactPoint": {
                    "@type": "ContactPoint",
                    "contactType": "customer support",
                    "email": settings.contactEmail || "logicalmoez@gmail.com",
                    "telephone": settings.contactPhone || "03299493973",
                    "areaServed": "PK",
                    "availableLanguage": ["English", "Urdu"],
                },
            },
        },
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL },
                { "@type": "ListItem", "position": 2, "name": "About Us", "item": `${SITE_URL}/about-us/` },
            ],
        },
    ];

    return (
        <div className="bg-gray-50 min-h-screen pb-16">
            {/* JSON-LD */}
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

            {/* Hero */}
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-20 px-4 relative overflow-hidden">
                <div className="absolute inset-0 opacity-20"
                    style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(251,146,60,0.25), transparent 70%)" }} />
                <div className="max-w-3xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-1.5 text-sm font-bold mb-6">
                        <Globe className="w-4 h-4 text-primary/80" /> All Over Pakistan
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        About {siteName}
                    </h1>
                    <p className="text-lg text-gray-300 max-w-xl mx-auto leading-relaxed">
                        Pakistan&apos;s #1 restaurant discovery, booking, and deals platform — connecting food lovers
                        with the best dining experiences from Lahore to Karachi and everywhere in between.
                    </p>
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

            {/* Mission */}
            <section className="max-w-3xl mx-auto px-4 py-16 text-center">
                <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
                <p className="text-gray-600 leading-relaxed max-w-2xl mx-auto text-justify sm:text-center">
                    We are on an ambitious mission to redefine the dining ecosystem in Pakistan. By integrating robust, cutting-edge technology with an intrinsic understanding of Pakistan's rich culinary heritage, we aim to bridge the gap between food enthusiasts and world-class restaurants. Whether it is ensuring a seamless, instant table reservation, uncovering exclusive financial benefits, or empowering restaurant partners with scalable technological infrastructure, we are committed to elevating the hospitality industry to global standards.
                </p>
            </section>

            {/* What We Do */}
            <section className="bg-white border-t border-b py-16">
                <div className="max-w-4xl mx-auto px-4">
                    <h2 className="text-2xl font-bold text-center mb-10">What We Do</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { icon: Utensils, title: "Discover Culinary Excellence", desc: "Navigate through a meticulously curated catalog of premium restaurants featuring immersive virtual tours, verified user reviews, and transparent pricing models." },
                            { icon: MapPin, title: "Frictionless Reservations", desc: "Experience the convenience of instant, confirmed table bookings at Pakistan's finest dining establishments, eliminating the traditional hassle of wait times." },
                            { icon: Building2, title: "Unprecedented Savings", desc: "Unlock substantial value through integrated bank partnerships, dynamic yield pricing, and our exclusive Foodies Prime membership program." },
                        ].map((item) => (
                            <div key={item.title} className="bg-gray-50 rounded-xl p-6 text-center space-y-3 hover:shadow-md transition-shadow">
                                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto">
                                    <item.icon className="w-6 h-6 text-primary" />
                                </div>
                                <h3 className="font-bold text-gray-900">{item.title}</h3>
                                <p className="text-sm text-gray-600">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Our Values */}
            <section className="max-w-4xl mx-auto px-4 py-16">
                <h2 className="text-2xl font-bold text-center mb-10">Our Values</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {values.map((v) => (
                        <div key={v.title} className="bg-white rounded-xl border p-5 flex items-start gap-4 hover:shadow-md transition">
                            <div className="w-11 h-11 bg-primary/5 rounded-xl flex items-center justify-center shrink-0">
                                <v.icon className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">{v.title}</h3>
                                <p className="text-sm text-gray-500 mt-0.5">{v.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Cities We Cover */}
            <section className="bg-white border-t py-16">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h2 className="text-2xl font-bold mb-3">Cities We Cover</h2>
                    <p className="text-sm text-gray-500 mb-8 max-w-lg mx-auto">
                        From bustling metropolises to rising food destinations — we&apos;re bringing the best restaurant
                        experiences to cities across Pakistan.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                        {cities.map((city) => (
                            <Link
                                key={city}
                                href={`/${city.toLowerCase()}`}
                                className="bg-gray-50 hover:bg-primary/5 border hover:border-primary/20 rounded-full px-5 py-2 text-sm font-bold text-gray-700 hover:text-primary transition"
                            >
                                {city}
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="max-w-3xl mx-auto px-4 py-16 text-center">
                <h2 className="text-2xl font-bold mb-4">Join the Foodies Community</h2>
                <p className="text-gray-500 mb-6">
                    Whether you&apos;re looking for the best biryani in Karachi or a fine-dining experience in Islamabad,
                    we&apos;re here to help you discover your next favorite meal.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-3">
                    <Link
                        href="/partner"
                        className="inline-flex items-center justify-center gap-2 bg-primary text-white px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-primary-dark transition shadow-lg shadow-primary/20"
                    >
                        List Your Restaurant
                    </Link>
                    <Link
                        href="/contact-us"
                        className="inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-900 px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-gray-200 transition"
                    >
                        Contact Us
                    </Link>
                </div>
            </section>
        </div>
    );
}
