import type { Request, Response, NextFunction, RequestHandler } from "express";
import { Redis } from "ioredis";
import type { RateLimiterConfig, RouteConfig } from "../config/schema.js";
import { checkRateLimit } from "./sliding-window.js";

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

export function createRateLimit(
  config: RateLimiterConfig,
  redisClient: Redis,
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip ?? "unknown";
    const routeKey = `${req.method}:${req.path}`;
    const { limit, window_seconds: windowSeconds } = resolveRouteLimits(
      config,
      req.path,
      req.method,
    );
    try {
      const allowed = await checkRateLimit(
        redisClient,
        clientId,
        routeKey,
        limit,
        windowSeconds,
      );
      if (!allowed) {
        res.status(429).json({
          error: "Too Many Requests",
          message: `Limit of ${limit} in ${windowSeconds}ms excedeed`,
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
