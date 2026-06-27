import crypto from "crypto";

/**
 * PayFast Pakistan Payment Gateway Integration
 * PCI/DSS Certified — Supports VISA, Mastercard, PayPak, UnionPay
 * 
 * Flow:
 * 1. Get auth token (MERCHANT_ID + SECURED_KEY)
 * 2. Create checkout request → redirect user to PayFast hosted page
 * 3. PayFast processes card, returns callback with transaction result
 * 4. For saved cards: first charge returns permanent instrument_token
 * 5. Future charges use tokenized transaction (no redirect needed)
 */

interface PayFastConfig {
    merchantId: string;
    securedKey: string;
    returnUrl: string;
    environment: "sandbox" | "production";
}

interface PaymentInitiateParams {
    amountPaisa: number;
    orderId: string;
    description: string;
    customerEmail?: string;
    customerPhone?: string;
    tokenizeCard?: boolean;  // If true, request permanent token for saved card
}

interface TokenizedChargeParams {
    instrumentToken: string;
    amountPaisa: number;
    orderId: string;
    description: string;
    customerEmail?: string;
    customerPhone?: string;
}

function getConfig(): PayFastConfig {
    return {
        merchantId: process.env.PAYFAST_MERCHANT_ID || "",
        securedKey: process.env.PAYFAST_SECURED_KEY || "",
        returnUrl: process.env.PAYFAST_RETURN_URL || "",
        environment: (process.env.PAYFAST_ENVIRONMENT as "sandbox" | "production") || "sandbox",
    };
}

function getBaseUrl(config: PayFastConfig): string {
    return config.environment === "production"
        ? "https://ipg1.apps.net.pk/Ecommerce/api/Transaction"
        : "https://ipguat.apps.net.pk/Ecommerce/api/Transaction";
}

/**
 * Step 1: Get access token from PayFast
 */
export async function getAccessToken(): Promise<string> {
    const config = getConfig();
    const baseUrl = getBaseUrl(config);

    const res = await fetch(`${baseUrl}/GetAccessToken`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            MERCHANT_ID: config.merchantId,
            SECURED_KEY: config.securedKey,
        }),
    });

    const data = await res.json();
    if (!data.ACCESS_TOKEN) {
        throw new Error(`PayFast auth failed: ${JSON.stringify(data)}`);
    }
    return data.ACCESS_TOKEN;
}

/**
 * Step 2: Initiate a payment — generates redirect URL for PayFast hosted checkout
 */
export async function initiatePayment(params: PaymentInitiateParams): Promise<{
    redirectUrl: string;
    txnRefNo: string;
    formData: Record<string, string>;
}> {
    const config = getConfig();
    const baseUrl = getBaseUrl(config);
    const accessToken = await getAccessToken();

    const txnRefNo = generateTxnRefNo();
    const amountRupees = (params.amountPaisa / 100).toFixed(2);
    const now = new Date();

    const requestData: Record<string, string> = {
        MERCHANT_ID: config.merchantId,
        MERCHANT_NAME: "Foodies Pakistan",
        TOKEN: accessToken,
        PROCCODE: "00",        // Purchase
        TXNAMT: amountRupees,
        CUSTOMER_MOBILE_NO: params.customerPhone || "",
        CUSTOMER_EMAIL_ADDRESS: params.customerEmail || "",
        SIGNATURE: "",         // Will be computed
        VERSION: "MERCHANT-CART-0.1",
        TXNDESC: params.description.slice(0, 100),
        SUCCESS_URL: config.returnUrl,
        FAILURE_URL: config.returnUrl,
        BASKET_ID: txnRefNo,
        ORDER_DATE: formatDate(now),
        CHECKOUT_URL: `${baseUrl}/CheckOut`,
        CURRENCY_CODE: "PKR",
        TXNREFNO: txnRefNo,
    };

    // If tokenization requested, add flag
    if (params.tokenizeCard) {
        requestData.RECURRING_TXN = "true";
    }

    // Generate HMAC-SHA256 signature
    requestData.SIGNATURE = generateSignature(requestData, config.securedKey);

    // Get redirect URL
    const hashRes = await fetch(`${baseUrl}/GetRequestHash`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestData),
    });

    const hashData = await hashRes.json();

    return {
        redirectUrl: hashData.CHECKOUT_URL || `${baseUrl}/CheckOut`,
        txnRefNo,
        formData: { ...requestData, ...hashData },
    };
}

