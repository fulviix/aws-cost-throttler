import { describe, it, expect, vi, beforeEach } from "vitest";
import { AWSCostProvider } from "../aws-cost-provider.js";
import type { AwsBudgetConfig } from "../../config/schema.js";

const sendMock = vi.fn();

vi.mock("@aws-sdk/client-budgets", () => {
  return {
    BudgetsClient: vi.fn().mockImplementation(function () {
      return { send: sendMock };
    }),
    DescribeBudgetCommand: vi.fn().mockImplementation(function (input) {
      return input;
    }),
  };
});

function buildTestConfig(): AwsBudgetConfig {
  return {
    provider: "aws",
    monthly_limit_usd: 500,
    thresholds: { warning: 80, critical: 95 },
    check_interval_seconds: 60,
    aws_account_id: "123456789012",
    aws_budget_name: "test-budget",
    aws_region: "us-east-1",
  };
}

describe("AWSCostProvider", () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it("correctly calculate budgetUsage from valid AWS response", async () => {
    sendMock.mockResolvedValue({
      Budget: {
        BudgetLimit: { Amount: "500.0" },
        CalculatedSpend: {
          ActualSpend: { Amount: "410.0" },
        },
      },
    });

    const provider = new AWSCostProvider(buildTestConfig());
    const usage = await provider.getBudgetUsage();

    expect(usage.limitUsd).toBe(500);
    expect(usage.spentUsd).toBe(410);
    expect(usage.percentUsed).toBe(82);
  });

  it("calls DescribeBudgetCommand with the correct account and budget name", async () => {
    sendMock.mockResolvedValue({
      Budget: {
        BudgetLimit: { Amount: "500.0" },
        CalculatedSpend: { ActualSpend: { Amount: "0" } },
      },
    });

    const config = buildTestConfig();
    const provider = new AWSCostProvider(config);
    await provider.getBudgetUsage();

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        AccountId: "123456789012",
        BudgetName: "test-budget",
      }),
    );
  });

  it("throws a clear error if AWS returns no budgets", async () => {
    sendMock.mockResolvedValue({ Budget: undefined });

    const provider = new AWSCostProvider(buildTestConfig());

    await expect(provider.getBudgetUsage()).rejects.toThrow(
      /AWS did not return data/,
    );
  });

  it("throws a clear error if the budget limit is zero", async () => {
    sendMock.mockResolvedValue({
      Budget: {
        BudgetLimit: { Amount: "0" },
        CalculatedSpend: { ActualSpend: { Amount: "0" } },
      },
    });

    const provider = new AWSCostProvider(buildTestConfig());

    await expect(provider.getBudgetUsage()).rejects.toThrow(
      /limit is not valid or equal to zero/,
    );
  });

  it("propagates the error if the AWS call itself fails", async () => {
    sendMock.mockRejectedValue(new Error("Network error"));

    const provider = new AWSCostProvider(buildTestConfig());

    await expect(provider.getBudgetUsage()).rejects.toThrow("Network error");
  });
});
