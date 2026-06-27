import { Metadata } from "next";
import { buildPageMetadata } from "@/lib/public-site-settings";

export async function generateMetadata(): Promise<Metadata> {
    return buildPageMetadata({
        title: "Foodies Prime - Exclusive Restaurant Membership",
        description:
            "Join Foodies Prime for exclusive restaurant discounts up to 30% off at top restaurants across Pakistan. Premium dining membership with instant savings.",
        canonicalPath: "/prime",
    });
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
