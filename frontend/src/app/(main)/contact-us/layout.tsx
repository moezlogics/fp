import { Metadata } from "next";
import { buildPageMetadata } from "@/lib/public-site-settings";

export async function generateMetadata(): Promise<Metadata> {
    return buildPageMetadata({
        title: "Contact Us",
        description:
            "Get in touch with the Foodies Pakistan team. We're here to help with reservations, restaurant partnerships, payment queries, and any questions.",
        canonicalPath: "/contact-us",
    });
}

export default function ContactLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
