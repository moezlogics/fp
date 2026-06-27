import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { auth } from "@/auth";

async function proxyRequest(req: NextRequest, params: { path: string[] }, method: string) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const route = params.path.join("/");
        
        let body;
        if (["POST", "PATCH", "PUT"].includes(method)) {
            // Check if there is a body before parsing
            const text = await req.text();
            if (text) {
                body = JSON.parse(text);
            }
        }

        const res = await apiClient(`/payment-methods/${route}`, {
            method,
            body: body ? JSON.stringify(body) : undefined,
            requireAuth: true,
        });

        const data = res.data?.data || res.data;
        return NextResponse.json({ data }, { status: res.status });
    } catch (error: any) {
        // apiClient throws an error object with status attached
        const status = error.status || 500;
        const message = error.message || "Request failed";
        return NextResponse.json({ error: message }, { status });
    }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const resolvedParams = await params;
    return proxyRequest(req, resolvedParams, "GET");
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const resolvedParams = await params;
    return proxyRequest(req, resolvedParams, "POST");
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const resolvedParams = await params;
    return proxyRequest(req, resolvedParams, "PATCH");
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const resolvedParams = await params;
    return proxyRequest(req, resolvedParams, "DELETE");
}
