import { Metadata } from "next";
import { buildPageMetadata } from "@/lib/public-site-settings";

export async function generateMetadata(): Promise<Metadata> {
    return buildPageMetadata({ title: "FoodiePay Checkout", index: false, follow: false });
}

export default function FoodiePayLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

