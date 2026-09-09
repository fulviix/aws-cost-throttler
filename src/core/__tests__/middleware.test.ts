import { describe, it, expect, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import type { Redis } from "ioredis";
import type { RateLimiterConfig } from "../../config/schema.js";
import { createRedisClient } from "../redis-client.js";
import { createRateLimitMiddleware } from "../middleware.js";
