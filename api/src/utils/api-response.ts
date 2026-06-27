/**
 * Standardized API Response Wrapper
 *
 * Every API response follows this structure:
 * { success: boolean, data?: T, error?: string, code?: string }
 */

import { Response } from "express";

export function successResponse<T>(
    res: Response,
    data: T,
    statusCode: number = 200
): void {
    res.status(statusCode).json({ success: true, data });
}

export function errorResponse(
    res: Response,
    error: string,
    statusCode: number = 400,
    code?: string
): void {
    res.status(statusCode).json({ success: false, error, ...(code && { code }) });
}

export function paginatedResponse<T>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    limit: number
): void {
    res.status(200).json({
        success: true,
        data,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasMore: page * limit < total,
        },
    });
}
