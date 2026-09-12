import { BudgetsClient, DescribeBudgetCommand } from "@aws-sdk/client-budgets";
import type { CostProvider, BudgetUsage } from "./cost-provider-interface.js";
import type { AwsBudgetConfig } from "../config/schema.js";

export class AWSCostProvider implements CostProvider {
  private readonly client: BudgetsClient;
  private readonly accountId: string;
  private readonly budgetName: string;
  constructor(config: AwsBudgetConfig) {
    this.client = new BudgetsClient({ region: config.aws_region });
    this.accountId = config.aws_account_id;
    this.budgetName = config.aws_budget_name;
  }

  async getBudgetUsage(): Promise<BudgetUsage> {
    const command = new DescribeBudgetCommand({
      AccountId: this.accountId,
      BudgetName: this.budgetName,
    });

    const response = await this.client.send(command);
    const budget = response.Budget;

    if (!budget) {
      throw new Error(
        `AWS did not return data for the budget ${this.budgetName}` +
          `account: ${this.accountId} verify that the name is correct` +
          `and that ht ebudget exists on AWS Budgets.`,
      );
    }

    const limitUsd = Number(budget.BudgetLimit?.Amount ?? "0");
    const spentUsd = Number(budget.CalculatedSpend?.ActualSpend?.Amount ?? "0");

    if (limitUsd <= 0) {
      throw new Error(
        `the budget ${this.budgetName} is not valid or equal to zero`,
      );
    }

    const percentUsed = (spentUsd / limitUsd) * 100;

    return { percentUsed, spentUsd, limitUsd };
  }
}
