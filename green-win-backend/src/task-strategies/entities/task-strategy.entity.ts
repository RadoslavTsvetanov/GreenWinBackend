import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Task } from '../../tasks/entities/task.entity';
import { FiringStrategy } from '../enums/firing-strategy.enum';

@Entity('task_strategies')
export class TaskStrategy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Task, (task) => task.strategies, { onDelete: 'CASCADE' })
  task: Task;

  /** When false the task cannot be activated or executed. */
  @Column({ default: true })
  isEnabled: boolean;

  @Column({ type: 'enum', enum: FiringStrategy })
  type: FiringStrategy;

  /** Only populated for CUSTOM strategies. */
  @Column({ type: 'text', nullable: true })
  cronExpression: string;

  /**
   * Runtime parameter values supplied when this strategy was activated.
   * Validated against the parent task's parameterSchema.
   * Example: { "recipient": "alice@example.com" }
   */
  @Column({ type: 'jsonb', nullable: true })
  parameters: Record<string, any>;

  /** True only for repeatable strategies that have been explicitly activated. */
  @Column({ default: false })
  isActive: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  activatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastFiredAt: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
