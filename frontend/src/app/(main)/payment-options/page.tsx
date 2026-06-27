import { Metadata } from "next";
import { buildPageMetadata } from "@/lib/public-site-settings";
import { CreditCard, ShieldCheck, ArrowRight, Lock } from "lucide-react";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://foodiespakistan.pk";

export async function generateMetadata(): Promise<Metadata> {
    return buildPageMetadata({
        title: "Payment Options & Gateways | Foodies Pakistan",
        description:
            "A comprehensive guide on Foodies Pakistan's secure payment options. We support seamless Debit/Credit Card payments powered by Payfast.",
        canonicalPath: "/payment-options",
    });
}

export default function PaymentOptionsPage() {
    const jsonLd = [
        {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Payment Options — Foodies Pakistan",
            "description": "Learn about the secure Debit and Credit card payment options available on Foodies Pakistan via Payfast.",
            "url": `${SITE_URL}/payment-options`,
        },
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL },
                { "@type": "ListItem", "position": 2, "name": "Payment Options", "item": `${SITE_URL}/payment-options` },
            ],
        },
    ];

    return (
        <div className="bg-gray-50 min-h-screen pb-16">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

            {/* Hero Section */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-20 px-4 border-b border-slate-700">
                <div className="max-w-3xl mx-auto text-center space-y-6">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-1.5 text-sm font-bold text-slate-200">
                        <ShieldCheck className="w-4 h-4 text-green-400" /> Safe and Secure Payments
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Payment Options</h1>
                    <p className="text-slate-300 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
                        Welcome to Foodies Pakistan's payment guide. We want to make sure you have a smooth, simple, and 100% safe experience when paying for your restaurant bookings, memberships, and more. Read below to understand how we handle your money safely.
                    </p>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 -mt-10 space-y-8 relative z-10">
                {/* Primary Payment Mechanism */}
                <div className="bg-white rounded-2xl border p-8 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row items-start md:items-center gap-8">
                    <div className="w-20 h-20 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shrink-0">
                        <CreditCard className="w-10 h-10" />
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-slate-900">How You Can Pay: Debit and Credit Cards</h2>
                        <p className="text-slate-600 leading-relaxed">
                            To give you the highest level of safety, we process all our payments using <strong>Payfast</strong>, one of Pakistan's most trusted and certified payment companies. We gladly accept all major debit and credit cards, including <strong>Visa, MasterCard, and PayPak</strong>. 
                        </p>
                        <p className="text-slate-600 leading-relaxed">
                            When you make a payment on our platform, you are directly connected to Payfast's highly secure system. We do this so that your sensitive card details are never exposed. 
                        </p>
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800 text-sm">
                            <strong>Important Note:</strong> Right now, we do not support payments through JazzCash, EasyPaisa, or direct bank transfers. We only accept debit and credit cards to ensure fast and reliable processing.
                        </div>
                    </div>
                </div>

                {/* Transaction Typologies */}
                <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                    <div className="bg-slate-50 p-6 md:p-8 border-b">
                        <h2 className="text-2xl font-bold text-slate-900">What Are You Paying For?</h2>
                        <p className="text-slate-500 mt-2 text-sm">Here is a clear breakdown of where and why you might need to make a payment on Foodies Pakistan.</p>
                    </div>
                    <div className="divide-y divide-slate-100">
                        <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 hover:bg-slate-50 transition-colors">
                            <div className="md:w-1/3 shrink-0">
                                <h3 className="font-bold text-lg text-slate-900">1. Reserving Your Table</h3>
                            </div>
                            <div className="md:w-2/3 text-slate-600 space-y-3">
                                <p>Some highly popular restaurants require a small reserving fee or deposit to hold a table for you. This makes sure that the table is guaranteed to be yours when you arrive. When you pay this fee using your card, it is instantly processed through Payfast, and the restaurant is notified right away to keep your table ready.</p>
                            </div>
                        </div>

                        <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 hover:bg-slate-50 transition-colors">
                            <div className="md:w-1/3 shrink-0">
                                <h3 className="font-bold text-lg text-slate-900">2. Foodies Prime Membership</h3>
                            </div>
                            <div className="md:w-2/3 text-slate-600 space-y-3">
                                <p>Foodies Prime is our special club where members get huge discounts, like up to 30% off on their meals, and exclusive bank deals. When you subscribe to Foodies Prime, you pay a small membership fee.</p>
                                <p>To make your life easy, this is an automatic monthly payment. Payfast safely keeps a secure code (not your actual card number) so that your membership can be renewed automatically every month without you having to enter your details again.</p>
                            </div>
                        </div>

                        <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 hover:bg-slate-50 transition-colors">
                            <div className="md:w-1/3 shrink-0">
                                <h3 className="font-bold text-lg text-slate-900">3. Restaurant Owners Subscriptions</h3>
                            </div>
                            <div className="md:w-2/3 text-slate-600 space-y-3">
                                <p>If you are a restaurant owner using Foodies Pakistan to grow your business, you pay a monthly or yearly subscription fee. This fee allows you to show your restaurant on our website, use our smart pricing tools, and display 360-degree virtual tours. Just like Prime memberships, this is also billed automatically and securely through your company's debit or credit card.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cryptographic Standards */}
                <div className="bg-slate-900 rounded-2xl border border-slate-700 p-8 md:p-10 text-white flex flex-col md:flex-row items-center gap-10 shadow-2xl">
                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center shrink-0 border border-slate-600">
                        <Lock className="w-10 h-10 text-green-400" />
                    </div>
                    <div className="space-y-6 w-full">
                        <h2 className="text-2xl font-bold">Why Your Money and Data Are Safe With Us</h2>
                        <p className="text-slate-300">We take your safety very seriously. We use the same safety rules that large banks use.</p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50">
                                <div className="font-bold text-green-400 mb-2">We Do Not Save Your Card Number</div>
                                <p className="text-sm text-slate-400">Your full credit card or debit card number is never saved on Foodies Pakistan computers. We only see basic details like whether the payment was successful.</p>
                            </div>
                            <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50">
                                <div className="font-bold text-green-400 mb-2">Secure Connection</div>
                                <p className="text-sm text-slate-400">Whenever you use our website, your connection is locked with a strong digital padlock (HTTPS). This means hackers cannot see or steal your information while it is traveling over the internet.</p>
                            </div>
                            <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50">
                                <div className="font-bold text-green-400 mb-2">OTP Verification</div>
                                <p className="text-sm text-slate-400">To stop someone else from using your card, the bank will ask for an OTP (One Time Password) sent to your phone or email before the payment is finished.</p>
                            </div>
                            <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50">
                                <div className="font-bold text-green-400 mb-2">Approved by the Rules</div>
                                <p className="text-sm text-slate-400">Our partner, Payfast, works under the strict rules given by the State Bank of Pakistan. This ensures everything is done legally and correctly.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Support CTA */}
                <div className="text-center py-12">
                    <p className="text-slate-500 mb-3 text-lg">Do you have a problem with a payment or need a refund?</p>
                    <p className="text-slate-600 max-w-2xl mx-auto mb-6">If you think you were charged by mistake, or if your booking failed but money was cut from your account, don't worry! Just send us an email. Our support team will help you quickly and make sure you get your money back if there was an error.</p>
                    <a href="mailto:logicalmoez@gmail.com" className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-xl font-bold text-base hover:bg-slate-800 transition shadow-lg">
                        Contact Financial Support <ArrowRight className="w-5 h-5" />
                    </a>
                </div>
            </div>
        </div>
    );
}
