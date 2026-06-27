import { Metadata } from "next";
import { buildPageMetadata } from "@/lib/public-site-settings";

export async function generateMetadata(): Promise<Metadata> {
    return buildPageMetadata({ title: "Foodie Coins Wallet", index: false, follow: false });
}

export default function WalletLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

