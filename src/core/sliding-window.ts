import { Redis } from "ioredis";
import { SLIDING_WINDOW_SCRIPT } from "./sliding-window-script.js"

export async function checkRateLimit(
  redisClient: Redis,
  clientId: string,
  routeKey: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const key = `ratelimit:${clientId}:${routeKey}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const result = await redisClient.eval(
    SLIDING_WINDOW_SCRIPT,
    1,
    key,
    now,
    windowMs,
    limit,
  );
  return result === 1;
}
