import { Metadata } from "next";
import { buildPageMetadata } from "@/lib/public-site-settings";

export async function generateMetadata(): Promise<Metadata> {
    return buildPageMetadata({ title: "Saved Restaurants", index: false, follow: false });
}

export default function SavedLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

