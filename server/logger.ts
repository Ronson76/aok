import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  serializers: {
    err: pino.stdSerializers.err,
    req: (req) => ({
      method: req.method,
      url: req.url,
      remoteAddress: req.ip || req.socket?.remoteAddress,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "*.password",
      "*.token",
      "*.secret",
      "*.apiKey",
    ],
    censor: "[REDACTED]",
  },
});

export function createChildLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

export const authLogger = logger.child({ module: "auth" });
export const notificationLogger = logger.child({ module: "notifications" });
export const resilienceLogger = logger.child({ module: "resilience" });
export const analyticsLogger = logger.child({ module: "analytics" });
export const schedulerLogger = logger.child({ module: "scheduler" });
