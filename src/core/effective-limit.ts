import type { CostSensitivity } from "../config/schema.js";
import type { BudgetState } from "../cost-provider/budget-monitor.js";

const REDUCTION_FACTORS: Record<
  CostSensitivity,
  Record<BudgetState, number>
> = {
  low: {
    normal: 1,
    warning: 1,
    critical: 1,
  },
  medium: {
    normal: 1,
    warning: 0.7,
    critical: 0.5,
  },
  high: {
    normal: 1,
    warning: 0.5,
    critical: 0.1,
  },
};

export function calculateEffectiveLimit(
  baseLimit: number,
  costSensitivity: CostSensitivity,
  budgetState: BudgetState,
): number {
  const factor = REDUCTION_FACTORS[costSensitivity][budgetState];
  const effectiveLimit = Math.floor(baseLimit * factor);

  return Math.max(effectiveLimit, 1);
}
