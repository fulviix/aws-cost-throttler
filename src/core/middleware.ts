import type { Request, Response, NextFunction, RequestHandler } from "express";
import { Redis } from "ioredis";
import type { RateLimiterConfig, RouteConfig } from "../config/schema.js";
import { checkRateLimit } from "./sliding-window.js";
import { BudgetMonitor } from "../cost-provider/budget-monitor.js";
import { calculateEffectiveLimit } from "./effective-limit.js";

function resolveRouteLimits(
  config: RateLimiterConfig,
  path: string,
  method: string,
): Pick<RouteConfig, "limit" | "window_seconds" | "cost_sensitivity"> {
  const matchedRoute = config.routes.find(
    (route) => route.path === path && route.method === method,
  );
  if (matchedRoute) {
    return matchedRoute;
  }
  return config.default;
}

export function createRateLimitMiddleware(
  config: RateLimiterConfig,
  redisClient: Redis,
  budgetMonitor: BudgetMonitor,
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip ?? "unknown";
    const routeKey = `${req.method}:${req.path}`;

    const {
      limit: baseLimit,
      window_seconds: windowSeconds,
      cost_sensitivity: costSensitivity,
    } = resolveRouteLimits(config, req.path, req.method);

    const budgetState = budgetMonitor.getCurrentState();
    const effectiveLimit = calculateEffectiveLimit(
      baseLimit,
      costSensitivity,
      budgetState,
    );

    try {
      const allowed = await checkRateLimit(
        redisClient,
        clientId,
        routeKey,
        effectiveLimit,
        windowSeconds,
      );
      if (!allowed) {
        res.status(429).json({
          error: "Too Many Requests",
          message: `Limit of ${effectiveLimit} in ${windowSeconds}s excedeed`,
        });
        return;
      }
      next();
    } catch (error) {
      console.error("[rate-limiter] error during check rate limit", error);
      next();
    }
  };
}
