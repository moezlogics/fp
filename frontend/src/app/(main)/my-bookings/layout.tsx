import { Metadata } from "next";
import { buildPageMetadata } from "@/lib/public-site-settings";

export async function generateMetadata(): Promise<Metadata> {
    return buildPageMetadata({ title: "My Bookings", index: false, follow: false });
}

export default function BookingsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

