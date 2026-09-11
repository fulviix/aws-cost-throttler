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

  it("budgetstate is warning when budget exceed warning threshold", async () => {
    const provider = new MockCostProvider({
      limitUsd: 5000,
      initialPercentUsed: 85,
    });
    monitor = new BudgetMonitor(provider, { warning: 70, critical: 90 }, 60);

    const state = await monitor.checkNow();

    expect(state).toBe("warning");
  });

  it("budgetstate is critical when budget exceed critical threshold", async () => {
    const provider = new MockCostProvider({
      limitUsd: 5000,
      initialPercentUsed: 99,
    });
    monitor = new BudgetMonitor(provider, { warning: 70, critical: 90 }, 60);

    const state = await monitor.checkNow();

    expect(state).toBe("critical");
  });

  it("budgetstate is critical when budget is exactly critical threshold", async () => {
    const provider = new MockCostProvider({
      limitUsd: 5000,
      initialPercentUsed: 90,
    });
    monitor = new BudgetMonitor(provider, { warning: 70, critical: 90 }, 60);

    const state = await monitor.checkNow();

    expect(state).toBe("critical");
  });

  it("getCurrentState() reflects last checkNow() without calling again the provider", async () => {
    const provider = new MockCostProvider({
      limitUsd: 500,
      initialPercentUsed: 10,
    });
    monitor = new BudgetMonitor(provider, { warning: 80, critical: 95 }, 60);

    await monitor.checkNow();
    expect(monitor.getCurrentState()).toBe("normal");

    provider.setUsagePercent(96);
    expect(monitor.getCurrentState()).toBe("normal");

    await monitor.checkNow();
    expect(monitor.getCurrentState()).toBe("critical");
  });

  it("start() check now without waiting the first interval", async () => {
    const provider = new MockCostProvider({
      limitUsd: 500,
      initialPercentUsed: 90,
    });
    monitor = new BudgetMonitor(provider, { warning: 80, critical: 95 }, 3600);

    monitor.start();

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(monitor.getCurrentState()).toBe("warning");
  });
});
