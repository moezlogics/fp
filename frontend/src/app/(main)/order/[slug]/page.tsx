"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useParams } from "next/navigation";
import {
    QrCode,
    ShoppingCart,
    Plus,
    Minus,
    Trash2,
    ChefHat,
    Flame,
    Leaf,
    Star,
    Send,
    Check,
    AlertCircle,
} from "lucide-react";

interface CartItem {
    menuItemId: string;
    name: string;
    pricePaisa: number;
    quantity: number;
    specialInstructions: string;
}

interface MenuCategory {
    [category: string]: {
        _id: string;
        name: string;
        description: string;
        price: number;
        pricePaisa: number;
        image?: string;
        dietaryTags: string[];
        isPopular: boolean;
    }[];
}

export default function QROrderPage() {
    const params = useParams();
    const slug = params.slug as string;
    const searchParams = useSearchParams();
    const tableNumber = searchParams.get("table") || "1";

    const [menu, setMenu] = useState<MenuCategory>({});
    const [restaurantId, setRestaurantId] = useState<string>("");
    const [restaurantName, setRestaurantName] = useState("");
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCart, setShowCart] = useState(false);
    const [orderPlaced, setOrderPlaced] = useState<any>(null);
    const [activeCategory, setActiveCategory] = useState("");

    // Fetch restaurant by slug
    useEffect(() => {
        async function load() {
            try {
                // First get restaurant ID from slug
                const resSlug = await fetch(`/api/restaurants/by-slug/${slug}`);
                if (!resSlug.ok) return;
                const slugData = await resSlug.json();
                const id = slugData.data?._id;
                setRestaurantId(id);
                setRestaurantName(slugData.data?.brandName || "Restaurant");

                // Then fetch menu
                const resMenu = await fetch(`/api/menu-items/${id}`);
                if (resMenu.ok) {
                    const menuData = await resMenu.json();
                    setMenu(menuData.data?.menu || {});
                    const cats = Object.keys(menuData.data?.menu || {});
                    if (cats.length > 0) setActiveCategory(cats[0]);
                }
            } catch { }
            setLoading(false);
        }
        load();
    }, [slug]);

    const categories = Object.keys(menu);

    const addToCart = (item: any) => {
        setCart((prev) => {
            const existing = prev.find((c) => c.menuItemId === item._id);
            if (existing) {
                return prev.map((c) =>
                    c.menuItemId === item._id ? { ...c, quantity: c.quantity + 1 } : c
                );
            }
            return [
                ...prev,
                {
                    menuItemId: item._id,
                    name: item.name,
                    pricePaisa: item.pricePaisa,
                    quantity: 1,
                    specialInstructions: "",
                },
            ];
        });
    };

    const updateQty = (menuItemId: string, delta: number) => {
        setCart((prev) =>
            prev
                .map((c) =>
                    c.menuItemId === menuItemId
                        ? { ...c, quantity: Math.max(0, c.quantity + delta) }
                        : c
                )
                .filter((c) => c.quantity > 0)
        );
    };

    const cartTotal = useMemo(
        () => cart.reduce((sum, c) => sum + c.pricePaisa * c.quantity, 0),
        [cart]
    );

    const cartCount = useMemo(
        () => cart.reduce((sum, c) => sum + c.quantity, 0),
        [cart]
    );

    const placeOrder = async () => {
        if (cart.length === 0) return;
        try {
            const res = await fetch("/api/table-orders/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    restaurantId,
                    tableNumber,
                    items: cart.map((c) => ({
                        menuItemId: c.menuItemId,
                        quantity: c.quantity,
                        specialInstructions: c.specialInstructions,
                    })),
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || "Failed");
                return;
            }

            // Now place the order to kitchen
            const orderCode = data.data?.orderCode;
            if (orderCode) {
                await fetch(`/api/table-orders/${orderCode}/place`, { method: "POST" });
            }

            setOrderPlaced(data.data);
            setCart([]);
            setShowCart(false);
        } catch {
            alert("Network error");
        }
    };

    const tagIcon: Record<string, React.ReactNode> = {
        Spicy: <Flame size={12} color="#ef4444" />,
        Vegetarian: <Leaf size={12} color="#22c55e" />,
        Vegan: <Leaf size={12} color="#16a34a" />,
    };

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
                <div style={{ textAlign: "center", color: "#888" }}>
                    <QrCode size={40} style={{ marginBottom: 12 }} />
                    <div>Loading menu...</div>
                </div>
            </div>
        );
    }

    if (orderPlaced) {
        return (
            <div style={{ maxWidth: 500, margin: "0 auto", padding: "60px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>🍳</div>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1a1a2e" }}>Order Placed!</h1>
                <p style={{ color: "#888", marginTop: 8 }}>
                    Your food is being prepared. Order Code:{" "}
                    <strong>{orderPlaced.orderCode}</strong>
                </p>
                <div
                    style={{
                        background: "#f0fdf4",
                        borderRadius: 12,
                        padding: 20,
                        marginTop: 24,
                        fontSize: 14,
                    }}
                >
                    <div>Table: <strong>{tableNumber}</strong></div>
                    <div>Items: <strong>{orderPlaced.itemCount}</strong></div>
                    <div>Total: <strong>Rs. {orderPlaced.subtotal?.toLocaleString()}</strong></div>
                </div>
                <button
                    onClick={() => setOrderPlaced(null)}
                    style={{
                        marginTop: 24,
                        padding: "12px 32px",
                        borderRadius: 10,
                        border: "1px solid #e5e7eb",
                        background: "#fff",
                        fontWeight: 600,
                        cursor: "pointer",
                    }}
                >
                    Order More
                </button>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 600, margin: "0 auto", paddingBottom: 100 }}>
            {/* Header */}
            <div
                style={{
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "#fff",
                    padding: "20px 16px",
                    borderRadius: "0 0 20px 20px",
                }}
            >
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                    QR TABLE ORDER — Table {tableNumber}
                </div>
                <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{restaurantName}</h1>
            </div>

            {/* Category Tabs */}
            <div
                style={{
                    display: "flex",
                    gap: 8,
                    overflowX: "auto",
                    padding: "16px 16px 0",
                    scrollbarWidth: "none",
                }}
            >
                {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        style={{
                            whiteSpace: "nowrap",
                            padding: "8px 16px",
                            borderRadius: 20,
                            border: activeCategory === cat ? "2px solid #667eea" : "1px solid #e5e7eb",
                            background: activeCategory === cat ? "#eef2ff" : "#fff",
                            color: activeCategory === cat ? "#667eea" : "#666",
                            fontWeight: 600,
                            fontSize: 13,
                            cursor: "pointer",
                        }}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Menu Items */}
            <div style={{ padding: "16px" }}>
                {(menu[activeCategory] || []).map((item) => {
                    const inCart = cart.find((c) => c.menuItemId === item._id);
                    return (
                        <div
                            key={item._id}
                            style={{
                                display: "flex",
                                gap: 12,
                                padding: "16px 0",
                                borderBottom: "1px solid #f5f5f5",
                            }}
                        >
                            {/* Image */}
                            {item.image && (
                                <img
                                    src={item.image}
                                    alt={item.name}
                                    style={{
                                        width: 80,
                                        height: 80,
                                        borderRadius: 12,
                                        objectFit: "cover",
                                    }}
                                />
                            )}

                            {/* Info */}
                            <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span style={{ fontWeight: 600, fontSize: 15 }}>{item.name}</span>
                                    {item.isPopular && <Star size={14} color="#e8323b" fill="#e8323b" />}
                                </div>
                                {item.description && (
                                    <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                                        {item.description}
                                    </div>
                                )}
                                <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                                    {item.dietaryTags?.map((tag) => (
                                        <span
                                            key={tag}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 2,
                                                fontSize: 10,
                                                padding: "2px 6px",
                                                borderRadius: 4,
                                                background: "#f5f5f5",
                                                color: "#666",
                                            }}
                                        >
                                            {tagIcon[tag]} {tag}
                                        </span>
                                    ))}
                                </div>
                                <div style={{ fontWeight: 700, fontSize: 15, marginTop: 6, color: "#1a1a2e" }}>
                                    Rs. {item.price.toLocaleString()}
                                </div>
                            </div>

                            {/* Add button */}
                            <div style={{ display: "flex", alignItems: "center" }}>
                                {inCart ? (
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            background: "#eef2ff",
                                            borderRadius: 10,
                                            padding: "4px 8px",
                                        }}
                                    >
                                        <button
                                            onClick={() => updateQty(item._id, -1)}
                                            style={{
                                                width: 28,
                                                height: 28,
                                                borderRadius: 8,
                                                border: "none",
                                                background: "#667eea",
                                                color: "#fff",
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <span style={{ fontWeight: 700, fontSize: 14, minWidth: 20, textAlign: "center" }}>
                                            {inCart.quantity}
                                        </span>
                                        <button
                                            onClick={() => updateQty(item._id, 1)}
                                            style={{
                                                width: 28,
                                                height: 28,
                                                borderRadius: 8,
                                                border: "none",
                                                background: "#667eea",
                                                color: "#fff",
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => addToCart(item)}
                                        style={{
                                            padding: "8px 16px",
                                            borderRadius: 10,
                                            border: "1px solid #667eea",
                                            background: "#fff",
                                            color: "#667eea",
                                            fontWeight: 600,
                                            fontSize: 13,
                                            cursor: "pointer",
                                        }}
                                    >
                                        ADD
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Floating Cart Bar */}
            {cartCount > 0 && (
                <div
                    style={{
                        position: "fixed",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: "12px 16px",
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "#fff",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        zIndex: 100,
                        boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
                    }}
                >
                    <div>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>{cartCount} items</div>
                        <div style={{ fontWeight: 700, fontSize: 18 }}>
                            Rs. {(cartTotal / 100).toLocaleString()}
                        </div>
                    </div>
                    <button
                        onClick={placeOrder}
                        style={{
                            padding: "12px 28px",
                            borderRadius: 10,
                            border: "none",
                            background: "#fff",
                            color: "#667eea",
                            fontWeight: 700,
                            fontSize: 15,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                        }}
                    >
                        <Send size={16} /> Place Order
                    </button>
                </div>
            )}
        </div>
    );
}
