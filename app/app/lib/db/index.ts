import { drizzleRepo } from "./drizzle";
import type { PordeeRepo } from "./types";

export const repo: PordeeRepo = drizzleRepo;
export type { PordeeRepo } from "./types";
export type {
  Category,
  Goal,
  GoalContribution,
  Transaction,
  TransactionKind,
} from "./types";
