import { describe, it, expect, afterEach } from "vitest";
import type { Redis } from "ioredis";
import { createRedisClient } from "../redis-client.js";
import { checkRateLimit } from "../sliding-window.js";

describe("checkRateLimit", () => {
  let client: Redis | undefined;
  afterEach(async () => {
    if (client) {
      const keys = await client.keys("ratelimit:test-*");
      if (keys.length > 0) {
        await client.del(...keys);
      }
      await client.quit();
    }
    client = undefined;
  });
  it("accept reqs till under the limit", async () => {
    client = createRedisClient({ host: "127.0.0.1", port: 6379 });
    const clientId = "test-client-under-limit";
    const routeKey = "GET:/test";
    const limit = 3;
    const windowSeconds = 60;

    const first = await checkRateLimit(
      client,
      clientId,
      routeKey,
      limit,
      windowSeconds,
    );
    const second = await checkRateLimit(
      client,
      clientId,
      routeKey,
      limit,
      windowSeconds,
    );
    const third = await checkRateLimit(
      client,
      clientId,
      routeKey,
      limit,
      windowSeconds,
    );

    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(third).toBe(true);
  });

  it("should reject the req if its over the limit", async () => {
    client = createRedisClient({ host: "127.0.0.1", port: 6379 });
    const clientId = "test-client-under-limit";
    const routeKey = "GET:/test";
    const limit = 3;
    const windowSeconds = 60;

    await checkRateLimit(client, clientId, routeKey, limit, windowSeconds);
    await checkRateLimit(client, clientId, routeKey, limit, windowSeconds);
    await checkRateLimit(client, clientId, routeKey, limit, windowSeconds);
    const fourth = await checkRateLimit(
      client,
      clientId,
      routeKey,
      limit,
      windowSeconds,
    );

    expect(fourth).toBe(false);
  });

  it("raw value output of redis client its a real number and not a string", async () => {
    client = createRedisClient({ host: "127.0.0.1", port: 6379 });

    const { SLIDING_WINDOW_SCRIPT } =
      await import("../sliding-window-script.js");

    const rawResult = await client.eval(
      SLIDING_WINDOW_SCRIPT,
      1,
      "ratelimit:test-raw-check",
      Date.now(),
      60000,
      10,
    );

    expect(typeof rawResult).toBe("number");
    expect(rawResult).toBe(1);
  });
});
