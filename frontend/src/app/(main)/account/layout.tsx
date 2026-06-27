import { Metadata } from "next";
import { buildPageMetadata } from "@/lib/public-site-settings";

export async function generateMetadata(): Promise<Metadata> {
    return buildPageMetadata({ title: "My Account", index: false, follow: false });
}

export default function AccountLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

