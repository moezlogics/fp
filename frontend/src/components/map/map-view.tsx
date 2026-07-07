"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fallback icon for restaurants without a logo
const fallbackIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

/**
 * Create a circular logo pin for a restaurant.
 * Shows the restaurant logo/cover image in a circle with a pointer triangle.
 */
function createLogoIcon(logoUrl?: string): L.DivIcon | L.Icon {
    if (!logoUrl) return fallbackIcon;

    return L.divIcon({
        className: "fp-single-restaurant-pin",
        html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center;">
            <div style="width:52px;height:52px;border-radius:50%;
                border:3px solid #e8323b;
                box-shadow:0 4px 20px rgba(232, 50, 59,0.35),0 2px 8px rgba(0,0,0,0.15);
                background:url('${logoUrl}') center/cover no-repeat;
                overflow:hidden;">
            </div>
            <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;
                border-top:8px solid #e8323b;margin-top:-1px;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.12));"></div>
        </div>`,
        iconSize: [58, 68],
        iconAnchor: [29, 68],
        popupAnchor: [0, -60],
    });
}

/**
 * Helper to auto-fit the map to the provided markers.
 */
function FitBounds({ restaurants }: { restaurants: any[] }) {
    const map = useMap();

    // Serialize coordinates and ids to form a stable dependency key
    const depKey = restaurants.map((r) => `${r.id}-${r.lat}-${r.lng}`).join(",");

    useEffect(() => {
        // If there is 0 or 1 restaurant, initialCenter and initialZoom on MapContainer
        // already handles centering. Running map.setView or map.fitBounds causes
        // leaflet to pan/animate on mount/re-renders, which causes page jittering
        // and loading tiles twice.
        if (restaurants.length <= 1) return;

        const bounds = L.latLngBounds(
            restaurants.map((r) => [r.lat, r.lng])
        );
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16, animate: false });
    }, [depKey, map]);

    return null;
}

function RestaurantMarker({ restaurant }: { restaurant: MapRestaurant }) {
    const markerRef = useRef<L.Marker>(null);

    useEffect(() => {
        const el = markerRef.current?.getElement();
        if (el) {
            el.setAttribute("aria-label", `${restaurant.name} location on map`);
        }
    }, [restaurant.name]);

    return (
        <Marker
            ref={markerRef}
            position={[restaurant.lat, restaurant.lng]}
            icon={createLogoIcon(restaurant.logo)}
        >
            <Popup>
                <div style={{ padding: 12, textAlign: "center" }}>
                    <p style={{ fontWeight: 900, fontSize: 13, color: "#111827", margin: 0 }}>{restaurant.name}</p>
                    {restaurant.category && (
                        <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{restaurant.category}</p>
                    )}
                </div>
            </Popup>
        </Marker>
    );
}

interface MapRestaurant {
    id: string;
    name: string;
    category?: string;
    lat: number;
    lng: number;
    logo?: string;
}

export default function MapView({ restaurants }: { restaurants: MapRestaurant[] }) {
    const initialCenter: [number, number] =
        restaurants.length > 0
            ? [restaurants[0].lat, restaurants[0].lng]
            : [31.5161, 74.3418];

    const initialZoom = restaurants.length === 1 ? 16 : 14;

    return (
        <>
            <style>{`
                .fp-single-restaurant-pin{background:none!important;border:none!important}
            `}</style>
            <MapContainer
                center={initialCenter}
                zoom={initialZoom}
                style={{ height: "100%", width: "100%", zIndex: 0 }}
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; Google Maps'
                    url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                />
                <FitBounds restaurants={restaurants} />
                {restaurants.map((r) => (
                    <RestaurantMarker key={r.id} restaurant={r} />
                ))}
            </MapContainer>
        </>
    );
}
