export interface RestaurantFaqItem {
    question: string;
    answer: string;
}

const PRICE_LABELS = ["Budget", "Mid-Range", "Premium", "Luxury"];

function humanList(items: string[] = [], max = 3) {
    const cleaned = items.filter(Boolean).slice(0, max);
    if (cleaned.length === 0) return "";
    if (cleaned.length === 1) return cleaned[0];
    if (cleaned.length === 2) return `${cleaned[0]} and ${cleaned[1]}`;
    return `${cleaned.slice(0, -1).join(", ")}, and ${cleaned[cleaned.length - 1]}`;
}

function format12Hour(time?: string) {
    if (!time || !time.includes(":")) return "";
    const [hourString, minuteString] = time.split(":");
    let hour = parseInt(hourString, 10);
    const suffix = hour >= 12 ? "PM" : "AM";
    if (hour === 0) hour = 12;
    else if (hour > 12) hour -= 12;
    return `${hour}:${minuteString} ${suffix}`;
}

function getTodayOpening(restaurant: any) {
    const currentDay = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        timeZone: "Asia/Karachi",
    }).format(new Date());

    const todayHours = (restaurant.openingHours || []).find(
        (entry: any) => String(entry?.day || "").toLowerCase() === currentDay.toLowerCase()
    );

    return {
        currentDay,
        todayHours,
    };
}

function formatFacility(facility: string) {
    return facility.replace(/_/g, " ");
}

export function buildRestaurantFaqs({
    restaurant,
    deals = [],
    otherBranches = [],
}: {
    restaurant: any;
    deals?: any[];
    otherBranches?: any[];
}): RestaurantFaqItem[] {
    if (!restaurant) return [];

    const displayName = restaurant.brandName || restaurant.name || "This restaurant";
    const areaCity = [restaurant.area, restaurant.city].filter(Boolean).join(", ");
    const cuisineText = humanList(restaurant.cuisines || []);
    const priceLabel = PRICE_LABELS[Math.max(0, (restaurant.priceRange || 2) - 1)] || "Mid-Range";
    const ratingText =
        restaurant.averageRating > 0 && restaurant.totalReviews > 0
            ? `${restaurant.averageRating.toFixed(1)}/5 from ${restaurant.totalReviews} diner reviews`
            : "";
    const bestYield = Number(restaurant.yieldDiscountPercent || 0);
    const bestBank = Number(restaurant.bankDiscountPercent || 0);
    const primeDiscount = Number(restaurant.primeDiscountPercent || 0);
    const activeBanks = Array.from(
        new Set(
            deals
                .map((deal: any) => deal?.bankName || deal?.bankId?.name)
                .filter(Boolean)
        )
    );
    const { currentDay, todayHours } = getTodayOpening(restaurant);
    const highlightedFacilities = (restaurant.facilities || [])
        .filter((item: string) => ["parking", "valet", "wifi", "outdoor", "rooftop", "private_dining"].includes(item))
        .slice(0, 3)
        .map(formatFacility);

    const faqs: RestaurantFaqItem[] = [];

    // 1. Food & Price Range (The "Identity" FAQ)
    const cuisinesList = (restaurant.cuisines || []).slice(0, 3);
    const cuisineContext = cuisinesList.length > 0 
        ? `specializing in ${humanList(cuisinesList)}` 
        : "offering a diverse range of flavors";

    faqs.push({
        question: `What kind of food does ${displayName} serve and what is the price range?`,
        answer: `${displayName} is a ${priceLabel.toLowerCase()} restaurant ${cuisineContext}. Located in ${areaCity}, it is perfect for those seeking ${cuisinesList[0] || "quality"} dishes. ${ratingText ? `Current diners have rated it ${ratingText}, reflecting its consistent quality.` : ""}`,
    });

    // 2. Discounts & Deals
    const discountParts = [
        bestYield > 0 ? `up to ${bestYield}% off via Yield` : "",
        primeDiscount > 0 ? `a flat ${primeDiscount}% for Prime members` : "",
        bestBank > 0 ? `bank-specific deals reaching ${bestBank}%` : "",
    ].filter(Boolean);

    if (discountParts.length > 0) {
        faqs.push({
            question: `How can I get the best discount at ${displayName}?`,
            answer: `You can save significantly at ${displayName} using ${humanList(discountParts)}. ${activeBanks.length > 0 ? `Currently, ${humanList(activeBanks)} cardholders can enjoy exclusive benefits.` : ""} Check the 'Deals' section on this page for specific terms and valid timings.`,
        });
    }

    // 3. Digital Menu
    const hasDigitalMenu = (restaurant.menuItems?.length > 0);
    const hasMenuImages = (restaurant.menuImages?.length > 0);
    
    if (hasDigitalMenu) {
        faqs.push({
            question: `Can I see the ${displayName} menu with prices online?`,
            answer: `Yes, a full digital menu for ${displayName} is available right here on Foodies Pakistan. It features their latest ${cuisineText.toLowerCase()} items with up-to-date pricing and descriptions, so you can plan your meal before you arrive.`,
        });
    } else if (hasMenuImages) {
        faqs.push({
            question: `Is the ${displayName} menu available to view?`,
            answer: `While the itemized digital menu is being updated, you can view the official menu photos for ${displayName} in the 'Menu' gallery on this page. It covers all their main offerings and seasonal specials.`,
        });
    }

    // 4. Reservations
    if (restaurant.bookingSettings?.isBookingEnabled) {
        faqs.push({
            question: `Do I need to reserve a table at ${displayName}?`,
            answer: `While walk-ins are welcome, we highly recommend booking a table at ${displayName} to avoid waiting, especially during weekends. You can use our instant booking widget on this page to secure your spot in seconds.`,
        });
    } else {
        faqs.push({
            question: `How do I contact ${displayName} for a reservation?`,
            answer: `${displayName} currently accepts walk-ins. For large groups or special events, you can find their direct contact number and exact address in the 'Info' tab to coordinate your visit.`,
        });
    }

    // 5. Timings
    if (todayHours && !todayHours.isClosed && todayHours.open && todayHours.close) {
        faqs.push({
            question: `What are the opening hours for ${displayName} today?`,
            answer: `Today (${currentDay}), ${displayName} is open from ${format12Hour(todayHours.open)} to ${format12Hour(todayHours.close)}. For the full weekly schedule, please refer to the timings section in the 'Info' tab.`,
        });
    }

    // 6. Signature Facilities
    if (highlightedFacilities.length > 0) {
        faqs.push({
            question: `What facilities does ${displayName} offer to diners?`,
            answer: `To ensure a comfortable experience, ${displayName} provides amenities such as ${humanList(highlightedFacilities)}. It's an ideal spot in ${restaurant.area} for both casual dining and special occasions.`,
        });
    }

    return faqs.slice(0, 6);
}
