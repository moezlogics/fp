/**
 * Security Logger — Centralized Security Event Monitoring (SEC-29)
 *
 * Provides structured JSON logging for all security-relevant events:
 * - Failed login attempts (with IP, user agent)
 * - Brute force detection
 * - Admin access and impersonation
 * - Rate limit violations
 * - Suspicious activity patterns
 *
 * Uses console-based structured logging (compatible with PM2/CloudWatch).
 * In production, these logs can be piped to a centralized logging service.
 */

export type SecurityEventType =
    | "LOGIN_FAILED"
    | "LOGIN_SUCCESS"
    | "BRUTE_FORCE_DETECTED"
    | "ADMIN_LOGIN_BLOCKED"
    | "ADMIN_ACCESS"
    | "IMPERSONATION"
    | "TOKEN_REFRESH_FAILED"
    | "SESSION_INVALIDATED"
    | "PASSWORD_CHANGED"
    | "PASSWORD_RESET"
    | "ACCOUNT_LOCKED"
    | "SUSPICIOUS_ACTIVITY"
    | "OTP_BRUTE_FORCE"
    | "CORS_VIOLATION"
    | "UNAUTHORIZED_ACCESS"
    | "ACCOUNT_DELETED"
    | "DATA_EXPORTED";

export type SecuritySeverity = "INFO" | "WARN" | "ERROR" | "CRITICAL";

interface SecurityEvent {
    type: SecurityEventType;
    severity: SecuritySeverity;
    ip?: string;
    userAgent?: string;
    userId?: string;
    email?: string;
    endpoint?: string;
    details?: Record<string, any>;
    timestamp: string;
}

/**
 * Log a security event with structured JSON.
 */
export function logSecurityEvent(event: Omit<SecurityEvent, "timestamp">): void {
    const fullEvent: SecurityEvent = {
        ...event,
        timestamp: new Date().toISOString(),
    };

    const prefix = `[SECURITY:${event.severity}]`;

    switch (event.severity) {
        case "CRITICAL":
        case "ERROR":
            console.error(prefix, JSON.stringify(fullEvent));
            break;
        case "WARN":
            console.warn(prefix, JSON.stringify(fullEvent));
            break;
        default:
            console.log(prefix, JSON.stringify(fullEvent));
    }
}

/**
 * Extract client IP from request, handling proxy chains.
 */
export function getClientIP(req: any): string {
    // trust proxy is set to 1, so req.ip is reliable
    return req.ip || req.connection?.remoteAddress || "unknown";
}

/**
 * Extract user agent from request.
 */
export function getUserAgent(req: any): string {
    return (req.headers?.["user-agent"] || "unknown").substring(0, 200);
}
