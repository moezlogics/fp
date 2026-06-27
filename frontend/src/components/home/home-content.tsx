"use client";

import DOMPurify from "isomorphic-dompurify";

/**
 * Renders admin-managed HTML content on the homepage.
 * Content is set via rich text editor in admin settings.
 * Sanitized with DOMPurify to prevent Stored XSS attacks.
 */
export function HomeContent({ html }: { html: string }) {
    if (!html) return null;

    return (
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 md:p-6">
            <div
                className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 prose-a:text-primary prose-img:rounded-lg"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
            />
        </section>
    );
}
