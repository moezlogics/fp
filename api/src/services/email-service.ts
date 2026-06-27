import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const FROM_NAME = "Foodies Pakistan";
const FROM_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@foodiespakistan.pk";
const BRAND_COLOR = "#f97316";
const BRAND_GREEN = "#2D6A4F";
const BRAND_GOLD = "#D4AF37";

/**
 * Shared email wrapper with Foodies Pakistan branding.
 * Premium "Royal Feast" design system.
 */
function emailWrapper(headerBg: string, headerTitle: string, headerSubtitle: string, bodyContent: string): string {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Foodies Pakistan</title>
</head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;padding:40px 20px;">
        <tr><td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.08);">
                <!-- Header -->
                <tr><td style="background:${headerBg};padding:36px 32px;text-align:center;">
                    <h1 style="margin:0;color:#fff;font-size:32px;font-weight:900;font-style:italic;letter-spacing:-1px;">Foodies Pakistan</h1>
                    <p style="margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:13px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">${headerSubtitle}</p>
                </td></tr>
                <!-- Body -->
                <tr><td style="padding:36px 32px;">
                    <h2 style="margin:0 0 12px;color:#1a1a2e;font-size:22px;font-weight:800;">${headerTitle}</h2>
                    ${bodyContent}
                </td></tr>
                <!-- Footer -->
                <tr><td style="background:#f8f9fa;padding:20px 32px;text-align:center;border-top:1px solid #eee;">
                    <p style="margin:0;color:#adb5bd;font-size:11px;font-weight:600;letter-spacing:0.3px;">Foodies Pakistan &mdash; Discover, Reserve, Dine.</p>
                    <p style="margin:4px 0 0;color:#ced4da;font-size:10px;">Pakistan's #1 Restaurant Discovery Platform</p>
                </td></tr>
            </table>
        </td></tr>
    </table>
</body>
</html>`;
}

function otpBlock(code: string, borderColor: string, bgColor: string): string {
    return `<div style="background:${bgColor};border:2px dashed ${borderColor};border-radius:16px;padding:24px;text-align:center;margin:20px 0;">
        <span style="font-size:40px;font-weight:900;letter-spacing:10px;color:#1a1a2e;">${code}</span>
    </div>`;
}

export async function sendOTPEmail(to: string, code: string): Promise<void> {
    const html = emailWrapper(
        `linear-gradient(135deg, ${BRAND_COLOR}, #ea580c)`,
        "Your Login Code",
        "Email Verification",
        `<p style="color:#6b7280;font-size:14px;line-height:1.7;margin:0 0 4px;">Use this code to verify your email address. It expires in <strong style="color:#1a1a2e;">5 minutes</strong>.</p>
        ${otpBlock(code, BRAND_COLOR, "#FFF5F5")}
        <p style="color:#adb5bd;font-size:12px;line-height:1.6;margin:0;">If you did not request this code, please ignore this email. Someone may have entered your email by mistake.</p>`
    );

    await transporter.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to,
        subject: `${code} — Foodies Pakistan Verification Code`,
        html,
    });
}

/**
 * Sends a branded OTP specifically for cancelling Prime Subscription.
 */
export async function sendPrimeCancelOTP(to: string, code: string): Promise<void> {
    const html = emailWrapper(
        `linear-gradient(135deg, #ef4444, #b91c1c)`,
        "Cancel Subscription",
        "Verification Required",
        `<p style="color:#6b7280;font-size:14px;line-height:1.7;margin:0 0 4px;">You requested to cancel your <strong>Foodies Prime</strong> subscription. Use this code to confirm your cancellation. It expires in <strong style="color:#1a1a2e;">5 minutes</strong>.</p>
        ${otpBlock(code, "#ef4444", "#fef2f2")}
        <p style="color:#adb5bd;font-size:12px;line-height:1.6;margin:0;">If you did not request this cancellation, please ignore this email. Your subscription will remain active.</p>`
    );

    await transporter.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to,
        subject: `${code} — Cancel Foodies Prime`,
        html,
    });
}

/**
 * Sends a booking confirmation email.
 */
