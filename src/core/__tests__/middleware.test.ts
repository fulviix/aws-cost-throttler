import { describe, it, expect, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import type { Redis } from "ioredis";
import type { RateLimiterConfig } from "../../config/schema.js";
import { createRedisClient } from "../redis-client.js";
import { createRateLimitMiddleware } from "../middleware.js";

function buildTestConfig(limit: number): RateLimiterConfig {
  return {
    redis: { host: "127.0.0.1", port: 6379 },
    budget: {
      provider: "mock",
      monthly_limit_usd: 500,
      thresholds: { warning: 80, critical: 95 },
      check_interval_seconds: 60,
    },
    routes: [
      {
        path: "/orders",
        method: "POST",
        limit,
        window_seconds: 60,
        cost_sensitivity: "high",
      },
    ],
    default: {
      limit: 1000,
      window_seconds: 60,
      cost_sensitivity: "low",
    },
  };
}

describe("createRateLimitMiddleware", () => {
  let redisClient: Redis;
  beforeEach(async () => {
    redisClient = createRedisClient({ host: "127.0.0.1", port: 6379 });
  });
  afterEach(async () => {
    const keys = await redisClient.keys("ratelimit:*");
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
    await redisClient.quit();
  });

  it("req passes if under the limit", async () => {
    const config = buildTestConfig(3);
    const app = express();

    app.use(createRateLimitMiddleware(config, redisClient));
    app.post("/orders", (req, res) => {
      res.status(200).json({ ok: true });
    });

    const response = await request(app).post("/orders");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it("returns 429 if limit is exceeded", async () => {
    const config = buildTestConfig(2);
    const app = express();

    app.use(createRateLimitMiddleware(config, redisClient));
    app.post("/orders", (req, res) => {
      res.status(200).json({ ok: true });
    });

    await request(app).post("/orders").expect(200);
    await request(app).post("/orders").expect(200);
    const response = await request(app).post("/orders");

    expect(response.status).toBe(429);
    expect(response.body.error).toBe("Too Many Requests");
  });
});
