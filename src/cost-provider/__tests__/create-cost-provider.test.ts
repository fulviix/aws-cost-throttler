import { describe, it, expect, vi } from "vitest";
import { createCostProvider } from "../create-cost-provider.js";
import { MockCostProvider } from "../mock-cost-provider.js";
import { AWSCostProvider } from "../aws-cost-provider.js";
import type { BudgetConfig } from "../../config/schema.js";

vi.mock("@aws-sdk/client-budgets", () => {
  return {
    BudgetsClient: vi.fn().mockImplementation(function () {
      return { send: vi.fn() };
    }),
    DescribeBudgetCommand: vi.fn().mockImplementation(function (input) {
      return input;
    }),
  };
});

describe("createCostProvider", () => {
  it("provider: mock is istance of MockCostProvider", async () => {
    const config: BudgetConfig = {
      provider: "mock",
      monthly_limit_usd: 1000,
      thresholds: { warning: 80, critical: 95 },
      check_interval_seconds: 60,
    };

    const provider = createCostProvider(config);

    expect(provider).toBeInstanceOf(MockCostProvider);
  });

  it("provider: aws is istance of AWSCostProvider", async () => {
    const config: BudgetConfig = {
      provider: "aws",
      monthly_limit_usd: 1000,
      thresholds: { warning: 80, critical: 95 },
      check_interval_seconds: 60,
      aws_account_id: "123456789012",
      aws_budget_name: "test-budget",
      aws_region: "eu-south-1",
    };

    const provider = createCostProvider(config);

    expect(provider).toBeInstanceOf(AWSCostProvider);
  });
});
