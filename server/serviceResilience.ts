import { db } from "./db";
import { resilienceLogger } from "./logger";

function getDb() {
  if (!db) throw new Error("Database not initialized");
  return db;
}

export type ServiceName = "resend" | "sendgrid" | "gmail" | "outlook" | "twilio_sms" | "twilio_voice" | "openai" | "stripe" | "ecologi" | "osrm" | "open_meteo" | "what3words";

interface ServiceStatus {
  name: ServiceName;
  healthy: boolean;
  consecutiveFailures: number;
  lastSuccess: Date | null;
  lastFailure: Date | null;
  lastError: string | null;
  circuitOpen: boolean;
  totalSuccesses: number;
  totalFailures: number;
}

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_COOLDOWN_MS = 60 * 1000;

const serviceStatuses = new Map<ServiceName, ServiceStatus>();

function getOrCreateStatus(name: ServiceName): ServiceStatus {
  let status = serviceStatuses.get(name);
  if (!status) {
    status = {
      name,
      healthy: true,
      consecutiveFailures: 0,
      lastSuccess: null,
      lastFailure: null,
      lastError: null,
      circuitOpen: false,
      totalSuccesses: 0,
      totalFailures: 0,
    };
    serviceStatuses.set(name, status);
  }
  return status;
}

export function recordSuccess(name: ServiceName): void {
  const status = getOrCreateStatus(name);
  status.healthy = true;
  status.consecutiveFailures = 0;
  status.lastSuccess = new Date();
  status.circuitOpen = false;
  status.totalSuccesses++;
}

export function recordFailure(name: ServiceName, error: string): void {
  const status = getOrCreateStatus(name);
  status.consecutiveFailures++;
  status.lastFailure = new Date();
  status.lastError = error;
  status.totalFailures++;

  if (status.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    status.circuitOpen = true;
    status.healthy = false;
    resilienceLogger.warn({ service: name, failures: status.consecutiveFailures }, "Circuit breaker OPEN");
  }
}

export function isCircuitOpen(name: ServiceName): boolean {
  const status = getOrCreateStatus(name);
  if (!status.circuitOpen) return false;

  if (status.lastFailure) {
    const elapsed = Date.now() - status.lastFailure.getTime();
    if (elapsed > CIRCUIT_BREAKER_COOLDOWN_MS) {
      status.circuitOpen = false;
      status.healthy = true;
      resilienceLogger.info({ service: name }, "Circuit breaker reset to closed after cooldown");
      return false;
    }
  }
  return true;
}

export function getAllServiceStatuses(): ServiceStatus[] {
  const allServices: ServiceName[] = [
    "resend", "sendgrid", "gmail", "outlook",
    "twilio_sms", "twilio_voice",
    "openai", "stripe", "ecologi",
    "osrm", "open_meteo", "what3words"
  ];

  return allServices.map(name => getOrCreateStatus(name));
}

export function getServiceStatus(name: ServiceName): ServiceStatus {
  return getOrCreateStatus(name);
}

function isTransientError(error: any): boolean {
  const message = error?.message?.toLowerCase() || String(error).toLowerCase();
  const statusCode = error?.statusCode || error?.status || error?.code;

  if (statusCode === 429) return true;
  if (statusCode >= 500 && statusCode < 600) return true;

  const transientPatterns = [
    "timeout", "econnreset", "econnrefused", "enotfound",
    "socket hang up", "network", "etimedout", "epipe",
    "rate limit", "too many requests", "service unavailable",
    "internal server error", "bad gateway", "gateway timeout",
    "temporarily unavailable", "fetch failed"
  ];

  return transientPatterns.some(pattern => message.includes(pattern));
}

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  serviceName?: ServiceName;
  operation?: string;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    serviceName,
    operation = "operation",
  } = options;

  if (serviceName && isCircuitOpen(serviceName)) {
    resilienceLogger.warn({ service: serviceName, operation }, "Circuit breaker open, skipping retry");
    throw new Error(`Service ${serviceName} circuit breaker is open`);
  }

  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();
      if (serviceName) {
        recordSuccess(serviceName);
      }
      return result;
    } catch (error: any) {
      lastError = error;

      if (attempt === maxAttempts) {
        if (serviceName) {
          recordFailure(serviceName, error?.message || String(error));
        }
        resilienceLogger.error({ service: serviceName, operation, attempt, maxAttempts, error: error?.message }, "All retry attempts exhausted");
        break;
      }

      if (!isTransientError(error)) {
        if (serviceName) {
          recordFailure(serviceName, error?.message || String(error));
        }
        resilienceLogger.error({ service: serviceName, operation, attempt, error: error?.message }, "Non-transient error, not retrying");
        break;
      }

      const delay = Math.min(initialDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      const jitter = delay * (0.5 + Math.random() * 0.5);
      resilienceLogger.warn({ service: serviceName, operation, attempt, maxAttempts, retryInMs: Math.round(jitter), error: error?.message }, "Transient error, retrying");
      await new Promise(resolve => setTimeout(resolve, jitter));
    }
  }

  throw lastError;
}

export async function withFallback<T>(
  primary: { fn: () => Promise<T>; name: string; serviceName?: ServiceName },
  ...fallbacks: { fn: () => Promise<T>; name: string; serviceName?: ServiceName }[]
): Promise<T> {
  const providers = [primary, ...fallbacks];

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    const isLast = i === providers.length - 1;

    if (provider.serviceName && isCircuitOpen(provider.serviceName)) {
      resilienceLogger.warn({ provider: provider.name, service: provider.serviceName }, "Fallback provider circuit open, skipping");
      continue;
    }

    try {
      const result = await provider.fn();
      if (provider.serviceName) {
        recordSuccess(provider.serviceName);
      }
      if (i > 0) {
        resilienceLogger.info({ provider: provider.name, primary: primary.name }, "Fallback provider succeeded");
      }
      return result;
    } catch (error: any) {
      if (provider.serviceName) {
        recordFailure(provider.serviceName, error?.message || String(error));
      }
      if (isLast) {
        resilienceLogger.error({ provider: provider.name, error: error?.message }, "All fallback providers failed");
        throw error;
      }
      resilienceLogger.warn({ provider: provider.name, next: providers[i + 1].name, error: error?.message }, "Fallback provider failed, trying next");
    }
  }

  throw new Error("All fallback providers failed");
}

export async function resilientFetch(
  url: string,
  options: RequestInit & { serviceName?: ServiceName; operation?: string; maxAttempts?: number } = {}
): Promise<Response> {
  const { serviceName, operation = "fetch", maxAttempts = 2, ...fetchOptions } = options;

  return withRetry(async () => {
    const response = await fetch(url, fetchOptions);
    if (!response.ok && response.status >= 500) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response;
  }, { maxAttempts, serviceName, operation });
}
