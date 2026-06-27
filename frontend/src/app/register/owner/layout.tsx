import { Metadata } from "next";
import { buildPageMetadata } from "@/lib/public-site-settings";

export async function generateMetadata(): Promise<Metadata> {
    return buildPageMetadata({ title: "Owner Registration", index: false, follow: false });
}

export default function RegisterOwnerLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

