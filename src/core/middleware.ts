import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { Redis } from "ioredis";
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
