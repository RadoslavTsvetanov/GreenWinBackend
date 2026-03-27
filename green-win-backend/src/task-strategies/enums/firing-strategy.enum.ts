export enum FiringStrategy {
  IMMEDIATELY = 'immediately',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
}

/** Strategies that keep a cron job alive until explicitly deactivated. */
export const REPEATABLE_STRATEGIES = new Set<FiringStrategy>([
  FiringStrategy.DAILY,
  FiringStrategy.WEEKLY,
  FiringStrategy.MONTHLY,
  FiringStrategy.YEARLY,
  FiringStrategy.CUSTOM,
]);

/** Default cron expressions (3 AM UTC — lowest grid carbon demand). */
export const STRATEGY_CRON: Partial<Record<FiringStrategy, string>> = {
  [FiringStrategy.DAILY]:   '0 3 * * *',
  [FiringStrategy.WEEKLY]:  '0 3 * * 1',
  [FiringStrategy.MONTHLY]: '0 3 1 * *',
  [FiringStrategy.YEARLY]:  '0 3 1 1 *',
};
