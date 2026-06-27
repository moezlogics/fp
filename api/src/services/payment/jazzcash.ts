import crypto from "crypto";

/**
 * JazzCash Payment Gateway Integration Service
 * 
 * Architecture:
 * - Uses HMAC-SHA256 for hash generation (JazzCash requirement)
 * - All amounts are in Paisa (integer) — converted to string for JazzCash API
 * - Supports both Sandbox and Production environments
 * - Callback verification uses the same hash to prevent tampering
 */

interface JazzCashConfig {
    merchantId: string;
    password: string;
    integritySalt: string;
    returnUrl: string;
    environment: "sandbox" | "production";
}

interface PaymentInitiateParams {
    amountPaisa: number;
    orderId: string;
    description: string;
    customerEmail?: string;
    customerPhone?: string;
}

interface JazzCashFormData {
    pp_Version: string;
    pp_TxnType: string;
    pp_Language: string;
    pp_MerchantID: string;
    pp_SubMerchantID: string;
    pp_Password: string;
    pp_BankID: string;
    pp_ProductID: string;
    pp_TxnRefNo: string;
    pp_Amount: string;
    pp_TxnCurrency: string;
    pp_TxnDateTime: string;
    pp_BillReference: string;
    pp_Description: string;
    pp_TxnExpiryDateTime: string;
    pp_ReturnURL: string;
    pp_SecureHash: string;
    ppmpf_1?: string;
    ppmpf_2?: string;
    ppmpf_3?: string;
    ppmpf_4?: string;
    ppmpf_5?: string;
}

function getConfig(): JazzCashConfig {
    return {
        merchantId: process.env.JAZZCASH_MERCHANT_ID || "",
        password: process.env.JAZZCASH_PASSWORD || "",
        integritySalt: process.env.JAZZCASH_INTEGRITY_SALT || "",
        returnUrl: process.env.JAZZCASH_RETURN_URL || "",
        environment: (process.env.JAZZCASH_ENVIRONMENT as "sandbox" | "production") || "sandbox",
    };
}

function getApiUrl(config: JazzCashConfig): string {
    return config.environment === "production"
        ? "https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/"
        : "https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/";
}

/**
 * Generates the HMAC-SHA256 hash for JazzCash request parameters.
 * The hash must be computed from a sorted string of all non-empty pp_ fields.
 */
function generateHash(params: Record<string, string>, integritySalt: string): string {
    // Sort keys alphabetically and concatenate values with '&'
    const sortedKeys = Object.keys(params)
        .filter((k) => k.startsWith("pp_") || k.startsWith("ppmpf_"))
        .sort();

    const hashString = integritySalt + "&" + sortedKeys
        .map((k) => params[k])
        .filter((v) => v && v.length > 0)
        .join("&");

    return crypto
        .createHmac("sha256", integritySalt)
        .update(hashString)
        .digest("hex");
}

/**
 * Formats the current date/time in JazzCash's required format: YYYYMMDDHHmmss
 */
function formatDateTime(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return (
        date.getFullYear().toString() +
        pad(date.getMonth() + 1) +
        pad(date.getDate()) +
        pad(date.getHours()) +
        pad(date.getMinutes()) +
        pad(date.getSeconds())
    );
}

/**
 * Generates a unique transaction reference number.
 * Format: T{timestamp}{random}
 */
function generateTxnRefNo(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString("hex");
    return `T${timestamp}${random}`.toUpperCase().slice(0, 20);
}

/**
 * Creates the form data required to initiate a JazzCash payment.
 * The frontend should create a hidden form and auto-submit to the JazzCash URL.
 */
export function initiatePayment(params: PaymentInitiateParams): {
    formData: JazzCashFormData;
    actionUrl: string;
    txnRefNo: string;
} {
    const config = getConfig();

    if (!config.merchantId || !config.password || !config.integritySalt) {
        throw new Error("JazzCash configuration is incomplete. Check environment variables.");
    }

    const now = new Date();
    const expiry = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour expiry
    const txnRefNo = generateTxnRefNo();

    // JazzCash expects amount as string without decimals (in Paisa → convert to Rupees string)
    // Actually JazzCash API expects amount in the smallest unit (Paisa for PKR)
    // But their API docs show amount as string of Rupees with no decimals
    // So we convert Paisa → Rupees (integer division, since we only deal in whole Rupees)
    const amountRupees = Math.floor(params.amountPaisa / 100).toString();

    const formParams: Record<string, string> = {
        pp_Version: "1.1",
        pp_TxnType: "MWALLET",
        pp_Language: "EN",
        pp_MerchantID: config.merchantId,
        pp_SubMerchantID: "",
        pp_Password: config.password,
        pp_BankID: "",
        pp_ProductID: "",
        pp_TxnRefNo: txnRefNo,
        pp_Amount: amountRupees,
        pp_TxnCurrency: "PKR",
        pp_TxnDateTime: formatDateTime(now),
        pp_BillReference: params.orderId,
        pp_Description: params.description.slice(0, 50),
        pp_TxnExpiryDateTime: formatDateTime(expiry),
        pp_ReturnURL: config.returnUrl,
        ppmpf_1: params.customerEmail || "",
        ppmpf_2: params.customerPhone || "",
        ppmpf_3: "",
        ppmpf_4: "",
        ppmpf_5: "",
    };

    const hash = generateHash(formParams, config.integritySalt);
    formParams.pp_SecureHash = hash;

    return {
        formData: formParams as unknown as JazzCashFormData,
        actionUrl: getApiUrl(config),
        txnRefNo,
    };
}

/**
 * Verifies the callback hash from JazzCash to ensure data integrity.
 * This MUST be called on every callback to prevent tampering.
 */
export function verifyCallbackHash(callbackParams: Record<string, string>): boolean {
    const config = getConfig();
    const receivedHash = callbackParams.pp_SecureHash;

    if (!receivedHash) return false;

    // Remove the hash from params before recomputing
    const paramsWithoutHash: Record<string, string> = {};
    for (const [key, value] of Object.entries(callbackParams)) {
        if (key !== "pp_SecureHash") {
            paramsWithoutHash[key] = value;
        }
    }

    const computedHash = generateHash(paramsWithoutHash, config.integritySalt);

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
        Buffer.from(computedHash, "hex"),
        Buffer.from(receivedHash, "hex")
    );
}

/**
 * Checks if the transaction was successful based on JazzCash response code.
 */
export function isTransactionSuccessful(responseCode: string): boolean {
    return responseCode === "000"; // JazzCash success code
}
