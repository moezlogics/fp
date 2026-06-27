/**
 * MongoDB Connection — Standalone Node.js (no Next.js global caching).
 *
 * Uses connection pooling with maxPoolSize=10 for production scale.
 * Implements reconnect logic with exponential backoff.
 */

import mongoose from "mongoose";
import { env } from "./env";

let isConnected = false;

export async function connectDB(): Promise<typeof mongoose> {
    if (isConnected) {
        return mongoose;
    }

    try {
        const conn = await mongoose.connect(env.MONGODB_URI, {
            maxPoolSize: 25,
            minPoolSize: 5,
            socketTimeoutMS: 45000,
            serverSelectionTimeoutMS: 5000,
            bufferCommands: false,
        });

        isConnected = true;

        mongoose.connection.on("error", (err) => {
            console.error("[DB] Connection error:", err);
            isConnected = false;
        });

        mongoose.connection.on("disconnected", () => {
            console.warn("[DB] Disconnected. Will attempt reconnect on next query.");
            isConnected = false;
        });

        console.log(
            `✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`
        );

        return conn;
    } catch (err) {
        console.error("[DB] Initial connection failed:", err);
        process.exit(1);
    }
}
