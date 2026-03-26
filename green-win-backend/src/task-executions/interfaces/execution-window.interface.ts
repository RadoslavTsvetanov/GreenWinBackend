export interface ExecutionWindow {
  startDate?: Date;
  endDate?: Date;
  executeAsap?: boolean; // If true, execute immediately on greenest server
  priority?: number; // Higher priority gets executed first in ASAP mode
}
