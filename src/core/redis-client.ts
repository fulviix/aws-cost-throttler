import { Redis } from "ioredis";
import type { RedisConfig } from "../config/schema.js";

export function createRedisClient(config: RedisConfig): Redis {
  const client = new Redis({
    host: config.host,
    port: config.port,
    retryStrategy(attempt) {
      const delayMs = Math.min(attempt * 100, 3000);
      return delayMs;
    },
  });
  client.on("error", (error) => {
    console.error("[redis] connection error: ", error.message);
  });
  return client;
}