export async function sendBookingConfirmation(
    to: string,
    details: { restaurantName: string; date: string; time: string; pax: number; code: string }
): Promise<void> {
    const html = emailWrapper(
        `linear-gradient(135deg, ${BRAND_GREEN}, #1B4332)`,
        details.restaurantName,
        "Reservation Confirmed ✓",
        `<table width="100%" cellpadding="10" cellspacing="0" style="background:#f8faf9;border-radius:12px;font-size:14px;color:#374151;margin:16px 0;">
            <tr><td style="font-weight:700;width:35%;border-bottom:1px solid #e8ede9;">Date</td><td style="border-bottom:1px solid #e8ede9;">${details.date}</td></tr>
            <tr><td style="font-weight:700;border-bottom:1px solid #e8ede9;">Time</td><td style="border-bottom:1px solid #e8ede9;">${details.time}</td></tr>
            <tr><td style="font-weight:700;border-bottom:1px solid #e8ede9;">Guests</td><td style="border-bottom:1px solid #e8ede9;">${details.pax} People</td></tr>
            <tr><td style="font-weight:700;">Booking ID</td><td style="font-weight:800;color:${BRAND_COLOR};">#${details.code}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">Show this email or your Booking ID at the restaurant. Have a wonderful dining experience!</p>`
    );

    await transporter.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to,
        subject: `Booking Confirmed at ${details.restaurantName} — #${details.code} | Foodies Pakistan`,
        html,
    });
}

/**
 * Sends a welcome email after successful registration.
 */
export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
    const html = emailWrapper(
        `linear-gradient(135deg, ${BRAND_COLOR}, ${BRAND_GOLD})`,
        `Welcome, ${name}! 🎉`,
        "You're In!",
        `<p style="color:#6b7280;font-size:14px;line-height:1.7;margin:0 0 20px;">Welcome to Foodies Pakistan — your gateway to the best dining experiences across the country.</p>
        <table width="100%" cellpadding="0" cellspacing="6" style="font-size:13px;color:#374151;">
            <tr><td style="background:#f0fdf4;border-radius:10px;padding:14px 16px;">🍽️ <strong>Book tables</strong> at 500+ partner restaurants</td></tr>
            <tr><td style="background:#f0fdf4;border-radius:10px;padding:14px 16px;">💰 <strong>Get exclusive discounts</strong> with bank deals</td></tr>
            <tr><td style="background:#fefce8;border-radius:10px;padding:14px 16px;">⭐ <strong>Earn Foodie Coins</strong> with every booking &amp; review</td></tr>
        </table>`
    );

    await transporter.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to,
        subject: `Welcome to Foodies Pakistan, ${name}! 🎉`,
        html,
    });
}

/**
 * Sends a password reset OTP email.
 */
export async function sendPasswordResetEmail(to: string, code: string): Promise<void> {
    const html = emailWrapper(
        "linear-gradient(135deg, #1a1a2e, #374151)",
        "Reset Your Password",
        "Security Alert",
        `<p style="color:#6b7280;font-size:14px;line-height:1.7;margin:0 0 4px;">Use this code to reset your password. It expires in <strong style="color:#1a1a2e;">5 minutes</strong>.</p>
        ${otpBlock(code, "#374151", "#f3f4f6")}
        <p style="color:#adb5bd;font-size:12px;line-height:1.6;margin:0;">If you did not request a password reset, please ignore this email and your password will remain unchanged.</p>`
    );

    await transporter.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to,
        subject: `${code} — Foodies Pakistan Password Reset`,
        html,
    });
}

/**
 * Sends a booking reminder email (24 hours before).
 */
export async function sendBookingReminder(
    to: string,
    details: { restaurantName: string; date: string; time: string; pax: number; code: string }
): Promise<void> {
    const html = emailWrapper(
        `linear-gradient(135deg, #3b82f6, #1d4ed8)`,
        `📅 ${details.restaurantName}`,
        "Reminder: Tomorrow's Dinner!",
        `<table width="100%" cellpadding="10" cellspacing="0" style="background:#eff6ff;border-radius:12px;font-size:14px;color:#374151;margin:16px 0;">
            <tr><td style="font-weight:700;width:35%;border-bottom:1px solid #dbeafe;">Date</td><td style="border-bottom:1px solid #dbeafe;">${details.date}</td></tr>
            <tr><td style="font-weight:700;border-bottom:1px solid #dbeafe;">Time</td><td style="border-bottom:1px solid #dbeafe;">${details.time}</td></tr>
            <tr><td style="font-weight:700;border-bottom:1px solid #dbeafe;">Guests</td><td style="border-bottom:1px solid #dbeafe;">${details.pax} People</td></tr>
            <tr><td style="font-weight:700;">Booking ID</td><td style="font-weight:800;color:#3b82f6;">#${details.code}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">Don't forget your reservation tomorrow! If plans change, please cancel at least 2 hours in advance.</p>`
    );

    await transporter.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to,
        subject: `Reminder: Your booking at ${details.restaurantName} is tomorrow! | Foodies Pakistan`,
        html,
    });
}

