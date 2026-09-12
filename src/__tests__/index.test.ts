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
const configPath = join(__dirname, "throttler-test.config.yml");

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
});
