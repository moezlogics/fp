/**
 * Multi-Discount Compounding Engine
 * 
 * This is the CORE FINANCIAL LOGIC for Foodies Pakistan's FoodiePay system.
 * It calculates the exact bill breakdown when a user has multiple discount sources.
 *
 * Rules of Engagement (Global Standards):
 * 
 * 1) Rule of Exclusivity: If restaurant.allowDiscountStacking === false,
 *    the system applies whichever discount is HIGHER for the user.
 * 
 * 2) Rule of Sequential Compounding: If stacking IS allowed,
 *    discounts are applied SEQUENTIALLY (not additively).
 *    - Step 1: Apply table deal % to original bill → get remaining
 *    - Step 2: Apply subscription % to the REMAINING bill → get final
 *    This protects merchant margins.
 * 
 * 3) The Global Cap: Even with stacking, the total discount cannot exceed
 *    restaurant.maxStackedDiscountPercentage (e.g., 40%).
 * 
 * ALL MATH IS IN PAISA (integers). NO floating-point operations on money.
 */

export interface CompoundingInput {
    originalBillPaisa: number;
    tableDealPercent: number;          // e.g., 30 for 30%
    subscriptionPercent: number;       // e.g., 20 for 20%
    allowDiscountStacking: boolean;
    maxStackedDiscountPercent: number; // e.g., 40 for 40% cap
    platformCommissionRate: number;    // e.g., 2.0 for 2%
}

export interface CompoundingResult {
    originalBillPaisa: number;
    tableDealDiscountPaisa: number;
    subscriptionDiscountPaisa: number;
    totalDiscountPaisa: number;
    amountPaidPaisa: number;
    platformFeePaisa: number;
    netMerchantPaisa: number;
    discountMethod: "exclusive" | "stacked";
    effectiveDiscountPercent: number;  // Rounded to 2 decimals
}

export function calculateBill(input: CompoundingInput): CompoundingResult {
    const {
        originalBillPaisa,
        tableDealPercent,
        subscriptionPercent,
        allowDiscountStacking,
        maxStackedDiscountPercent,
        platformCommissionRate,
    } = input;

    // ── Safety: ensure non-negative values ──
    if (originalBillPaisa <= 0) {
        return zeroResult(originalBillPaisa);
    }

    let tableDealDiscountPaisa = 0;
    let subscriptionDiscountPaisa = 0;
    let discountMethod: "exclusive" | "stacked" = "exclusive";

    if (!allowDiscountStacking) {
        // ── RULE 1: Exclusivity — pick the higher discount ──
        if (tableDealPercent >= subscriptionPercent) {
            tableDealDiscountPaisa = integerPercent(originalBillPaisa, tableDealPercent);
        } else {
            subscriptionDiscountPaisa = integerPercent(originalBillPaisa, subscriptionPercent);
        }
    } else {
        // ── RULE 2: Sequential Compounding ──
        discountMethod = "stacked";

        // Step 1: Apply table deal to original bill
        tableDealDiscountPaisa = integerPercent(originalBillPaisa, tableDealPercent);
        const afterTableDeal = originalBillPaisa - tableDealDiscountPaisa;

        // Step 2: Apply subscription to REMAINING bill
        subscriptionDiscountPaisa = integerPercent(afterTableDeal, subscriptionPercent);

        // ── RULE 3: Enforce Global Cap ──
        const totalUncapped = tableDealDiscountPaisa + subscriptionDiscountPaisa;
        const maxAllowedDiscount = integerPercent(originalBillPaisa, maxStackedDiscountPercent);

        if (totalUncapped > maxAllowedDiscount) {
            // Cap exceeded — proportionally reduce the subscription discount
            const excess = totalUncapped - maxAllowedDiscount;
            subscriptionDiscountPaisa = Math.max(0, subscriptionDiscountPaisa - excess);
        }
    }

    const totalDiscountPaisa = tableDealDiscountPaisa + subscriptionDiscountPaisa;
    const amountPaidPaisa = originalBillPaisa - totalDiscountPaisa;

    // ── Platform Commission (on amount paid, not on discounted amount) ──
    const platformFeePaisa = integerPercent(amountPaidPaisa, platformCommissionRate);
    const netMerchantPaisa = amountPaidPaisa - platformFeePaisa;

    // ── Effective discount percentage for audit logging ──
    const effectiveDiscountPercent =
        originalBillPaisa > 0
            ? Math.round((totalDiscountPaisa / originalBillPaisa) * 10000) / 100
            : 0;

    return {
        originalBillPaisa,
        tableDealDiscountPaisa,
        subscriptionDiscountPaisa,
        totalDiscountPaisa,
        amountPaidPaisa,
        platformFeePaisa,
        netMerchantPaisa,
        discountMethod,
        effectiveDiscountPercent,
    };
}

/**
 * Integer-safe percentage calculation.
 * Avoids floating-point by using integer multiplication then division.
 * Always rounds DOWN (floor) to protect merchant margins.
 * 
 * Example: integerPercent(1000000, 30) → 300000 (30% of 10,000 PKR)
 */
function integerPercent(amountPaisa: number, percent: number): number {
    if (percent <= 0 || amountPaisa <= 0) return 0;
    // Multiply by 100 to preserve 2 decimal places in percent, then divide
    return Math.floor((amountPaisa * Math.round(percent * 100)) / 10000);
}

function zeroResult(originalBillPaisa: number): CompoundingResult {
    return {
        originalBillPaisa,
        tableDealDiscountPaisa: 0,
        subscriptionDiscountPaisa: 0,
        totalDiscountPaisa: 0,
        amountPaidPaisa: Math.max(0, originalBillPaisa),
        platformFeePaisa: 0,
        netMerchantPaisa: Math.max(0, originalBillPaisa),
        discountMethod: "exclusive",
        effectiveDiscountPercent: 0,
    };
}
