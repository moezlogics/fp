import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/geo/ip
 * 
 * Server-side proxy for IP geolocation — avoids CORS issues from client-side fetch.
 * Uses ip-api.com (free, no key needed, no CORS issues from server).
 * Falls back to ipapi.co if primary fails.
 */
export async function GET(req: NextRequest) {
    try {
        // Get client's real IP from headers (works behind reverse proxies)
        const forwarded = req.headers.get("x-forwarded-for");
        const realIp = req.headers.get("x-real-ip");
        const clientIp = forwarded?.split(",")[0]?.trim() || realIp || "";

        // Primary: ip-api.com (free, 45 req/min, no CORS issues from server)
        const url = clientIp && clientIp !== "::1" && clientIp !== "127.0.0.1"
            ? `http://ip-api.com/json/${clientIp}?fields=status,city,lat,lon,regionName,country`
            : `http://ip-api.com/json/?fields=status,city,lat,lon,regionName,country`;

        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json();

        if (data.status === "success") {
            return NextResponse.json({
                city: data.city,
                region: data.regionName,
                country: data.country,
                latitude: data.lat,
                longitude: data.lon,
            });
        }

        // Fallback: ipapi.co (server-side — no CORS issue)
        const fallback = await fetch("https://ipapi.co/json/", { cache: "no-store" });
        const fbData = await fallback.json();

        return NextResponse.json({
            city: fbData.city,
            region: fbData.region,
            country: fbData.country_name,
            latitude: fbData.latitude,
            longitude: fbData.longitude,
        });
    } catch (error) {
        console.error("[GeoIP] Detection failed:", error);
        // Fallback: Lahore as default
        return NextResponse.json({
            city: "Lahore",
            region: "Punjab",
            country: "Pakistan",
            latitude: 31.5204,
            longitude: 74.3587,
        });
    }
}
