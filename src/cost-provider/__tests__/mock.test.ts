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
});
