import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { Metadata } from "next";
import { buildPageMetadata } from "@/lib/public-site-settings";
import { Calendar, ArrowRight } from "lucide-react";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://foodiespakistan.pk";



export async function generateMetadata(): Promise<Metadata> {
    return buildPageMetadata({
        title: "Food Trends & Guides — Blog",
        description: "Curated food guides, restaurant reviews, and trending articles about Pakistan's vibrant food scene. Discover the best places to eat.",
        canonicalPath: "/articles",
    });
}

export default async function ArticlesPage() {
    let publishedArticles: any[] = [];

    try {
        const res = await apiClient("/articles?isPublished=true", { requireAuth: false });
        const payload = res.data;
        const articles = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
        publishedArticles = articles.filter((a: any) => a.isPublished !== false);
    } catch (err) {
        console.error("[ArticlesPage] Failed to fetch articles:", err);
    }

    // JSON-LD: CollectionPage + BreadcrumbList
    const jsonLd = [
        {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": "Food Trends & Guides — Foodies Pakistan",
            "description": "Curated food guides, restaurant reviews, and trending articles about Pakistan's vibrant food scene.",
            "url": `${SITE_URL}/articles`,
            "mainEntity": {
                "@type": "ItemList",
                "numberOfItems": publishedArticles.length,
                "itemListElement": publishedArticles.slice(0, 10).map((a: any, i: number) => ({
                    "@type": "ListItem",
                    "position": i + 1,
                    "url": `${SITE_URL}/articles/${a.slug}`,
                    "name": a.title,
                })),
            },
        },
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL },
                { "@type": "ListItem", "position": 2, "name": "Articles", "item": `${SITE_URL}/articles` },
            ],
        },
    ];

    return (
        <div className="bg-gray-50 min-h-screen">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

            {/* Hero Header */}
            <div className="bg-white border-b">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 md:py-16 text-center">
                    <p className="text-xs font-black text-primary uppercase tracking-[0.25em] mb-3">Our Blog</p>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tight text-gray-900">
                        Food Trends &amp; Guides
                    </h1>
                    <p className="text-sm md:text-base text-gray-500 mt-3 max-w-lg mx-auto leading-relaxed">
                        Curated stories, reviews, and insights into Pakistan&apos;s vibrant food and restaurant scene.
                    </p>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12">
                {publishedArticles.length === 0 ? (
                    <div className="bg-white rounded-2xl border p-16 text-center space-y-3 max-w-xl mx-auto shadow-sm">
                        <p className="text-4xl opacity-50 block mb-4">📰</p>
                        <p className="text-lg font-bold text-gray-900">Articles Coming Soon</p>
                        <p className="text-sm text-gray-500">Our food writers are crafting delicious stories. Check back soon!</p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {/* Featured / First Article — Large Card */}
                        {publishedArticles.length > 0 && (() => {
                            const featured = publishedArticles[0];
                            return (
                                <Link href={`/articles/${featured.slug}`} className="group block bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                    <div className="grid grid-cols-1 md:grid-cols-2">
                                        <div className="relative aspect-[16/10] md:aspect-auto overflow-hidden bg-gray-100">
                                            {featured.coverImage && (
                                                <img
                                                    src={featured.coverImage}
                                                    alt={featured.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            )}
                                        </div>
                                        <div className="p-6 md:p-8 flex flex-col justify-center">
                                            <div className="flex items-center gap-2 flex-wrap mb-3">
                                                {featured.tags?.slice(0, 3).map((tag: string) => (
                                                    <span key={tag} className="text-[10px] font-black text-primary tracking-wider uppercase bg-primary/5 px-2 py-0.5 rounded-full">{tag}</span>
                                                ))}
                                            </div>
                                            <h2 className="text-xl md:text-2xl font-bold text-gray-900 group-hover:text-primary transition-colors leading-snug line-clamp-3">
                                                {featured.title}
                                            </h2>
                                            {featured.excerpt && (
                                                <p className="text-sm text-gray-500 mt-2 line-clamp-2 leading-relaxed">{featured.excerpt}</p>
                                            )}
                                            <div className="flex items-center gap-3 mt-4 text-xs text-gray-400">
                                                {featured.author && <span className="font-bold text-gray-600">{featured.author}</span>}
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {featured.publishedAt
                                                        ? new Date(featured.publishedAt).toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" })
                                                        : "Recently"}
                                                </span>
                                            </div>
                                            <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-primary group-hover:gap-2.5 transition-all">
                                                Read Article <ArrowRight className="w-3.5 h-3.5" />
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })()}

                        {/* Remaining Articles — Grid */}
                        {publishedArticles.length > 1 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                {publishedArticles.slice(1).map((article: any) => (
                                    <Link key={article._id} href={`/articles/${article.slug}`}
                                        className="group bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                                        <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                                            {article.coverImage && (
                                                <img
                                                    src={article.coverImage}
                                                    alt={article.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            )}
                                        </div>
                                        <div className="p-4 flex-1 flex flex-col">
                                            <div className="flex items-center gap-2 flex-wrap mb-2">
                                                {article.tags?.slice(0, 2).map((tag: string) => (
                                                    <span key={tag} className="text-[10px] font-black text-primary tracking-wider uppercase">{tag}</span>
                                                ))}
                                            </div>
                                            <h2 className="text-base font-bold text-gray-900 group-hover:text-primary transition-colors leading-snug line-clamp-2 flex-1">
                                                {article.title}
                                            </h2>
                                            {article.excerpt && (
                                                <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">{article.excerpt}</p>
                                            )}
                                            <div className="flex items-center gap-2 mt-3 pt-3 border-t text-[11px] text-gray-400">
                                                {article.author && <span className="font-semibold text-gray-600">{article.author}</span>}
                                                {article.author && <span>&middot;</span>}
                                                <span>
                                                    {article.publishedAt
                                                        ? new Date(article.publishedAt).toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" })
                                                        : "Recently"}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
