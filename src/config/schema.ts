import { z } from "zod";

export const costSensitivitySchema = z.enum(["low", "medium", "high"]);
export type CostSensitivity = z.infer<typeof costSensitivitySchema>;

export const httpMethodSchema = z.enum([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "HEAD",
]);
export type HttpMethod = z.infer<typeof httpMethodSchema>;

export const redisConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive(),
});
export type RedisConfig = z.infer<typeof redisConfigSchema>;

export const budgetThresholdsSchema = z
  .object({
    warning: z.number().min(0).max(100),
    critical: z.number().min(0).max(100),
  })
  .refine((t) => t.warning < t.critical, {
    message: "warning value must be less than critical",
    path: ["warning"],
  });
export type BudgetThresholds = z.infer<typeof budgetThresholdsSchema>;

const BudgetCommonFields = {
  monthly_limit_usd: z.number().positive(),
  thresholds: budgetThresholdsSchema,
  check_interval_seconds: z.number().int().positive(),
};

const mockBudgetConfigSchema = z.object({
  provider: z.literal("mock"),
  ...BudgetCommonFields,
});

const awsBudgetConfigSchema = z.object({
  provider: z.literal("aws"),
  ...BudgetCommonFields,
  aws_account_id: z.string().regex(/^\d{12}$/, {
    message: "aws_account_id must be an AWS account ID with 12 chars",
  }),
  aws_budget_name: z.string().min(1),
  aws_region: z.string().min(1),
});
export type AwsBudgetConfig = z.infer<typeof awsBudgetConfigSchema>;

export const budgetConfigSchema = z.discriminatedUnion("provider", [
  mockBudgetConfigSchema,
  awsBudgetConfigSchema,
]);
export type BudgetConfig = z.infer<typeof budgetConfigSchema>;

export const routeConfigSchema = z.object({
  path: z.string().min(1).startsWith("/"),
  method: httpMethodSchema,
  limit: z.number().int().positive(),
  window_seconds: z.number().int().positive(),
  cost_sensitivity: costSensitivitySchema,
});
export type RouteConfig = z.infer<typeof routeConfigSchema>;

export const defaultRouteConfigSchema = z.object({
  limit: z.number().int().positive(),
  window_seconds: z.number().int().positive(),
  cost_sensitivity: costSensitivitySchema,
});
export type DefaultRouteConfig = z.infer<typeof defaultRouteConfigSchema>;

export const rateLimiterConfigSchema = z.object({
  redis: redisConfigSchema,
  budget: budgetConfigSchema,
  routes: z.array(routeConfigSchema),
  default: defaultRouteConfigSchema,
});
export type RateLimiterConfig = z.infer<typeof rateLimiterConfigSchema>;
