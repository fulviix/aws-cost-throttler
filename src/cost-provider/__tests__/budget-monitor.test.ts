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
});
