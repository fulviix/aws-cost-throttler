import type { CostProvider } from "./cost-provider-interface.js";
import type { BudgetThresholds } from "../config/schema.js";

export type BudgetState = "normal" | "warning" | "critical";

export class BudgetMonitor {
  private readonly provider: CostProvider;
  private readonly thresholds: BudgetThresholds;
  private readonly checkIntervalMs: number;
  private currentState: BudgetState = "normal";
  private intervalHandle: NodeJS.Timeout | undefined;

  constructor(
    provider: CostProvider,
    thresholds: BudgetThresholds,
    checkIntervalSeconds: number,
  ) {
    this.provider = provider;
    this.thresholds = thresholds;
    this.checkIntervalMs = checkIntervalSeconds * 1000;
  }

  private calculateState(percentUsed: number): BudgetState {
    if (percentUsed >= this.thresholds.critical) {
      return "critical";
    }
    if (percentUsed >= this.thresholds.warning) {
      return "warning";
    }
    return "normal";
  }

  async checkNow(): Promise<BudgetState> {
    const usage = await this.provider.getBudgetUsage();
    this.currentState = this.calculateState(usage.percentUsed);
    return this.currentState;
  }

  getCurrentState(): BudgetState {
    return this.currentState;
  }

  start(): void {
    if (this.intervalHandle) {
      return;
    }

    void this.checkNow();

    this.intervalHandle = setInterval(() => {
      void this.checkNow();
    }, this.checkIntervalMs);
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = undefined;
    }
  }
}
