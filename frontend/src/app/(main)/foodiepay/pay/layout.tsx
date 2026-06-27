import { Metadata } from "next";
import { buildPageMetadata } from "@/lib/public-site-settings";

export async function generateMetadata(): Promise<Metadata> {
    return buildPageMetadata({ title: "FoodiePay - Pay Your Bill", index: false, follow: false });
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}

