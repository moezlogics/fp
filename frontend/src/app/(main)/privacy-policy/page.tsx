import { Metadata } from "next";
import { buildPageMetadata } from "@/lib/public-site-settings";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://foodiespakistan.pk";

export async function generateMetadata(): Promise<Metadata> {
    return buildPageMetadata({
        title: "Privacy Policy",
        description:
            "Learn how Foodies Pakistan collects, uses, and protects your personal data. Our privacy policy covers account data, bookings, payments, and your rights.",
        canonicalPath: "/privacy-policy",
    });
}

export default function PrivacyPage() {
    const jsonLd = [
        {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Privacy Policy — Foodies Pakistan",
            "description": "Privacy policy for Foodies Pakistan platform.",
            "url": `${SITE_URL}/privacy`,
        },
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL },
                { "@type": "ListItem", "position": 2, "name": "Privacy Policy", "item": `${SITE_URL}/privacy` },
            ],
        },
    ];

    return (
        <div className="bg-gray-50 min-h-screen pb-16">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

            <div className="max-w-3xl mx-auto px-4 py-12">
                <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
                <p className="text-sm text-gray-500 mb-8">Last updated: April 6, 2026</p>

                <div className="bg-white rounded-2xl border p-8 prose prose-sm md:prose-base prose-gray max-w-none space-y-8 text-left">
                    <section>
                        <h2 className="text-xl font-bold border-b pb-2">1. Welcome to Our Privacy Policy</h2>
                        <p>Hello! Welcome to the Privacy Policy for Foodies Pakistan. We know that your personal information is very important to you. Because you trust us to help you find the best restaurants and deals, we promise to treat your personal data with the highest respect and care. This page explains exactly what information we collect from you, why we need it, how we keep it safe, and who we might share it with.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold border-b pb-2">2. What Information Do We Collect About You?</h2>
                        <p>When you use Foodies Pakistan, we only collect the information we absolutely need to make the app work for you. Here is what we gather:</p>
                        <ul className="list-disc pl-5 space-y-2 mt-2">
                            <li><strong>Information You Give Us:</strong> When you create an account or book a table, you give us your name, phone number, email address, and a profile picture (if you upload one).</li>
                            <li><strong>Booking History:</strong> We keep a record of which restaurants you visit, the dates of your visits, and how many people you booked for. This helps us suggest better restaurants to you in the future!</li>
                            <li><strong>Your Device Information:</strong> We collect some basic technical details, like whether you are using a mobile phone or a computer, which internet browser you are using, and your general location (like your city). We do not track your exact GPS location.</li>
                        </ul>
                    </section>
                    
                    <section>
                        <h2 className="text-xl font-bold border-b pb-2">3. Why Do We Need Your Information?</h2>
                        <p>We do not collect your information just for fun. We use it to provide you with a great service. Specifically, we use your details to:</p>
                        <ul className="list-disc pl-5 space-y-2 mt-2">
                            <li>Send your booking details to the restaurant so they can keep a table ready for you.</li>
                            <li>Contact you if there is a problem with your booking or if the restaurant is unexpectedly closed.</li>
                            <li>Give you Foodies Coins when you complete a successful booking.</li>
                            <li>Send you special discount codes and exciting news about new restaurants (but you can always tell us to stop sending these emails).</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold border-b pb-2">4. How Do We Handle Your Payment Information?</h2>
                        <p>When you pay for a Foodies Prime membership or a restaurant booking, you might wonder if we save your credit card number. <strong>We do not save your credit card number!</strong></p>
                        <p>All payments on Foodies Pakistan are processed by our secure partner, <strong>Payfast</strong>. When you type in your card details, they go straight to Payfast through a safe, locked connection. We never see your full card number, and we never save it on our computers. This means your money is extremely safe.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold border-b pb-2">5. Who Else Sees Your Information?</h2>
                        <p>We promise that we will <strong>never sell your personal information</strong> to other companies so they can send you spam or annoying ads. We only share your data in these very specific situations:</p>
                        <ul className="list-disc pl-5 space-y-2 mt-2">
                            <li><strong>With Restaurants:</strong> When you book a table, we have to give the restaurant your name and phone number so they know who is coming and can call you if you are late.</li>
                            <li><strong>With Service Providers:</strong> We use safe companies to help us send SMS messages (like your OTP code) or process payments (like Payfast). They only get the information they need to do their job.</li>
                            <li><strong>With the Government:</strong> If the police or a court of law in Pakistan orders us to share your information for a legal reason, we must obey the law.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold border-b pb-2">6. How We Protect Your Data from Hackers</h2>
                        <p>We take security very seriously. All the data that travels between your phone and our servers is locked with a strong code (this is called SSL encryption). Our servers are guarded by strong firewalls, and only a few trusted employees at Foodies Pakistan are allowed to look at our databases.</p>
                        <p>However, no system on the internet is 100% perfect. While we try our best, we cannot absolutely guarantee that a super-smart hacker will never break in. That is why it is important for you to choose a strong password for your account.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold border-b pb-2">7. Using Cookies (Not the Edible Kind!)</h2>
                        <p>Like almost every other website, Foodies Pakistan uses "cookies." These are tiny text files saved on your computer or phone. They help our website remember you. For example, cookies are the reason you do not have to log in every single time you open the website.</p>
                        <p>You can turn off cookies in your browser settings if you want to, but please know that if you do, some parts of Foodies Pakistan might stop working properly.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold border-b pb-2">8. Your Rights: You Are in Control</h2>
                        <p>It is your data, and you are in control! You have the right to:</p>
                        <ul className="list-disc pl-5 space-y-2 mt-2">
                            <li><strong>See your data:</strong> You can log into your account anytime to see what information we have about you.</li>
                            <li><strong>Change your data:</strong> If your phone number or name changes, you can easily update it in your profile.</li>
                            <li><strong>Delete your data:</strong> If you ever want to stop using Foodies Pakistan, you can send us an email, and we will permanently delete your account and all your personal information from our system.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold border-b pb-2">9. Updates to This Privacy Policy</h2>
                        <p>Sometimes we might need to change this Privacy Policy. For example, if we add a new feature to the app, we might need to explain how it affects your data. When we make a big change, we will update the date at the top of this page. If you keep using Foodies Pakistan, it means you accept the new policy.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold border-b pb-2">10. Contact Us About Your Privacy</h2>
                        <p>If you have any questions, worries, or complaints about how we handle your personal information, please do not hesitate to contact us. We are here to help! You can email our privacy team directly at: <a href="mailto:logicalmoez@gmail.com" className="text-primary hover:underline font-medium">logicalmoez@gmail.com</a>.</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
