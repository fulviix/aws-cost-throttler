# aws-cost-throttler

High-performance Redis-backed rate limiter for Express, with dynamic
AWS-budget-aware throttling.

Combines a sliding-window rate limiter (Redis + Lua, atomic, no race
conditions) with a background budget monitor that automatically tightens
rate limits on cost-sensitive routes as your AWS spend approaches its
monthly limit — all configured through a single YAML file.

## Features

- **Sliding-window rate limiting** via Redis and a Lua script, safe under
  concurrent requests.
- **Dynamic, budget-aware throttling**: routes marked as cost-sensitive get
  automatically throttled harder as your AWS budget usage approaches its
  limit.
- **Pluggable cost providers**: a local mock for development (no AWS
  account needed) and a real AWS Budgets integration for production.
- **Single YAML configuration file** — no code changes needed to adjust
  limits or budget thresholds.

## Installation

```bash
npm install aws-cost-throttler
```

Requires Node.js >= 20, Express 4 or 5, and a reachable Redis instance.

## Quick start

### 1. Create a configuration file

Create `rate-limiter.config.yml` in your project root:

```yaml
redis:
  host: 127.0.0.1
  port: 6379

budget:
  provider: mock # "mock" for local dev, "aws" in production
  monthly_limit_usd: 500
  thresholds:
    warning: 80 # percent of budget used
    critical: 95
  check_interval_seconds: 60

routes:
  - path: /api/orders
    method: POST
    limit: 100
    window_seconds: 60
    cost_sensitivity: high # throttled aggressively when budget is tight

  - path: /api/products
    method: GET
    limit: 1000
    window_seconds: 60
    cost_sensitivity: low # barely affected by budget pressure

default:
  limit: 200
  window_seconds: 60
  cost_sensitivity: medium # applied to any route not listed above
```

### 2. Apply the middleware

```typescript
import express from "express";
import { createThrottler } from "aws-cost-throttler";

const app = express();

const throttler = await createThrottler({
  configPath: "./rate-limiter.config.yml",
});

app.use(throttler.middleware());

app.post("/api/orders", (req, res) => {
  /* ... */
});
app.get("/api/products", (req, res) => {
  /* ... */
});

app.listen(3000);

// On shutdown, stop the background budget monitor and close the
// Redis connection cleanly:
process.on("SIGTERM", async () => {
  await throttler.stop();
  process.exit(0);
});
```

That's it — every request is now checked against Redis (fast path) and
against the current budget state (background path), with no further code
required.

## Configuration reference

### `redis`

| Field  | Type   | Description |
| ------ | ------ | ----------- |
| `host` | string | Redis host  |
| `port` | number | Redis port  |

### `budget`

The `provider` field determines which fields are required.

**`provider: mock`** — for local development, no AWS account needed:

```yaml
budget:
  provider: mock
  monthly_limit_usd: 500
  thresholds:
    warning: 80
    critical: 95
  check_interval_seconds: 60
```

**`provider: aws`** — for production, requires an AWS Budget already
created via the AWS console or Infrastructure as Code:

```yaml
budget:
  provider: aws
  monthly_limit_usd: 500
  thresholds:
    warning: 80
    critical: 95
  check_interval_seconds: 300
  aws_account_id: "123456789012" # 12-digit AWS account ID
  aws_budget_name: "monthly-spend" # name of an existing AWS Budget
  aws_region: "us-east-1"
```

AWS credentials are resolved automatically by the AWS SDK's standard
credential chain (environment variables, `~/.aws/credentials`, an IAM role
if running on AWS, etc.) — they are never passed directly in the YAML
file.

| Field                    | Type              | Required for     | Description                                                     |
| ------------------------ | ----------------- | ----------------- | ----------------------------------------------------------------- |
| `provider`               | `"mock" \| "aws"` | always             | Which cost provider to use                                        |
| `monthly_limit_usd`      | number             | always             | Monthly budget limit, in USD                                      |
| `thresholds.warning`     | number (0-100)     | always             | Percent usage that triggers the "warning" state                   |
| `thresholds.critical`    | number (0-100)     | always             | Percent usage that triggers the "critical" state                  |
| `check_interval_seconds` | number             | always             | How often the background monitor checks the budget                |
| `aws_account_id`         | string             | `provider: aws`   | 12-digit AWS account ID                                           |
| `aws_budget_name`        | string             | `provider: aws`   | Name of an existing budget in AWS Budgets                         |
| `aws_region`             | string             | `provider: aws`   | AWS region to query                                                |

### `routes` (array) and `default`

| Field              | Type                          | Description                                                     |
| ------------------ | ----------------------------- | ----------------------------------------------------------------- |
| `path`             | string                         | Route path (only in `routes`, not in `default`)                    |
| `method`           | HTTP method                    | Route method (only in `routes`, not in `default`)                  |
| `limit`            | number                         | Max requests allowed in the window                                  |
| `window_seconds`   | number                         | Sliding window duration, in seconds                                  |
| `cost_sensitivity` | `"low" \| "medium" \| "high"` | How aggressively this route is throttled under budget pressure       |

Any route not explicitly listed in `routes` falls back to `default`.

### How `cost_sensitivity` interacts with budget state

The background monitor periodically checks the current budget usage and
computes a global state: `normal`, `warning`, or `critical`. Each route's
effective limit is then reduced by a factor depending on the combination
of its `cost_sensitivity` and the current budget state:

| `cost_sensitivity` | Warning state | Critical state |
| ------------------- | -------------- | --------------- |
| `low`                | no reduction   | no reduction    |
| `medium`             | -30%           | -50%            |
| `high`               | -50%           | -90%            |

The effective limit is always at least 1, even at maximum reduction.

These reduction factors are fixed and not currently configurable — only
the `cost_sensitivity` assigned to each route, and the `warning`/`critical`
thresholds themselves, can be adjusted via the YAML file.

## API

### `createThrottler(options)`

```typescript
const throttler = await createThrottler({
  configPath: "./rate-limiter.config.yml", // optional, defaults to this path
});
```

Returns a `Throttler` object:

- **`throttler.middleware()`** — returns an Express `RequestHandler`,
  ready to be passed to `app.use(...)`.
- **`throttler.stop()`** — stops the background budget monitor and closes
  the Redis connection. Call this during a graceful shutdown.

## Behind a reverse proxy or load balancer

This package identifies clients using `req.ip`. If your application runs
behind a reverse proxy or load balancer (common in production), make sure
to configure Express's `trust proxy` setting appropriately in **your own**
app — otherwise every request may appear to come from the same IP (the
proxy's), or, if configured too permissively, an attacker could spoof
their IP and bypass rate limiting entirely.

```typescript
// Only if your app is exclusively reachable through a trusted proxy:
app.set("trust proxy", true);

// Safer: trust only your specific proxy/load balancer:
app.set("trust proxy", "10.0.1.5");
```

See the [Express documentation on `trust proxy`](https://expressjs.com/en/guide/behind-proxies.html)
for guidance specific to your infrastructure.

## Local development

Requires Node.js >= 20 and Docker.

```bash
npm install
npm run redis:up          # starts Redis on localhost:6379 via Docker
npm run test               # runs the full test suite
npm run build               # builds dist/ (ESM output + bundled Lua script)
```

## Tech stack

- TypeScript (strict mode)
- Express.js
- Redis (`ioredis`, Lua scripting for atomicity)
- AWS SDK v3 (`@aws-sdk/client-budgets`)
- `zod` + `yaml` for config parsing and validation
- `tsup` for bundling
- Vitest + Supertest for testing

## License

MIT