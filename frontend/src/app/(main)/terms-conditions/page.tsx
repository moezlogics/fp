import { Metadata } from "next";
import { buildPageMetadata } from "@/lib/public-site-settings";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://foodiespakistan.pk";

export async function generateMetadata(): Promise<Metadata> {
    return buildPageMetadata({
        title: "Terms & Conditions",
        description:
            "Read the terms and conditions governing your use of Foodies Pakistan and its booking, payment, and membership services.",
        canonicalPath: "/terms-conditions",
    });
}

export default function TermsPage() {
    const jsonLd = [
        {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Terms & Conditions — Foodies Pakistan",
            "description": "Terms and conditions for using the Foodies Pakistan platform.",
            "url": `${SITE_URL}/terms`,
        },
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL },
                { "@type": "ListItem", "position": 2, "name": "Terms & Conditions", "item": `${SITE_URL}/terms` },
            ],
        },
    ];

    return (
        <div className="bg-gray-50 min-h-screen pb-16">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

            <div className="max-w-3xl mx-auto px-4 py-12">
                <h1 className="text-3xl font-bold tracking-tight mb-2">Terms &amp; Conditions</h1>
                <p className="text-sm text-gray-500 mb-8">Last updated: April 6, 2026</p>

                <div className="bg-white rounded-2xl border p-8 prose prose-sm md:prose-base prose-gray max-w-none space-y-8 text-left">
                    <section>
                        <h2 className="text-xl font-bold border-b pb-2">1. Welcome to Foodies Pakistan</h2>
                        <p>Hello and welcome to Foodies Pakistan! By using our website, our mobile app, or any of our services to find restaurants, book tables, or get discounts, you agree to follow the rules listed on this page. These rules are called "Terms and Conditions." Please read them carefully. If you do not agree with these rules, please do not use our platform.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold border-b pb-2">2. Creating and Protecting Your Account</h2>
                        <p>To use many of the exciting features on Foodies Pakistan—like booking a table, writing a review, or earning Foodies Coins—you need to create a free account. When you sign up, you must promise to give us real and correct information, like your actual name and phone number.</p>
                        <p>You are the only person responsible for keeping your password safe. If someone else guesses your password and uses your account to make fake bookings or post bad reviews, you will be held responsible. If you ever think someone else has logged into your account, you must email us right away so we can help lock it.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold border-b pb-2">3. What Foodies Pakistan Actually Does</h2>
                        <p>Foodies Pakistan is a technology platform that connects you (the diner) with great restaurants. Here is what we do:</p>
                        <ul className="list-disc pl-5 space-y-2 mt-2">
                            <li><strong>Restaurant Bookings:</strong> We let you book tables easily without having to call the restaurant.</li>
                            <li><strong>Foodies Prime:</strong> A special club you can join by paying a small fee to get very big discounts on your food.</li>
                            <li><strong>Restaurant Services:</strong> We help restaurant owners manage their business online, like changing their menus or adding 360-degree virtual tours.</li>
                            <li><strong>Foodies Coins:</strong> We give you virtual reward points for using our app, which you can use for special perks.</li>
                        </ul>
                    </section>
                    
                    <section>
                        <h2 className="text-xl font-bold border-b pb-2">4. Paying for Things on the App</h2>
                        <p>Sometimes you need to pay for things on Foodies Pakistan, like buying a Foodies Prime membership or paying a deposit for a booking. All payments are securely processed by <strong>Payfast</strong> using your Debit or Credit Card. We do not accept JazzCash or EasyPaisa at this time.</p>
                        <p>All the prices you see are in Pakistani Rupees (PKR). Once you pay for a subscription like Foodies Prime, we cannot give you a refund if you change your mind later. If you think we made a mistake and charged you the wrong amount, please tell us within 7 days so we can fix it.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold border-b pb-2">5. Memberships and Subscriptions</h2>
                        <p><strong>Foodies Prime (For Diners):</strong> When you join Prime, you pay a fee that automatically renews (charges your card again) at the end of the month or year, depending on what you chose. You can cancel your membership anytime you want, but you will still get to use the benefits until the end of your paid month. We do not give money back for half a month.</p>
                        <p><strong>Merchant Subscriptions (For Restaurants):</strong> If you are a restaurant owner paying to be featured on our site, your payment also renews automatically. If your card fails and you do not pay the fee, your restaurant might be hidden from the website until the bill is paid.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold border-b pb-2">6. Earning and Using Foodies Coins</h2>
                        <p>We love rewarding our users! You can earn "Foodies Coins" by booking tables, writing helpful reviews, and inviting your friends to the app. However, please remember that <strong>Foodies Coins are not real money</strong>. You cannot trade them in for real cash in your bank account.</p>
                        <p>Foodies Coins can only be used inside the Foodies Pakistan app. We also have the right to change how many coins you earn or what you can buy with them at any time, without warning you first.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold border-b pb-2">7. Booking Rules: Do Not Skip Your Reservations</h2>
                        <p>When you use Foodies Pakistan to book a table, the restaurant holds that table just for you and might turn other paying customers away. Because of this, we ask that you always show up on time.</p>
                        <p>If you book tables and do not show up (we call this a "no-show"), or if you cancel at the very last minute multiple times, we will punish your account. You could lose all your hard-earned Foodies Coins, or we might ban you from ever booking a table again.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold border-b pb-2">8. Rules for Writing Reviews and Posting Photos</h2>
                        <p>We encourage you to write honest reviews and upload pictures of your food! However, everything you post must be true and based on your own real visit to the restaurant. You are not allowed to post fake reviews, use bad words, or write mean things just to hurt a business.</p>
                        <p>By posting a review or a photo, you give Foodies Pakistan permission to show it on our website forever. If we find out that your review is fake, abusive, or breaks our rules, we will delete it immediately without asking you.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold border-b pb-2">9. Legal Limits on Our Responsibility</h2>
                        <p>We work hard to keep Foodies Pakistan running perfectly, but sometimes computers break or the internet goes down. We provide the website "as is." This means we cannot promise that the website will never crash or that it will be 100% free from bugs.</p>
                        <p>If you lose money, miss a special event, or suffer any kind of trouble because the website stopped working or a restaurant made a mistake, Foodies Pakistan cannot be sued or forced to pay you for the damages.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold border-b pb-2">10. Pakistani Law and Courts</h2>
                        <p>Foodies Pakistan is a proud Pakistani company. Because of this, all these rules are governed by the laws of Pakistan. If there is ever a serious disagreement or legal fight between you and Foodies Pakistan, it must be settled in the courts located in Lahore, Pakistan.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold border-b pb-2">11. How to Contact Us</h2>
                        <p>If you need help understanding these rules, or if you have a complaint you want to share with us, we are always ready to listen. Please email our friendly team at: <a href="mailto:logicalmoez@gmail.com" className="text-primary hover:underline font-medium">logicalmoez@gmail.com</a>.</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
