import type { RequestHandler } from "express";
import { loadConfig } from "./config/loader.js";
import { createRedisClient } from "./core/redis-client.js";
import { createRateLimitMiddleware } from "./core/middleware.js";
import { createCostProvider } from "./cost-provider/create-cost-provider.js";
import { BudgetMonitor } from "./cost-provider/budget-monitor.js";

export interface CreateThrottlerOptions {
  configPath?: string;
}

export interface Throttler {
  middleware(): RequestHandler;
  stop(): Promise<void>;
}

export async function createThrottler(
  options: CreateThrottlerOptions = {},
): Promise<Throttler> {
  const config = loadConfig(options.configPath);
  const redisClient = createRedisClient(config.redis);
  const costProvider = createCostProvider(config.budget);
  const budgetMonitor = new BudgetMonitor(
    costProvider,
    config.budget.thresholds,
    config.budget.check_interval_seconds,
  );
  budgetMonitor.start();

  const rateLimitMiddleware = createRateLimitMiddleware(
    config,
    redisClient,
    budgetMonitor,
  );

  return {
    middleware(): RequestHandler {
      return rateLimitMiddleware;
    },
    async stop(): Promise<void> {
      budgetMonitor.stop();
      await redisClient.quit();
    },
  };
}
