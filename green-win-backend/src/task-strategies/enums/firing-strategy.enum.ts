export enum Periodicity {
  ONCE = 'once',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}
<<<<<<< fix/simplifying-db
=======
//this should be removed
// --- Legacy enums kept commented out for reference ---
export enum FiringStrategy {
  IMMEDIATELY = 'immediately',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
  /** Recurring daily at one or more specific times (e.g. ["09:00","14:30"]). */
  DAILY_AT_TIMES = 'daily_at_times',
  /** Recurring daily — ML model picks the greenest moment inside one or more time ranges. */
  DAILY_IN_RANGE = 'daily_in_range',
}

export const REPEATABLE_STRATEGIES = new Set<FiringStrategy>([
  FiringStrategy.DAILY,
  FiringStrategy.WEEKLY,
  FiringStrategy.MONTHLY,
  FiringStrategy.YEARLY,
  FiringStrategy.CUSTOM,
  FiringStrategy.DAILY_AT_TIMES,
  FiringStrategy.DAILY_IN_RANGE,
]);

export const STRATEGY_CRON: Partial<Record<FiringStrategy, string>> = {
  [FiringStrategy.DAILY]:   '0 3 * * *',
  [FiringStrategy.WEEKLY]:  '0 3 * * 1',
  [FiringStrategy.MONTHLY]: '0 3 1 * *',
  [FiringStrategy.YEARLY]:  '0 3 1 1 *',
};
>>>>>>> develop
