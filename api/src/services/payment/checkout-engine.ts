import { YieldRule } from "../../models/YieldRule";
import { Subscription } from "../../models/Subscription";
import { BankOffer } from "../../models/BankOffer";
import { Deal } from "../../models/Deal";
import { WalletLedger } from "../../models/WalletLedger";
import { Restaurant } from "../../models/Restaurant";
import mongoose from "mongoose";

/**
 * CheckoutEngine — The financial heart of Foodies Pakistan.
 *
 * Computes the exact discount breakdown for a dining bill using
 * the Multiplicative Waterfall with a Maximum Discount Cap (MDC).
 *
 * Waterfall Priority:
 *   1. Yield Discount (restaurant's time-slot offer)
 *   2. Prime Discount (platform subscription benefit)
 *   3. Bank Discount (card BIN partner offer)
 *   4. Foodie Coins (loyalty burn, max 25% of remaining)
 *
 * All amounts in PAISA (integer). Rs. 5,000 = 500,000 paisa.
 *
 * Platform Fee: Fixed 3% of original bill for ALL restaurants.
 * Prime Partner restaurants: Platform fee = Rs. 0.
 */

export interface CheckoutRequest {
    userId: string;
    restaurantId: string;
    originalBillPaisa: number;
    yieldDiscountPercent?: number;  // From the booked time slot
    yieldRuleId?: string;          // Alternative: look up yield by rule ID
    cardBin?: string;              // First 6 digits of payment card
    applyCoins?: boolean;          // Whether to burn coins
}

export interface CheckoutBreakdown {
    originalBillPaisa: number;

    // Minimum Bill Check
    meetsMinimumBill: boolean;
    minimumBillPaisa: number;

    // Step 1: Restaurant Yield
    yieldDiscountPercent: number;
    yieldDiscountPaisa: number;
    subtotalAfterYieldPaisa: number;

    // Step 2: Platform Subscription (Prime)
    isPrimeUser: boolean;
    subscriptionDiscountPercent: number;
    subscriptionDiscountPaisa: number;
    subtotalAfterSubscriptionPaisa: number;

    // Step 3: Bank Offer
    bankName: string;
    bankDiscountPercent: number;
    bankDiscountPaisa: number;
    bankOfferId?: string;
    subtotalAfterBankPaisa: number;

    // Step 4: Foodie Coins
    maxEligibleCoins: number;
    coinsRedeemed: number;
    coinDiscountPaisa: number;

    // MDC Cap
    maxDiscountCap: number;        // e.g., 50 (%)
    totalDiscountPercent: number;  // actual discount % applied
    wasCapped: boolean;            // true if MDC trimmed discounts

    // Final
    totalDiscountPaisa: number;
    amountToPayPaisa: number;
    coinsToEarn: number;

    // Platform Financials
    platformFeeRate: number;       // 3%
    platformFeePaisa: number;
    isPrimePartner: boolean;       // if true, fee = 0
    effectivePlatformFeePaisa: number; // actual fee (0 for Prime partners)

    // Legacy alias for yield discount (backwards compatibility)
    tableDealDiscountPaisa: number;
}

