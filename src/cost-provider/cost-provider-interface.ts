export interface BudgetUsage {
  percentUsed: number;
  spentUsd: number;
  limitUsd: number;
}

export interface CostProvider {
  getBudgetUsage(): Promise<BudgetUsage>;
}
