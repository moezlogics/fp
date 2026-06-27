import { Metadata } from "next";
import { buildPageMetadata } from "@/lib/public-site-settings";

export async function generateMetadata(): Promise<Metadata> {
    return buildPageMetadata({ title: "Login", index: false, follow: false });
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

