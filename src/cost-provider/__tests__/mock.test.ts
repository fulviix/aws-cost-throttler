import { describe, it, expect } from "vitest";
import { MockCostProvider } from "../mock-cost-provider.js";

describe("MockCostProvider", () => {
  it("starts from configurated value", async () => {
    const provider = new MockCostProvider({
      limitUsd: 500,
      initialPercentUsed: 30,
    });

    const usage = await provider.getBudgetUsage();

    expect(usage.limitUsd).toBe(500);
    expect(usage.percentUsed).toBe(30);
  });

  it("calculate spentUsd from percentUsed", async () => {
    const provider = new MockCostProvider({
      limitUsd: 500,
      initialPercentUsed: 50,
    });

    const usage = await provider.getBudgetUsage();

    expect(usage.spentUsd).toBe(250);
  });

  it("spentUsd is 0 if percentUsed is 0", async () => {
    const provider = new MockCostProvider({ limitUsd: 500 });

    const usage = await provider.getBudgetUsage();

    expect(usage.percentUsed).toBe(0);
    expect(usage.spentUsd).toBe(0);
  });

  it("percentUsage grows when averageIncrementPerCall is set", async () => {
    const provider = new MockCostProvider({
      limitUsd: 500,
      initialPercentUsed: 0,
      averageIncrementPerCall: 5,
    });

    const first = await provider.getBudgetUsage();
    const second = await provider.getBudgetUsage();
    const third = await provider.getBudgetUsage();

    expect(second.percentUsed).toBeGreaterThan(first.percentUsed);
    expect(third.percentUsed).toBeGreaterThan(second.percentUsed);
  });

  it("percentUsage does not grow when averageIncrementPerCall is not set", async () => {
    const provider = new MockCostProvider({
      limitUsd: 500,
      initialPercentUsed: 50,
    });

    const first = await provider.getBudgetUsage();
    const second = await provider.getBudgetUsage();

    expect(first.percentUsed).toBe(50);
    expect(second.percentUsed).toBe(50);
  });
});
