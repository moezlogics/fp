/**
 * Role-Based Authorization Middleware — Factory Pattern
 *
 * Usage:
 *   router.get("/admin-only", authenticate, authorize("admin"), handler);
 *   router.get("/owners-too", authenticate, authorize("admin", "owner"), handler);
 */

import { Request, Response, NextFunction } from "express";

export function authorize(...allowedRoles: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: "Authentication required before authorization check.",
            });
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                error: `Access denied. Required role(s): ${allowedRoles.join(", ")}. Your role: ${req.user.role}.`,
            });
            return;
        }

        next();
    };
}
