import mongoose, { Schema, Document } from "mongoose";

/**
 * MenuItem — Digital menu items for a restaurant.
 * Used by the QR Table Ordering system.
 *
 * Each restaurant manages their own menu items.
 * Items support categories, images, availability toggles,
 * and dietary/allergen tags for a premium UX.
 */

export const MENU_CATEGORIES = [
    "Appetizers",
    "Soups",
    "Salads",
    "Main Course",
    "BBQ & Grill",
    "Karahi & Handi",
    "Rice & Biryani",
    "Chinese",
    "Continental",
    "Pizza & Pasta",
    "Burgers & Sandwiches",
    "Seafood",
    "Desserts",
    "Beverages",
    "Mocktails",
    "Sides",
    "Kids Menu",
    "Deals & Combos",
] as const;

export const DIETARY_TAGS = [
    "Vegetarian",
    "Vegan",
    "Gluten-Free",
    "Spicy",
    "Nut-Free",
    "Dairy-Free",
    "Sugar-Free",
] as const;

export interface IMenuItem extends Document {
    restaurantId: mongoose.Types.ObjectId;
    name: string;
    description: string;
    pricePaisa: number; // Integer paisa, e.g., 85000 = Rs. 850
    category: string;
    image?: string;
    dietaryTags: string[];
    isAvailable: boolean;
    isPopular: boolean; // "Chef's Pick" badge
    sortOrder: number; // For custom ordering within category
}

const MenuItemSchema = new Schema<IMenuItem>(
    {
        restaurantId: {
            type: Schema.Types.ObjectId,
            ref: "Restaurant",
            required: true,
        },
        name: { type: String, required: true },
        description: { type: String, default: "" },
        pricePaisa: { type: Number, required: true, min: 0 },
        category: {
            type: String,
            required: true,
            enum: MENU_CATEGORIES,
            default: "Main Course",
        },
        image: { type: String },
        dietaryTags: [{ type: String, enum: DIETARY_TAGS }],
        isAvailable: { type: Boolean, default: true },
        isPopular: { type: Boolean, default: false },
        sortOrder: { type: Number, default: 0 },
    },
    { timestamps: true }
);

MenuItemSchema.index({ restaurantId: 1, category: 1, isAvailable: 1 });
MenuItemSchema.index({ restaurantId: 1, sortOrder: 1 });

export const MenuItem =
    mongoose.models.MenuItem || mongoose.model<IMenuItem>("MenuItem", MenuItemSchema);
