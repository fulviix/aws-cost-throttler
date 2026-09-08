import { describe, it, afterEach, expect } from "vitest";
import { Redis } from "ioredis";
import { createRedisClient } from "../redis-client.js";
describe("createRedisClient", () => {
  let client: Redis | undefined;
  afterEach(async () => {
    await client?.quit();
    client = undefined;
  });
  it("it can write and read a test key", async () => {
    client = createRedisClient({ host: "127.0.0.1", port: 6379 });
    await client.set("test:connection", "ok");
    const value = await client.get("test:connection");
    expect(value).toBe("ok");
    await client.del("test:connection");
  });
});
