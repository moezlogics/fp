import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getDeviceId(): string {
    if (typeof window === "undefined") return "";
    let id = localStorage.getItem("foodies_device_id");
    if (!id) {
        id = Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem("foodies_device_id", id);
    }
    return id;
}

export function formatPaisa(paisa: number): string {
    return `Rs. ${(paisa / 100).toLocaleString("en-PK")}`;
}
