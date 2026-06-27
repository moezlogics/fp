import { Metadata } from "next";
import { buildPageMetadata } from "@/lib/public-site-settings";

export async function generateMetadata(): Promise<Metadata> {
    return buildPageMetadata({ title: "My Reviews", index: false, follow: false });
}

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

