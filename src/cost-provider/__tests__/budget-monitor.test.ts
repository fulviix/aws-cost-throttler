import { describe, it, expect, afterEach } from "vitest";
import { BudgetMonitor } from "../budget-monitor.js";
import { MockCostProvider } from "../mock-cost-provider.js";

describe("BudgetMonitor", () => {
  let monitor: BudgetMonitor | undefined;

  afterEach(() => {
    monitor?.stop();
    monitor = undefined;
  });

  it("start with normal state before any check", () => {
    const provider = new MockCostProvider({ limitUsd: 5000 });
    monitor = new BudgetMonitor(provider, { warning: 70, critical: 90 }, 60);

    expect(monitor.getCurrentState()).toBe("normal");
  });

  it("state stay normal if used budget is under warning threshold", async () => {
    const provider = new MockCostProvider({
      limitUsd: 5000,
      initialPercentUsed: 50,
    });
    monitor = new BudgetMonitor(provider, { warning: 70, critical: 90 }, 60);

    const state = await monitor.checkNow();

    expect(state).toBe("normal");
    expect(monitor.getCurrentState()).toBe("normal");
  });
});
