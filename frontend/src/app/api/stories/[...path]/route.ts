import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const API_BASE_URL = process.env.CORE_API_URL?.replace(/\/api\/v1$/, "") || "http://localhost:4000";

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    return handleProxy(req, path);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    return handleProxy(req, path);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    return handleProxy(req, path);
}

async function handleProxy(req: NextRequest, pathArray: string[]) {
    try {
        const session = await auth();
        const url = new URL(req.url);
        const targetPath = pathArray.join("/");
        const targetUrl = `${API_BASE_URL}/api/v1/stories/${targetPath}${url.search}`;

        const headers: HeadersInit = {};

        if ((session as any)?.accessToken) {
            headers["Authorization"] = `Bearer ${(session as any).accessToken}`;
        }

        const options: RequestInit = {
            method: req.method,
            headers,
        };

        if (req.method !== "GET" && req.method !== "HEAD") {
            const contentType = req.headers.get("content-type");
            if (contentType && contentType.includes("multipart/form-data")) {
                const formData = await req.formData();
                options.body = formData;
            } else {
                headers["Content-Type"] = "application/json";
                options.body = await req.text();
            }
        }

        const response = await fetch(targetUrl, options);

        const respContentType = response.headers.get("content-type");
        if (respContentType && respContentType.includes("application/json")) {
            const bodyToReturn = await response.json();
            return NextResponse.json(bodyToReturn, { status: response.status });
        } else {
            const bodyToReturn = await response.text();
            return new NextResponse(bodyToReturn, { status: response.status });
        }
    } catch (error: any) {
        console.error("Stories Proxy Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
