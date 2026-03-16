import rateLimit from "express-rate-limit";
import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { authLogger } from "./logger";

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  handler: (_req, res) => {
    authLogger.warn({ ip: _req.ip }, "Rate limit exceeded on login");
    res.status(429).json({
      error: "Too many login attempts. Please try again in 15 minutes.",
    });
  },
});

export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  handler: (_req, res) => {
    authLogger.warn({ ip: _req.ip }, "Rate limit exceeded on password reset");
    res.status(429).json({
      error: "Too many password reset attempts. Please try again later.",
    });
  },
});

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  handler: (_req, res) => {
    res.status(429).json({
      error: "Too many requests. Please slow down.",
    });
  },
});

const CSRF_HEADER = "x-csrf-token";
const CSRF_COOKIE = "csrf-token";

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next();
  }

  if (
    req.path.startsWith("/api/stripe/webhook") ||
    req.path.startsWith("/api/stripe/create-subscription-checkout") ||
    req.path.startsWith("/api/strava/webhook") ||
    req.path === "/api/confirm-safety" ||
    req.path === "/api/contacts/confirm" ||
    req.path === "/api/admin/clear-test-data"
  ) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER] as string | undefined;

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    authLogger.warn(
      { path: req.path, ip: req.ip, hasCookie: !!cookieToken, hasHeader: !!headerToken },
      "CSRF token mismatch"
    );
    res.status(403).json({ error: "Invalid or missing CSRF token" });
    return;
  }

  next();
}

export function setCsrfCookie(req: Request, res: Response, next: NextFunction): void {
  if (!req.cookies?.[CSRF_COOKIE]) {
    const token = generateCsrfToken();
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    });
  }
  next();
}
