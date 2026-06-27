import { Metadata } from "next";
import { NearbyPageContent } from "@/components/archive/nearby-page-content";

export const metadata: Metadata = {
    title: "Restaurants Near Me | Foodies Pakistan",
    description:
        "Discover the best restaurants, cafes, and bakeries closest to your current location in Pakistan. Real-time distances and instant bookings.",
    robots: { index: false, follow: false },
};

export default function NearMePage() {
    return <NearbyPageContent />;
}
