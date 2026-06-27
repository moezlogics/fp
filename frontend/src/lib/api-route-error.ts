import { NextResponse } from "next/server";

export function toApiErrorResponse(error: any, fallbackMessage: string) {
    const message =
        error?.response?.data?.error ||
        error?.message ||
        fallbackMessage;

    const status =
        error?.response?.status ||
        error?.status ||
        500;

    return NextResponse.json({ error: message }, { status });
}
