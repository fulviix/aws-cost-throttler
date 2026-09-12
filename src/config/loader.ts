import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { ZodError } from "zod";
import { rateLimiterConfigSchema, type RateLimiterConfig } from "./schema.js";

const DEFAULT_CONFIG_PATH = "./rate-limiter-config.yaml";

export class ConfigNotFoundError extends Error {
  constructor(path: string, cause: unknown) {
    super(`Impossible to read YAML file at ${path}`);
    ((this.name = "ConfigNotFoundError"), (this.cause = cause));
  }
}

export class ConfigValidationError extends Error {
  constructor(
    path: string,
    public readonly issues: ZodError["issues"],
  ) {
    const details = issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    super(`Configuration file "${path}" is not valid:\n${details}`);
    this.name = "ConfigValidationError";
  }
}

export function loadConfig(
  configPath: string = DEFAULT_CONFIG_PATH,
): RateLimiterConfig {
  const resolvedPath = resolve(configPath);
  let rawContent: string;
  let parsedYaml: unknown;
  try {
    rawContent = readFileSync(resolvedPath, "utf-8");
    parsedYaml = parseYaml(rawContent);
  } catch (error) {
    throw new ConfigNotFoundError(resolvedPath, error);
  }
  const result = rateLimiterConfigSchema.safeParse(parsedYaml);
  if (!result.success) {
    throw new ConfigValidationError(resolvedPath, result.error.issues);
  }
  return result.data;
}
