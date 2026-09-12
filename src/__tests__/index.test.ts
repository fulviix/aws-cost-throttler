import { describe, it, expect, afterEach } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import express from "express";
import request from "supertest";
import { createThrottler } from "../index.js";
import type { Throttler } from "../index.js";
import { createRedisClient } from "../core/redis-client.js";
import { after } from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, "throttler-test.config.yaml");

describe("createThrottler", () => {
  let throttler: Throttler | undefined;
  afterEach(async () => {
    if (throttler) {
      const cleanupClient = createRedisClient({
        host: "127.0.0.1",
        port: 6379,
      });
      const keys = await cleanupClient.keys("ratelimit:*");
      if (keys.length > 0) {
        await cleanupClient.del(...keys);
      }
      await cleanupClient.quit();
      await throttler.stop();
    }
    throttler = undefined;
  });

  it("read the config, connect to redis and create a working middleware", async () => {
    throttler = await createThrottler({ configPath });

    const app = express();
    app.use(throttler.middleware());
    app.post("/orders", (req, res) => res.status(200).json({ ok: true }));

    await request(app).post("/orders").expect(200);
    await request(app).post("/orders").expect(200);

    const response = await request(app).post("/orders");
    expect(response.status).toBe(429);
  });

  it("apply default limits to undefined routes", async () => {
    throttler = await createThrottler({ configPath });

    const app = express();
    app.use(throttler.middleware());
    app.get("/anything-else", (req, res) => res.status(200).json({ ok: true }));

    for (let i = 0; i < 5; i++) {
      await request(app).get("/anything-else").expect(200);
    }
  });

  it("stop() stops budgetMonitor and close redis connection", async () => {
    throttler = await createThrottler({ configPath });

    await expect(throttler.stop()).resolves.not.toThrow();

    throttler = undefined;
  });
});
