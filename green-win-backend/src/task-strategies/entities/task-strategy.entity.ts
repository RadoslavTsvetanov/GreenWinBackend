import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Task } from '../../tasks/entities/task.entity';
import { Periodicity } from '../enums/firing-strategy.enum';

@Entity('task_strategies')
export class TaskStrategy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Task, (task) => task.strategies, { onDelete: 'CASCADE' })
  task: Task;

  @Column({ type: 'enum', enum: Periodicity })
  periodicity: Periodicity;

  /**
   * Specific times of day (HH:mm UTC) — only for DAILY periodicity.
   * Multiple entries = multiple cron jobs per day.
   * Example: ["09:00", "14:30"]
   */
  @Column({ type: 'jsonb', nullable: true })
  times: string[];

  /**
   * Time ranges for ML-optimized scheduling.
   * - ONCE: single range, ML picks the greenest moment
   * - DAILY: multiple ranges allowed, ML picks per range
   * - WEEKLY/MONTHLY: single range allowed
   * Example: [{ "start": "08:00", "end": "16:00" }]
   */
  @Column({ type: 'jsonb', nullable: true })
  timeRanges: { start: string; end: string }[];

  /**
   * Single exact time (HH:mm UTC) — for ONCE, WEEKLY, or MONTHLY periodicity.
   * Example: "09:00"
   */
  @Column({ type: 'text', nullable: true })
  executionTime: string;

  /** Day of week (0=Sun, 1=Mon, ..., 6=Sat) — only for WEEKLY. */
  @Column({ type: 'smallint', nullable: true })
  dayOfWeek: number;

  /** Day of month (1-31) — only for MONTHLY. */
  @Column({ type: 'smallint', nullable: true })
  dayOfMonth: number;

  /** Optional raw cron expression — overrides all other scheduling fields. */
  @Column({ type: 'text', nullable: true })
  cronExpression: string;

  /**
   * Runtime parameter values supplied when this strategy was activated.
   * Validated against the parent task's parameterSchema.
   */
  @Column({ type: 'jsonb', nullable: true })
  parameters: Record<string, any>;

  /** True when the strategy has been activated and cron jobs are running. */
  @Column({ default: false })
  isActive: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  activatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastFiredAt: Date;

  // /** When false the task cannot be activated or executed. */
  // @Column({ default: true })
  // isEnabled: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
