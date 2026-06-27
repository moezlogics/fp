"use client";

import { useState, FormEvent } from "react";
import { Mail, Phone, MapPin, MessageCircle, Send, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://foodiespakistan.pk";

const SUBJECT_OPTIONS = [
    { value: "", label: "Select a topic" },
    { value: "booking", label: "Booking Issue" },
    { value: "partnership", label: "Restaurant Partnership" },
    { value: "feedback", label: "Feedback & Suggestions" },
    { value: "payment", label: "Payment Query" },
    { value: "other", label: "Other" },
];

export default function ContactPage() {
    const [form, setForm] = useState({
        name: "",
        email: "",
        subject: "",
        message: "",
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        if (error) setError("");
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");

        // Client-side validation
        if (!form.name.trim() || form.name.trim().length < 2) {
            setError("Please enter your full name (at least 2 characters).");
            return;
        }
        if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            setError("Please enter a valid email address.");
            return;
        }
        if (!form.subject) {
            setError("Please select a topic.");
            return;
        }
        if (!form.message.trim() || form.message.trim().length < 10) {
            setError("Please write a message (at least 10 characters).");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/contact-leads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name.trim(),
                    email: form.email.trim(),
                    subject: form.subject,
                    message: form.message.trim(),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Something went wrong. Please try again.");
                setLoading(false);
                return;
            }

            setSuccess(true);
            setForm({ name: "", email: "", subject: "", message: "" });
        } catch {
            setError("Network error. Please check your connection and try again.");
        }

        setLoading(false);
    };

    const jsonLd = [
        {
            "@context": "https://schema.org",
            "@type": "ContactPage",
            name: "Contact — Foodies Pakistan",
            description:
                "Get in touch with the Foodies Pakistan team for reservations, partnerships, and support.",
            url: `${SITE_URL}/contact-us/`,
            mainEntity: {
                "@type": "Organization",
                name: "Foodies Pakistan",
                url: SITE_URL,
                contactPoint: {
                    "@type": "ContactPoint",
                    contactType: "customer support",
                    email: "logicalmoez@gmail.com",
                    telephone: "03299493973",
                    areaServed: "PK",
                    availableLanguage: ["English", "Urdu"],
                },
            },
        },
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
                {
                    "@type": "ListItem",
                    position: 1,
                    name: "Home",
                    item: SITE_URL,
                },
                {
                    "@type": "ListItem",
                    position: 2,
                    name: "Contact",
                    item: `${SITE_URL}/contact-us/`,
                },
            ],
        },
    ];

    return (
        <div className="bg-gray-50 min-h-screen pb-16">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
                }}
            />

            {/* Hero */}
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-16 px-4">
                <div className="max-w-2xl mx-auto text-center">
                    <h1 className="text-4xl font-bold mb-2">Contact Us</h1>
                    <p className="text-gray-300">
                        We&apos;d love to hear from you. Reach out via any channel below.
                    </p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 -mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact Info */}
                <div className="space-y-4">
                    {[
                        {
                            icon: Mail,
                            label: "Email",
                            value: "logicalmoez@gmail.com",
                            href: "mailto:logicalmoez@gmail.com",
                        },
                        {
                            icon: Phone,
                            label: "Phone",
                            value: "03299493973",
                            href: "tel:03299493973",
                        },
                        {
                            icon: MessageCircle,
                            label: "WhatsApp",
                            value: "03299493973",
                            href: "https://wa.me/923299493973",
                        },
                        {
                            icon: MapPin,
                            label: "Office",
                            value: "Lahore, Punjab, Pakistan",
                            href: "https://maps.google.com/?q=Lahore+Pakistan",
                        },
                    ].map((item) => (
                        <a
                            key={item.label}
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white rounded-xl border p-5 flex items-center gap-4 hover:shadow-md transition"
                        >
                            <div className="w-12 h-12 bg-primary/5 rounded-xl flex items-center justify-center shrink-0">
                                <item.icon className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase">
                                    {item.label}
                                </p>
                                <p className="font-bold text-gray-900">{item.value}</p>
                            </div>
                        </a>
                    ))}
                </div>

                {/* Contact Form */}
                <div className="bg-white rounded-2xl border p-6 space-y-5">
                    <h2 className="text-lg font-bold">Send us a Message</h2>

                    {success ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
                            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-green-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-900">
                                    Message Sent Successfully!
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Thank you for reaching out. We&apos;ll get back to you within 24
                                    hours.
                                </p>
                            </div>
                            <button
                                onClick={() => setSuccess(false)}
                                className="text-primary font-bold text-sm hover:underline mt-2"
                            >
                                Send Another Message
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-600">{error}</p>
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-600">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    placeholder="Your name"
                                    disabled={loading}
                                    className="w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary transition disabled:opacity-50 disabled:bg-gray-50"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-600">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="you@example.com"
                                    disabled={loading}
                                    className="w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary transition disabled:opacity-50 disabled:bg-gray-50"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-600">
                                    Subject
                                </label>
                                <select
                                    name="subject"
                                    value={form.subject}
                                    onChange={handleChange}
                                    disabled={loading}
                                    className="w-full border rounded-xl px-4 py-2.5 text-sm text-gray-600 focus:ring-2 focus:ring-primary/30 focus:border-primary transition disabled:opacity-50 disabled:bg-gray-50"
                                >
                                    {SUBJECT_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-600">
                                    Message
                                </label>
                                <textarea
                                    name="message"
                                    value={form.message}
                                    onChange={handleChange}
                                    rows={4}
                                    placeholder="How can we help?"
                                    disabled={loading}
                                    className="w-full border rounded-xl px-4 py-2.5 text-sm resize-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition disabled:opacity-50 disabled:bg-gray-50"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm hover:bg-primary-dark transition flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" /> Send Message
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