export class CheckoutEngine {
    /**
     * Calculate the full discount waterfall with MDC cap.
     */
    static async calculateBill(req: CheckoutRequest): Promise<CheckoutBreakdown> {
        // ── Fetch restaurant settings ──
        const restaurant = await Restaurant.findById(req.restaurantId).lean();
        if (!restaurant) throw new Error("Restaurant not found");
        const now = new Date();
        const todayName = now.toLocaleDateString("en-US", { weekday: "long" });

        const bookingSettings = (restaurant as any).bookingSettings || {};
        const minimumBillPaisa = bookingSettings.minimumBillForDiscountPaisa || 150000;
        let maxDiscountCap = bookingSettings.maxDiscountCap || 50;
        const isPrimePartner = bookingSettings.isPrimePartner || false;
        const platformFeeRate = (restaurant as any).platformFeeRate || 3.0;

        const allowDiscountStacking = (restaurant as any).allowDiscountStacking || false;
        if (allowDiscountStacking && (restaurant as any).maxStackedDiscountPercentage) {
            maxDiscountCap = Math.min(maxDiscountCap, (restaurant as any).maxStackedDiscountPercentage);
        }

        // ── Minimum Bill Check ──
        const meetsMinimumBill = req.originalBillPaisa >= minimumBillPaisa;

        let currentSubtotalPaisa = req.originalBillPaisa;
        const maxDiscountPaisa = Math.floor(req.originalBillPaisa * (maxDiscountCap / 100));

        let runningDiscountPaisa = 0;

        // ---------------------------------------------------------
        // Step 1: Yield Discount (Restaurant's own offer)
        // ---------------------------------------------------------
        let yieldDiscountPercent = req.yieldDiscountPercent || 0;
        let yieldDiscountPaisa = 0;

        if (meetsMinimumBill && yieldDiscountPercent > 0) {
            yieldDiscountPaisa = Math.floor(req.originalBillPaisa * (yieldDiscountPercent / 100));
        }

        // ---------------------------------------------------------
        // Step 2: Prime Subscription Discount
        // ---------------------------------------------------------
        let subscriptionDiscountPercent = 0;
        let subscriptionDiscountPaisa = 0;
        let isPrimeUser = false;

        if (meetsMinimumBill && isPrimePartner) {
            const activeSub = await Subscription.findOne({
                userId: req.userId,
                status: "Active",
                validTo: { $gt: new Date() },
            }).populate("planId");

            if (activeSub && activeSub.planId) {
                isPrimeUser = true;
                const plan = activeSub.planId as any;
                const benefit = plan.benefits?.find((b: any) => b.type === "ExtraDiscount");
                if (benefit) {
                    subscriptionDiscountPercent = benefit.value;
                    subscriptionDiscountPaisa = Math.floor(
                        req.originalBillPaisa * (subscriptionDiscountPercent / 100)
                    );
                }
            }
        }

        // ---------------------------------------------------------
        // Step 3: Bank Offer (BIN lookup)
        // ---------------------------------------------------------
        let bankDiscountPercent = 0;
        let bankDiscountPaisa = 0;
        let bankName = "";
        let bankOfferId: string | undefined = undefined;

        if (meetsMinimumBill && req.cardBin && req.cardBin.length >= 6) {
            const offer = await BankOffer.findOne({
                isActive: true,
                validFrom: { $lte: now },
                validTo: { $gte: now },
                minOrderPaisa: { $lte: req.originalBillPaisa },
                binRanges: { $in: [req.cardBin.substring(0, 6)] },
            }).populate("bankId").lean() as any;

            const bankId = offer?.bankId
                ? (((offer.bankId as any)._id || offer.bankId) as any).toString()
                : null;

            if (offer && bankId) {
                const restaurantDeal = await Deal.findOne({
                    restaurantId: req.restaurantId,
                    bankId,
                    isActive: true,
                    applicableOn: { $in: ["online", "both"] },
                    minSpendPaisa: { $lte: req.originalBillPaisa },
                    $and: [
                        {
                            $or: [
                                { validFrom: { $exists: false } },
                                { validFrom: null },
                                { validFrom: { $lte: now } },
                            ],
                        },
                        {
                            $or: [
                                { validTo: { $exists: false } },
                                { validTo: null },
                                { validTo: { $gte: now } },
                            ],
                        },
                        {
                            $or: [
                                { daysValid: { $size: 0 } },
                                { daysValid: todayName },
                            ],
                        },
                    ],
                }).lean() as any;

                if (restaurantDeal) {
                    bankDiscountPercent = restaurantDeal.discountPercent;
                    bankDiscountPaisa = Math.floor(
                        req.originalBillPaisa * (bankDiscountPercent / 100)
                    );

                    if (
                        restaurantDeal.maxDiscountCapPaisa > 0 &&
                        bankDiscountPaisa > restaurantDeal.maxDiscountCapPaisa
                    ) {
                        bankDiscountPaisa = restaurantDeal.maxDiscountCapPaisa;
                    }

                    bankName = (offer.bankId as any)?.name || offer.name;
                    bankOfferId = offer._id.toString();
                }
            }
        }

        // ---------------------------------------------------------
        // Stacking or Exclusive Selection
        // ---------------------------------------------------------
        if (!allowDiscountStacking) {
            // Exclusive mode: apply the single largest discount among Yield, Prime,
            // Bank. Ties are broken by the documented waterfall priority
            // Yield > Prime > Bank (the if/else-if order below). On a tie no bank
            // discount is applied, so dropping bankOfferId here is correct — there
            // is no bank-funded redemption to attribute.
            const maxPaisa = Math.max(yieldDiscountPaisa, subscriptionDiscountPaisa, bankDiscountPaisa);

            if (maxPaisa === yieldDiscountPaisa && yieldDiscountPaisa > 0) {
                subscriptionDiscountPercent = 0; subscriptionDiscountPaisa = 0;
                bankDiscountPercent = 0; bankDiscountPaisa = 0; bankName = ""; bankOfferId = undefined;
            } else if (maxPaisa === subscriptionDiscountPaisa && subscriptionDiscountPaisa > 0) {
                yieldDiscountPercent = 0; yieldDiscountPaisa = 0;
                bankDiscountPercent = 0; bankDiscountPaisa = 0; bankName = ""; bankOfferId = undefined;
            } else if (maxPaisa === bankDiscountPaisa && bankDiscountPaisa > 0) {
                yieldDiscountPercent = 0; yieldDiscountPaisa = 0;
                subscriptionDiscountPercent = 0; subscriptionDiscountPaisa = 0;
            }
        }

        // Now calculate running discounts with caps
        if (yieldDiscountPaisa > 0) {
            if (runningDiscountPaisa + yieldDiscountPaisa > maxDiscountPaisa) {
                yieldDiscountPaisa = Math.max(0, maxDiscountPaisa - runningDiscountPaisa);
            }
            runningDiscountPaisa += yieldDiscountPaisa;
        }

        const subtotalAfterYieldPaisa = req.originalBillPaisa - runningDiscountPaisa;

        if (subscriptionDiscountPaisa > 0) {
            if (runningDiscountPaisa + subscriptionDiscountPaisa > maxDiscountPaisa) {
                subscriptionDiscountPaisa = Math.max(0, maxDiscountPaisa - runningDiscountPaisa);
            }
            runningDiscountPaisa += subscriptionDiscountPaisa;
        }

        const subtotalAfterSubscriptionPaisa = req.originalBillPaisa - runningDiscountPaisa;

        if (bankDiscountPaisa > 0) {
            if (runningDiscountPaisa + bankDiscountPaisa > maxDiscountPaisa) {
                bankDiscountPaisa = Math.max(0, maxDiscountPaisa - runningDiscountPaisa);
            }
            runningDiscountPaisa += bankDiscountPaisa;
        }

        currentSubtotalPaisa = req.originalBillPaisa - runningDiscountPaisa;
        const subtotalAfterBankPaisa = currentSubtotalPaisa;

        // ---------------------------------------------------------
        // Step 4: Foodie Coins Redemption (Burn) - Always allowed to stack
        // ---------------------------------------------------------
        let coinsRedeemed = 0;
        let coinDiscountPaisa = 0;

        // Max allowable burn is the SMALLER of: 25% of the current subtotal, and
        // whatever discount headroom is left under the MDC cap. Reporting the raw
        // 25% (ignoring the cap) made the UI advertise coins the user could never
        // actually spend, so the preview never matched the charged amount.
        const remainingCapPaisa = Math.max(0, maxDiscountPaisa - runningDiscountPaisa);
        const maxEligibleCoins = Math.min(
            Math.floor(subtotalAfterBankPaisa * 0.25),
            remainingCapPaisa,
        );

        if (meetsMinimumBill && req.applyCoins) {
            // Spendable balance excludes EXPIRED credits (coins expire after 12
            // months — expiresAt is set at credit time). There is no expiry CRON
            // writing offsetting Debits, so without this filter expired coins stay
            // fully spendable = direct money leakage. Debits with source "Expiry"
            // are excluded too, so this stays correct even if such a CRON is added.
            const balanceAgg = await WalletLedger.aggregate([
                { $match: { userId: new mongoose.Types.ObjectId(req.userId) } },
                {
                    $group: {
                        _id: null,
                        totalCredits: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ["$direction", "Credit"] },
                                            {
                                                $or: [
                                                    { $eq: [{ $ifNull: ["$expiresAt", null] }, null] },
                                                    { $gt: ["$expiresAt", now] },
                                                ],
                                            },
                                        ],
                                    },
                                    "$amount",
                                    0,
                                ],
                            },
                        },
                        totalDebits: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ["$direction", "Debit"] },
                                            { $ne: ["$source", "Expiry"] },
                                        ],
                                    },
                                    "$amount",
                                    0,
                                ],
                            },
                        },
                    },
                },
            ]);

            const currentBalance =
                balanceAgg.length > 0
                    ? balanceAgg[0].totalCredits - balanceAgg[0].totalDebits
                    : 0;

            if (currentBalance > 0) {
                let coinBurn = Math.min(currentBalance, maxEligibleCoins);

                // MDC cap check
                if (runningDiscountPaisa + coinBurn > maxDiscountPaisa) {
                    coinBurn = Math.max(0, maxDiscountPaisa - runningDiscountPaisa);
                }

                coinsRedeemed = coinBurn;
                coinDiscountPaisa = coinsRedeemed; // 1 Coin = 1 Paisa
                runningDiscountPaisa += coinDiscountPaisa;
                currentSubtotalPaisa = req.originalBillPaisa - runningDiscountPaisa;
            }
        }

        // ---------------------------------------------------------
        // Final Calculations
        // ---------------------------------------------------------
        const totalDiscountPaisa = runningDiscountPaisa;
        const totalDiscountPercent = req.originalBillPaisa > 0
            ? Math.round((totalDiscountPaisa / req.originalBillPaisa) * 100 * 100) / 100
            : 0;
        const wasCapped = totalDiscountPaisa >= maxDiscountPaisa && maxDiscountCap < 100;
        const amountToPayPaisa = Math.max(0, req.originalBillPaisa - totalDiscountPaisa);

        // Coins to earn: 1% of final paid amount (2x for Prime users)
        const coinsMultiplier = isPrimeUser ? 2 : 1;
        const coinsToEarn = Math.floor(amountToPayPaisa * 0.01) * coinsMultiplier;

        // Platform Fee: 3% of original bill
        // Waived for branch Prime restaurants regardless of customer membership.
        const platformFeePaisa = Math.floor(req.originalBillPaisa * (platformFeeRate / 100));
        const effectivePlatformFeePaisa = isPrimePartner ? 0 : platformFeePaisa;

        return {
            originalBillPaisa: req.originalBillPaisa,
            meetsMinimumBill,
            minimumBillPaisa,

            yieldDiscountPercent,
            yieldDiscountPaisa,
            subtotalAfterYieldPaisa,

            isPrimeUser,
            subscriptionDiscountPercent,
            subscriptionDiscountPaisa,
            subtotalAfterSubscriptionPaisa,

            bankName,
            bankDiscountPercent,
            bankDiscountPaisa,
            bankOfferId,
            subtotalAfterBankPaisa,

            maxEligibleCoins,
            coinsRedeemed,
            coinDiscountPaisa,

            maxDiscountCap,
            totalDiscountPercent,
            wasCapped,

            totalDiscountPaisa,
            amountToPayPaisa,
            coinsToEarn,

            platformFeeRate,
            platformFeePaisa,
            isPrimePartner,
            effectivePlatformFeePaisa,

            tableDealDiscountPaisa: yieldDiscountPaisa,
        };
    }
}
