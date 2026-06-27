import { NextRequest, NextResponse } from "next/server";

const CORE_API_URL = `${process.env.CORE_API_URL || "http://localhost:4000/api/v1"}/payments/callback`;

function fallbackRedirect(params: Record<string, string>, origin: string) {
    const responseCode = params.RESPONSE_CODE || params.pp_ResponseCode;
    const txnRefNo = params.TXNREFNO || params.BASKET_ID || params.pp_TxnRefNo || "";
    const responseMessage =
        params.RESPONSE_MESSAGE ||
        params.pp_ResponseMessage ||
        "Payment was not completed";

    const isSuccess = responseCode === "00" || responseCode === "000";
    const redirectPath = isSuccess
        ? `/payment/success?ref=${encodeURIComponent(txnRefNo)}`
        : `/payment/failed?ref=${encodeURIComponent(txnRefNo)}&reason=${encodeURIComponent(responseMessage)}`;

    return NextResponse.redirect(new URL(redirectPath, origin));
}

export async function POST(req: NextRequest) {
    try {
        const contentType = req.headers.get("content-type") || "";
        let callbackParams: Record<string, string>;

        if (contentType.includes("application/x-www-form-urlencoded")) {
            const formData = await req.formData();
            callbackParams = Object.fromEntries(
                Array.from(formData.entries()).map(([k, v]) => [k, v.toString()])
            );
        } else {
            callbackParams = await req.json();
        }

        // Send to Core API Backend for verification and Database update.
        // We do NOT use `apiClient` because this hits a public endpoint and server-side fetch is sufficient.
        const res = await fetch(CORE_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(callbackParams),
        });

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("[PAYMENT_CALLBACK_ERROR]", error);
        return NextResponse.json({ status: "error", message: "Internal error" });
    }
}

// Also handle GET for browser redirects
export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const params = Object.fromEntries(url.searchParams.entries());

    try {
        const res = await fetch(CORE_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(params),
        });

        if (!res.ok) {
            return fallbackRedirect(params, url.origin);
        }

        const data = await res.json();
        const redirectUrl = data?.redirectUrl;
        if (!redirectUrl) {
            return fallbackRedirect(params, url.origin);
        }

        return NextResponse.redirect(new URL(redirectUrl, url.origin));
    } catch (error) {
        console.error("[PAYMENT_CALLBACK_REDIRECT_ERROR]", error);
        return fallbackRedirect(params, url.origin);
    }
}
