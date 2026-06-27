/* ── Shared constants for Restaurant facilities and vibes ── */
/* These are extracted so they can be imported from both server models AND client components */

export const FACILITIES = [
    "prayer_area",
    "family_hall",
    "generator",
    "valet_parking",
    "wheelchair_accessible",
    "wifi",
    "outdoor_seating",
    "live_music",
    "rooftop",
    "air_conditioned",
    "private_dining",
    "kids_play_area",
    "smoking_area",
    "delivery_available",
    "takeaway",
] as const;

export const VIBES = [
    "romantic",
    "rooftop",
    "corporate",
    "family",
    "street_food",
    "fine_dining",
    "casual",
    "cafe_vibes",
    "desi_dhaba",
    "buffet",
    "brunch_spot",
] as const;

export const FACILITY_LABELS: Record<string, string> = {
    prayer_area: "🕌 Prayer Area",
    family_hall: "👨‍👩‍👧‍👦 Family Hall",
    generator: "⚡ Generator Backup",
    valet_parking: "🅿️ Valet Parking",
    wheelchair_accessible: "♿ Wheelchair",
    wifi: "📶 Free WiFi",
    outdoor_seating: "🌿 Outdoor Seating",
    live_music: "🎵 Live Music",
    rooftop: "🏙️ Rooftop",
    air_conditioned: "❄️ Air Conditioned",
    private_dining: "🚪 Private Dining",
    kids_play_area: "🧒 Kids Area",
    smoking_area: "🚬 Smoking Area",
    delivery_available: "🛵 Delivery",
    takeaway: "📦 Takeaway",
};

export const VIBE_LABELS: Record<string, string> = {
    romantic: "💕 Romantic",
    rooftop: "🌆 Rooftop",
    corporate: "💼 Corporate",
    family: "👪 Family",
    street_food: "🛒 Street Food",
    fine_dining: "🍷 Fine Dining",
    casual: "😊 Casual",
    cafe_vibes: "☕ Café Vibes",
    desi_dhaba: "🍛 Desi Dhaba",
    buffet: "🍽️ Buffet",
    brunch_spot: "🥂 Brunch",
};

export const SERVICE_TYPES = [
    "dine_in",
    "takeaway",
    "delivery",
] as const;

export const SERVICE_TYPE_LABELS: Record<string, string> = {
    dine_in: "🍽️ Dine-in",
    takeaway: "📦 Takeaway",
    delivery: "🛵 Delivery",
};
