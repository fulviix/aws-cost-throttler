import type { CostProvider, BudgetUsage } from "./cost-provider-interface.js";

export interface MockCostProviderOptions {
  limitUsd: number;
  initialPercentUsed?: number;
  averageIncrementPerCall?: number;
}

export class MockCostProvider implements CostProvider {
  private readonly limitUsd: number;
  private readonly averageIncrementPerCall: number;
  private currentPercentUsed: number;

  constructor(options: MockCostProviderOptions) {
    this.limitUsd = options.limitUsd;
    this.currentPercentUsed = options.initialPercentUsed ?? 0;
    this.averageIncrementPerCall = options.averageIncrementPerCall ?? 0;
  }

  async getBudgetUsage(): Promise<BudgetUsage> {
    if (this.averageIncrementPerCall > 0) {
      const increment = Math.random() * this.averageIncrementPerCall * 2;
      this.currentPercentUsed += increment;
    }

    const spentUsd = (this.currentPercentUsed / 100) * this.limitUsd;

    return {
      percentUsed: this.currentPercentUsed,
      spentUsd,
      limitUsd: this.limitUsd,
    };
  }

  setUsagePercent(percent: number): void {
    this.currentPercentUsed = percent;
  }
}