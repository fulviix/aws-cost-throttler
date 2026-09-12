import type { BudgetConfig } from "../config/schema.js";
import type { CostProvider } from "./cost-provider-interface.js";
import { MockCostProvider } from "./mock-cost-provider.js";
import { AWSCostProvider } from "./aws-cost-provider.js";

export function createCostProvider(budgetConfig: BudgetConfig): CostProvider {
  if (budgetConfig.provider === "mock") {
    return new MockCostProvider({
      limitUsd: budgetConfig.monthly_limit_usd,
    });
  }
  return new AWSCostProvider(budgetConfig);
}
