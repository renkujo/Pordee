import { mockRepo } from "./mock";
import type { PordeeRepo } from "./types";

export const repo: PordeeRepo = mockRepo;
export type { PordeeRepo } from "./types";
export type {
  Category,
  Goal,
  GoalContribution,
  Transaction,
  TransactionKind,
} from "./types";
