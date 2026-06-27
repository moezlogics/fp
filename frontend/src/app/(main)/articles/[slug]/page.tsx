import { Metadata } from "next";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { notFound } from "next/navigation";
import DOMPurify from "isomorphic-dompurify";
import { Calendar, User, Tag, ChevronLeft } from "lucide-react";
import { getPublicSiteSettings } from "@/lib/public-site-settings";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://foodiespakistan.pk";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const res = await apiClient(`/articles/${slug}`, { requireAuth: false });
    const a = (res.data as any)?.article;
    const settings = await getPublicSiteSettings(300);
    const siteName = settings.siteName || "Foodies Pakistan";

    if (!a) return { title: "Article Not Found" };

    const publishedAt = a.publishedAt || a.createdAt;
    const modifiedAt = a.updatedAt || publishedAt;

    return {
        title: `${a.title} — ${siteName}`,
        description: a.excerpt || a.title,
        authors: [{ name: a.author || `${siteName} Editorial` }],
        openGraph: {
            title: a.title,
            description: a.excerpt || a.title,
            type: "article",
            publishedTime: publishedAt,
            modifiedTime: modifiedAt,
            authors: [a.author || `${siteName} Editorial`],
            tags: a.tags || [],
            images: a.coverImage ? [a.coverImage] : [],
        },
        twitter: {
            card: "summary_large_image",
            title: a.title,
            description: a.excerpt || a.title,
            images: a.coverImage ? [a.coverImage] : [],
        },
        alternates: {
            canonical: `${SITE_URL}/articles/${slug}/`,
        },
    };
}

export default async function ArticlePage({ params }: Props) {
    const { slug } = await params;
    const res = await apiClient(`/articles/${slug}`, { requireAuth: false });
    const data = (res.data as any);
    const settings = await getPublicSiteSettings(300);

    if (!data || !data.article) notFound();

    const a = data.article;
    const linkedRestaurants = data.linkedRestaurants || [];

    const articleUrl = `${SITE_URL}/articles/${slug}`;
    const siteName = settings.siteName || "Foodies Pakistan";
    const logoUrl = settings.logoUrl || `${SITE_URL}/icon-512.png`;

    const publishedDateIso = a.publishedAt || a.createdAt;
    const modifiedDateIso = a.updatedAt || a.publishedAt || a.createdAt;

    // JSON-LD: BlogPosting + BreadcrumbList
    const jsonLd = [
        {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "mainEntityOfPage": { "@type": "WebPage", "@id": articleUrl },
            "headline": a.title,
            "description": a.excerpt || a.title,
            "image": a.coverImage ? [a.coverImage] : [],
            "datePublished": publishedDateIso,
            "dateModified": modifiedDateIso,
            "author": {
                "@type": "Person",
                "name": a.author || `${siteName} Editorial`,
                "url": SITE_URL,
            },
            "publisher": {
                "@type": "Organization",
                "name": siteName,
                "logo": { "@type": "ImageObject", "url": logoUrl },
            },
        },
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL },
                { "@type": "ListItem", "position": 2, "name": "Articles", "item": `${SITE_URL}/articles` },
                { "@type": "ListItem", "position": 3, "name": a.title, "item": articleUrl },
            ],
        },
    ];

    return (
        <main className="bg-white min-h-screen">
            {/* JSON-LD */}
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

            <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">

                {/* Back Link */}
                <Link href="/articles" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-primary transition-colors mb-8 group">
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to all articles
                </Link>

                <header className="space-y-6 md:space-y-8 mb-10 md:mb-16">
                    {/* Tags */}
                    {a.tags && a.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {a.tags.map((tag: string) => (
                                <span key={tag} className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-widest">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Title */}
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-gray-900 leading-[1.1]">
                        {a.title}
                    </h1>

                    {/* Excerpt */}
                    {a.excerpt && (
                        <p className="text-lg md:text-xl text-gray-500 font-medium leading-relaxed max-w-3xl">
                            {a.excerpt}
                        </p>
                    )}

                    {/* Meta Data */}
                    <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-gray-100 text-sm font-semibold text-gray-500">
                        <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-900">{a.author || "Editorial Team"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <time dateTime={publishedDateIso}>
                                {publishedDateIso ? new Date(publishedDateIso).toLocaleDateString("en-PK", { month: "long", day: "numeric", year: "numeric" }) : "Recently"}
                            </time>
                        </div>
                    </div>
                </header>

                {/* Hero Cover Image */}
                {a.coverImage && (
                    <div className="relative aspect-video w-full rounded-2xl md:rounded-3xl overflow-hidden mb-12 md:mb-16 shadow-xl shadow-gray-200/50">
                        <img
                            src={a.coverImage}
                            alt={a.title}
                            className="w-full h-full object-cover"
                            fetchPriority="high"
                        />
                    </div>
                )}

                {/* Main Content */}
                <div className="prose prose-lg md:prose-xl prose-gray max-w-3xl mx-auto prose-img:rounded-2xl prose-img:shadow-md prose-headings:font-black prose-headings:tracking-tight prose-a:text-primary hover:prose-a:text-primary/80 prose-a:transition-colors prose-p:leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(a.content || "") }}
                />

                {/* Linked Restaurants Block */}
                {linkedRestaurants.length > 0 && (
                    <section className="mt-16 pt-12 border-t max-w-3xl mx-auto">
                        <div className="flex items-center gap-2 mb-8">
                            <Tag className="w-5 h-5 text-primary" />
                            <h2 className="text-2xl font-black tracking-tight text-gray-900">Featured in this article</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {linkedRestaurants.map((r: any) => (
                                <Link
                                    key={r._id}
                                    href={`/${(r.city || "pk").toLowerCase()}/${r.slug}/`}
                                    className="flex items-center gap-4 bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 rounded-2xl p-4 hover:shadow-lg transition-all group outline-none"
                                >
                                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                                        {r.coverImage ? (
                                            <img src={r.coverImage} alt={r.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xs">No img</div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-bold text-gray-900 group-hover:text-primary transition-colors truncate">{r.name}</h3>
                                        <p className="text-xs font-medium text-gray-500 truncate">{r.area}, {r.city}</p>
                                        <div className="flex items-center gap-1 mt-1">
                                            <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-primary" style={{ width: `${(r.averageRating / 5) * 100}%` }} />
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-600">{r.averageRating > 0 ? r.averageRating.toFixed(1) : "New"}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </article>
        </main>
    );
}