/**
 * Sends an email notification to restaurant owner when a new review or reply is posted.
 */
export async function sendNewReviewEmail(
    to: string,
    restaurantName: string,
    restaurantUrl: string,
    rating: number,
    reviewText: string
): Promise<void> {
    const isReply = rating === 0; // rating 0 means it's a reply notification
    const stars = rating > 0 ? "⭐".repeat(Math.round(rating)) : "";

    const html = emailWrapper(
        `linear-gradient(135deg, ${BRAND_COLOR}, #ea580c)`,
        isReply ? "New Reply on Your Restaurant" : "New Review on Your Restaurant",
        restaurantName,
        `<p style="color:#6b7280;font-size:14px;line-height:1.7;margin:0 0 12px;">
            ${isReply
            ? "Someone replied to a review on your restaurant."
            : `A customer left a <strong style="color:#1a1a2e;">${rating.toFixed(1)} star</strong> review on your restaurant. ${stars}`
        }
        </p>
        <div style="background:#fef3c7;border-left:4px solid ${BRAND_COLOR};border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0;font-size:14px;color:#374151;line-height:1.6;font-style:italic;">
            "${reviewText.length > 200 ? reviewText.substring(0, 200) + "..." : reviewText}"
        </div>
        <a href="${restaurantUrl}" style="display:inline-block;background:${BRAND_COLOR};color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px;margin-top:8px;">
            View on Foodies Pakistan →
        </a>
        <p style="color:#adb5bd;font-size:12px;line-height:1.6;margin:16px 0 0;">You're receiving this because you're the owner of ${restaurantName} on Foodies Pakistan.</p>`
    );

    await transporter.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to,
        subject: isReply
            ? `New Reply on ${restaurantName} | Foodies Pakistan`
            : `⭐ New ${rating.toFixed(1)}-Star Review on ${restaurantName} | Foodies Pakistan`,
        html,
    });
}

/**
 * Sends a bill notification to the user when the owner submits a FoodiePay bill.
 */
export async function sendBillNotification(
    to: string,
    details: {
        restaurantName: string;
        originalBillRs: string;
        discountRs: string;
        finalAmountRs: string;
        payLink: string;
        expiresIn: string;
    }
): Promise<void> {
    const html = emailWrapper(
        `linear-gradient(135deg, ${BRAND_COLOR}, #ea580c)`,
        `Your Bill from ${details.restaurantName}`,
        "FoodiePay — Pay Online & Save",
        `<p style="color:#6b7280;font-size:14px;line-height:1.7;margin:0 0 16px;">Your dining bill is ready! Pay online via FoodiePay and enjoy your discounts.</p>
        <table width="100%" cellpadding="10" cellspacing="0" style="background:#fef3c7;border-radius:12px;font-size:14px;color:#374151;margin:16px 0;">
            <tr><td style="font-weight:700;border-bottom:1px solid #fde68a;">Original Bill</td><td style="text-align:right;border-bottom:1px solid #fde68a;">Rs. ${details.originalBillRs}</td></tr>
            <tr><td style="font-weight:700;color:#059669;border-bottom:1px solid #fde68a;">Discount</td><td style="text-align:right;color:#059669;font-weight:800;border-bottom:1px solid #fde68a;">-Rs. ${details.discountRs}</td></tr>
            <tr><td style="font-weight:900;font-size:16px;">You Pay</td><td style="text-align:right;font-weight:900;font-size:16px;color:${BRAND_COLOR};">Rs. ${details.finalAmountRs}</td></tr>
        </table>
        <a href="${details.payLink}" style="display:inline-block;background:${BRAND_COLOR};color:#fff;padding:16px 32px;border-radius:14px;text-decoration:none;font-weight:800;font-size:15px;margin-top:8px;width:100%;text-align:center;box-sizing:border-box;">
            Pay Now →
        </a>
        <p style="color:#adb5bd;font-size:12px;line-height:1.6;margin:16px 0 0;">⏳ Payment expires in ${details.expiresIn}. After that, discounts may no longer apply.</p>`
    );

    await transporter.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to,
        subject: `Your Bill from ${details.restaurantName} — Rs. ${details.finalAmountRs} | Foodies Pakistan`,
        html,
    });
}

/**
 * Sends a settlement notification to restaurant owner.
 */
