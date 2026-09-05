# aws-cost-throttler

High-performance Redis-backed rate limiter for Express, with dynamic
AWS-budget-aware throttling.

> **Status: early development.** This package is not yet published or
> functional end-to-end. See [Development status](#development-status) below
> for what's implemented so far.

## What it does

`aws-cost-throttler` combines two things in a single Express middleware:

1. **Fast rate limiting** — a sliding-window counter backed by Redis (atomic
   via Lua scripting) enforces per-route request limits.
2. **Dynamic cost protection** — a background worker polls your AWS budget
   status (via CloudWatch/Budgets, or a local mock during development) and
   automatically tightens rate limits on cost-sensitive routes when your
   budget usage crosses configurable thresholds.

Everything is configured through a single YAML file — no code changes needed
to adjust limits or budget thresholds.

## Configuration

Create a `rate-limiter.config.yml` in your project root:

```yaml
redis:
  host: 127.0.0.1
  port: 6379

budget:
  provider: mock          # "mock" for local dev, "aws" in production
  monthly_limit_usd: 500
  thresholds:
    warning: 80           # percent of budget used
    critical: 95
  check_interval_seconds: 60

routes:
  - path: /api/orders
    method: POST
    limit: 100
    window_seconds: 60
    cost_sensitivity: high   # aggressively throttled when budget is tight

  - path: /api/products
    method: GET
    limit: 1000
    window_seconds: 60
    cost_sensitivity: low    # barely affected by budget pressure

default:
  limit: 200
  window_seconds: 60
  cost_sensitivity: medium   # applied to any route not listed above
```

### How `cost_sensitivity` works

When the budget status moves to `warning` or `critical`, each route's limit
is reduced by a factor based on its `cost_sensitivity`:

| Sensitivity | Reduction when budget is tight |
|---|---|
| `high`   | ~90% reduction |
| `medium` | ~50% reduction |
| `low`    | unaffected |

This lets you keep cheap, low-risk endpoints fully available while
aggressively protecting expensive ones when your AWS spend is close to its
monthly limit.

## Usage (target API — not yet implemented)

```typescript
import express from "express";
import { createThrottler } from "aws-cost-throttler";

const app = express();

const throttler = await createThrottler({
  configPath: "./rate-limiter.config.yml",
});

app.use(throttler.middleware());

app.post("/api/orders", (req, res) => { /* ... */ });
app.get("/api/products", (req, res) => { /* ... */ });

app.listen(3000);
```

In production, switch `budget.provider` from `mock` to `aws` in the YAML —
no code changes required.

## Development status

- [x] Project scaffolding (`package.json`, `tsconfig.json`,
      `docker-compose.yml`)
- [x] Local Redis via Docker
- [x] Zod schema for `rate-limiter.config.yml` (`src/config/schema.ts`)
- [ ] YAML config loader/validator (`src/config/loader.ts`)
- [ ] Redis sliding-window rate limiter (Lua script)
- [ ] Express middleware
- [ ] `CostProvider` interface
- [ ] `MockCostProvider` (local budget simulation)
- [ ] `AWSCostProvider` (real AWS SDK v3 integration)
- [ ] Dynamic threshold adjustment based on `cost_sensitivity`
- [ ] Tests (Vitest + Supertest)
- [ ] Public `createThrottler()` API
- [ ] npm publish

## Local development

Requires Node.js >= 20 and Docker.

```bash
npm install
docker compose up -d          # starts Redis on localhost:6379
docker exec -it aws-throttler-redis redis-cli ping   # should print PONG
```

## Tech stack

- TypeScript (strict)
- Express.js
- Redis (`ioredis`, Lua scripting for atomicity)
- AWS SDK v3 (`@aws-sdk/client-cloudwatch`, `@aws-sdk/client-budgets`)
- `zod` + `yaml` for config parsing and validation
- `tsup` for bundling
- Vitest + Supertest for testing

## License

MIT