/**
 * Charge a saved card using permanent instrument token (no redirect needed)
 */
export async function chargeTokenizedCard(params: TokenizedChargeParams): Promise<{
    success: boolean;
    responseCode: string;
    message: string;
    data: any;
}> {
    const config = getConfig();
    const baseUrl = getBaseUrl(config);
    const accessToken = await getAccessToken();

    const txnRefNo = generateTxnRefNo();
    const amountRupees = (params.amountPaisa / 100).toFixed(2);

    const requestData: Record<string, string> = {
        MERCHANT_ID: config.merchantId,
        TOKEN: accessToken,
        TXNAMT: amountRupees,
        CUSTOMER_MOBILE_NO: params.customerPhone || "",
        CUSTOMER_EMAIL_ADDRESS: params.customerEmail || "",
        TXNDESC: params.description.slice(0, 100),
        BASKET_ID: txnRefNo,
        CURRENCY_CODE: "PKR",
        TXNREFNO: txnRefNo,
        INSTRUMENT_TOKEN: params.instrumentToken,
    };

    requestData.SIGNATURE = generateSignature(requestData, config.securedKey);

    const res = await fetch(`${baseUrl}/DoTokenizedTransaction`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestData),
    });

    const data = await res.json();

    return {
        success: data.RESPONSE_CODE === "00",
        responseCode: data.RESPONSE_CODE || "",
        message: data.RESPONSE_MESSAGE || "",
        data,
    };
}

/**
 * Delete a stored instrument token (when user removes saved card)
 */
export async function deleteInstrumentToken(instrumentToken: string): Promise<boolean> {
    const config = getConfig();
    const baseUrl = getBaseUrl(config);

    try {
        const accessToken = await getAccessToken();

        await fetch(`${baseUrl}/DeleteInstrumentToken`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                MERCHANT_ID: config.merchantId,
                INSTRUMENT_TOKEN: instrumentToken,
            }),
        });

        return true;
    } catch {
        console.error("[PayFast] Failed to delete instrument token");
        return false;
    }
}

/**
 * Verify callback from PayFast
 */
export function verifyCallbackSignature(callbackParams: Record<string, string>): boolean {
    const config = getConfig();
    const receivedSig = callbackParams.SIGNATURE;
    if (!receivedSig) return false;

    const paramsWithoutSig: Record<string, string> = {};
    for (const [key, value] of Object.entries(callbackParams)) {
        if (key !== "SIGNATURE") {
            paramsWithoutSig[key] = value;
        }
    }

    const computedSig = generateSignature(paramsWithoutSig, config.securedKey);

    return crypto.timingSafeEqual(
        Buffer.from(computedSig),
        Buffer.from(receivedSig)
    );
}

/**
 * Check if transaction was successful
 */
export function isTransactionSuccessful(responseCode: string): boolean {
    return responseCode === "00";
}

// ── Helpers ──

function generateSignature(params: Record<string, string>, securedKey: string): string {
    const sortedKeys = Object.keys(params).sort();
    const values = sortedKeys
        .filter(k => k !== "SIGNATURE" && params[k] && params[k].length > 0)
        .map(k => params[k]);

    const hashString = securedKey + "&" + values.join("&");

    return crypto
        .createHmac("sha256", securedKey)
        .update(hashString)
        .digest("hex")
        .toUpperCase();
}

function generateTxnRefNo(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString("hex");
    return `FP${timestamp}${random}`.toUpperCase().slice(0, 20);
}

function formatDate(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
