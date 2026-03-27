export enum Periodicity {
  ONCE = 'once',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}
//this should be removed
// --- Legacy enums kept commented out for reference ---
export enum FiringStrategy {
  IMMEDIATELY = 'immediately',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
}

export const REPEATABLE_STRATEGIES = new Set<FiringStrategy>([
  FiringStrategy.DAILY,
  FiringStrategy.WEEKLY,
  FiringStrategy.MONTHLY,
  FiringStrategy.YEARLY,
  FiringStrategy.CUSTOM,
]);

export const STRATEGY_CRON: Partial<Record<FiringStrategy, string>> = {
  [FiringStrategy.DAILY]:   '0 3 * * *',
  [FiringStrategy.WEEKLY]:  '0 3 * * 1',
  [FiringStrategy.MONTHLY]: '0 3 1 * *',
  [FiringStrategy.YEARLY]:  '0 3 1 1 *',
};
