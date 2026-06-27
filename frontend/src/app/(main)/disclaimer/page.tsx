import { Metadata } from "next";
import { buildPageMetadata } from "@/lib/public-site-settings";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://foodiespakistan.pk";

export async function generateMetadata(): Promise<Metadata> {
    return buildPageMetadata({
        title: "Disclaimer",
        description:
            "Read the disclaimer for Foodies Pakistan. This page outlines the limitations of liability and usage terms for information provided on this platform.",
        canonicalPath: "/disclaimer",
    });
}

export default function DisclaimerPage() {
    const jsonLd = [
        {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Disclaimer — Foodies Pakistan",
            "description": "Legal disclaimer for Foodies Pakistan platform.",
            "url": `${SITE_URL}/disclaimer`,
        },
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL },
                { "@type": "ListItem", "position": 2, "name": "Disclaimer", "item": `${SITE_URL}/disclaimer` },
            ],
        },
    ];

    return (
        <div className="bg-gray-50 min-h-screen pb-16">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

            <div className="max-w-3xl mx-auto px-4 py-12">
                <h1 className="text-3xl font-bold tracking-tight mb-2">Disclaimer</h1>
                <p className="text-sm text-gray-500 mb-8">Last updated: March 01, 2026</p>

                <div className="bg-white rounded-2xl border p-8 prose prose-sm md:prose-base prose-gray max-w-none space-y-8 text-left">
                    <section>
                        <h2 className="text-xl font-bold border-b pb-2">1. General Information</h2>
                        <p>Welcome to the Disclaimer page for Foodies Pakistan. The information and services you find on our website and app are meant to help you discover great food, book tables, and save money. While our team works very hard to make sure all the information is correct and helpful, we cannot promise that every single detail is perfect all the time.</p>
                        <p>We provide this platform "as is." This means that we share the information we get from restaurants, users, and partners in good faith, but we do not take responsibility if something turns out to be slightly different when you visit the restaurant.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold border-b pb-2">2. Restaurant Menus, Prices, and Timings</h2>
                        <p>All the details about the restaurants—like what is on their menu, how much the food costs, their opening and closing times, and the pictures of their food—are given to us by the restaurant owners themselves.</p>
                        <p>Restaurants sometimes change their prices, update their menus, or change their timings without telling us immediately. Because of this, Foodies Pakistan cannot be held responsible if you go to a restaurant and find that the price of a dish has gone up, or if the restaurant is closed. We always suggest that you call the restaurant to double-check important details, especially on public holidays or special events.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold border-b pb-2">3. Reviews and Ratings by Users</h2>
                        <p>When you read a review or see a star rating on Foodies Pakistan, please remember that this is the personal opinion of another person who ate there. It is not the opinion of Foodies Pakistan.</p>
                        <p>Everyone has different tastes. Someone might love a spicy dish, while someone else might think it is too hot. While we try to stop fake reviews and bad language, we cannot check if every single review is 100% truthful. If you rely on these reviews to make a choice, you are doing so at your own risk.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold border-b pb-2">4. Deals, Discounts, and Bank Offers</h2>
                        <p>We love helping you save money! We show many discounts, like bank card deals, time-based discounts, and Foodies Prime offers. However, these discounts are offered by the partner banks and the restaurants, not directly by us.</p>
                        <p>Sometimes, a bank might stop a discount offer early, or a restaurant might say they cannot accept the discount on a specific day (like Eid or Valentine's Day). Foodies Pakistan is just a platform to show you these deals. If a restaurant or a bank refuses to give you the discount, Foodies Pakistan cannot pay you back for the lost savings. The final decision always belongs to the restaurant manager or the bank.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold border-b pb-2">5. Health, Allergies, and Diet Rules</h2>
                        <p>If you have a food allergy (like a peanut allergy), or if you follow a strict diet (like only eating Halal, gluten-free, or vegan food), you must be very careful. We show this information on our platform only because the restaurant told us so.</p>
                        <p>Foodies Pakistan does not visit the kitchen to check if the food is truly gluten-free or nut-free. It is your own responsibility to clearly tell the restaurant waiter or manager about your allergies or diet rules before you order. Foodies Pakistan will not be held responsible if you fall sick, get an allergic reaction, or eat something you did not want to eat.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold border-b pb-2">6. Links to Other Websites</h2>
                        <p>Sometimes, you might click on a link on Foodies Pakistan that takes you to another website. For example, clicking on a link to pay via Payfast or visiting a restaurant's own Facebook page. We do not control those other websites. If you have a bad experience on those external websites, or if they have different privacy rules, Foodies Pakistan is not responsible for them.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold border-b pb-2">7. Our Limits on Responsibility</h2>
                        <p>To the maximum extent allowed by the laws of Pakistan, Foodies Pakistan, its owners, and its employees will not be held liable for any loss, damage, or trouble caused by using our website. This includes losing money, missing a reservation, or any bad experience you might have while dining out at a restaurant you found on our app.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold border-b pb-2">8. Changes to This Page</h2>
                        <p>We might update or change this Disclaimer from time to time. When we make a change, we will update the date at the top of this page. If you continue to use Foodies Pakistan after we make changes, it means you agree to the new rules.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold border-b pb-2">9. Need to Contact Us?</h2>
                        <p>If anything on this page is confusing or if you have any questions, we are happy to help! You can reach our team by sending an email to: <a href="mailto:logicalmoez@gmail.com" className="text-primary hover:underline font-medium">logicalmoez@gmail.com</a>.</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