export async function sendSettlementReady(
    to: string,
    details: {
        restaurantName: string;
        periodStart: string;
        periodEnd: string;
        totalBookings: number;
        grossRevenueRs: string;
        commissionRs: string;
        netPayableRs: string;
    }
): Promise<void> {
    const html = emailWrapper(
        `linear-gradient(135deg, ${BRAND_GREEN}, #1B4332)`,
        `Settlement Ready`,
        `${details.restaurantName} — Weekly Payout`,
        `<p style="color:#6b7280;font-size:14px;line-height:1.7;margin:0 0 16px;">Your weekly settlement for <strong>${details.periodStart}</strong> to <strong>${details.periodEnd}</strong> has been generated.</p>
        <table width="100%" cellpadding="10" cellspacing="0" style="background:#f0fdf4;border-radius:12px;font-size:14px;color:#374151;margin:16px 0;">
            <tr><td style="font-weight:700;border-bottom:1px solid #d1fae5;">Total Bookings</td><td style="text-align:right;border-bottom:1px solid #d1fae5;">${details.totalBookings}</td></tr>
            <tr><td style="font-weight:700;border-bottom:1px solid #d1fae5;">Gross Revenue</td><td style="text-align:right;border-bottom:1px solid #d1fae5;">Rs. ${details.grossRevenueRs}</td></tr>
            <tr><td style="font-weight:700;color:#dc2626;border-bottom:1px solid #d1fae5;">Platform Fee (3%)</td><td style="text-align:right;color:#dc2626;border-bottom:1px solid #d1fae5;">-Rs. ${details.commissionRs}</td></tr>
            <tr><td style="font-weight:900;font-size:16px;">Net Payable</td><td style="text-align:right;font-weight:900;font-size:16px;color:${BRAND_GREEN};">Rs. ${details.netPayableRs}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">The payout will be processed to your registered bank account within 2-3 business days.</p>`
    );

    await transporter.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to,
        subject: `💰 Settlement Ready — Rs. ${details.netPayableRs} | ${details.restaurantName} | Foodies Pakistan`,
        html,
    });
}

/**
 * Sends a withdrawal processed notification to restaurant owner.
 */
export async function sendWithdrawalProcessed(
    to: string,
    details: {
        restaurantName: string;
        amountRs: string;
        bankName: string;
        maskedAccount: string;
        transferRef: string;
    }
): Promise<void> {
    const html = emailWrapper(
        `linear-gradient(135deg, ${BRAND_GREEN}, #1B4332)`,
        `Withdrawal Processed ✓`,
        `${details.restaurantName}`,
        `<p style="color:#6b7280;font-size:14px;line-height:1.7;margin:0 0 16px;">Your withdrawal has been successfully processed and transferred to your bank account.</p>
        <table width="100%" cellpadding="10" cellspacing="0" style="background:#f0fdf4;border-radius:12px;font-size:14px;color:#374151;margin:16px 0;">
            <tr><td style="font-weight:700;border-bottom:1px solid #d1fae5;">Amount</td><td style="text-align:right;font-weight:900;font-size:16px;color:${BRAND_GREEN};border-bottom:1px solid #d1fae5;">Rs. ${details.amountRs}</td></tr>
            <tr><td style="font-weight:700;border-bottom:1px solid #d1fae5;">Bank</td><td style="text-align:right;border-bottom:1px solid #d1fae5;">${details.bankName}</td></tr>
            <tr><td style="font-weight:700;border-bottom:1px solid #d1fae5;">Account</td><td style="text-align:right;border-bottom:1px solid #d1fae5;">${details.maskedAccount}</td></tr>
            <tr><td style="font-weight:700;">Transfer Ref</td><td style="text-align:right;font-family:monospace;font-weight:800;">${details.transferRef}</td></tr>
        </table>
        <p style="color:#adb5bd;font-size:12px;line-height:1.6;margin:0;">Funds typically reflect in your bank account within 1-2 business days after processing.</p>`
    );

    await transporter.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to,
        subject: `✅ Rs. ${details.amountRs} Withdrawal Processed | ${details.restaurantName} | Foodies Pakistan`,
        html,
    });
}

/**
 * Sends a security alert to an admin.
 */
export async function sendAdminAlertEmail(to: string, alertMessage: string): Promise<void> {
    const html = emailWrapper(
        `linear-gradient(135deg, #ef4444, #991b1b)`,
        `Security Alert`,
        `Administrative Notice`,
        `<p style="color:#6b7280;font-size:14px;line-height:1.7;margin:0 0 16px;"><strong>ALERT:</strong> ${alertMessage}</p>
        <p style="color:#adb5bd;font-size:12px;line-height:1.6;margin:0;">Please review the system logs immediately to investigate this incident.</p>`
    );

    await transporter.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to,
        subject: `[SECURITY ALERT] Foodies Pakistan`,
        html,
    });
}
