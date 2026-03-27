export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELED = 'canceled',
  TIMED_OUT = 'timed_out',
  RETRYING = 'retrying',
}

// --- Commented out: periodicity belongs on the strategy, not the execution ---
// export enum TaskPeriodicity {
//   ONCE = 'once',
//   DAILY = 'daily',
//   WEEKLY = 'weekly',
//   MONTHLY = 'monthly',
//   QUARTERLY = 'quarterly',
//   YEARLY = 'yearly',
//   CUSTOM = 'custom',
// }
