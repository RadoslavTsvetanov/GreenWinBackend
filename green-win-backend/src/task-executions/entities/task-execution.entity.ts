import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Task } from '../../tasks/entities/task.entity';
import { Checkpoint } from '../../checkpoints/entities/checkpoint.entity';
import { ExecutionStatus } from '../enums/execution.enums';

@Entity('task_executions')
export class TaskExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Task, (task: Task) => task.executions, {
    onDelete: 'CASCADE',
  })
  task: Task;

  @Column({
    type: 'enum',
    enum: ExecutionStatus,
    default: ExecutionStatus.PENDING,
  })
  status: ExecutionStatus;

  @Column({ nullable: true })
  provider: string; // e.g., aws, gcp, azure

  @Column({ nullable: true })
  region: string; // e.g., eu-west-1

  @Column({ type: 'timestamptz', nullable: true })
  scheduledAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metrics: Record<string, any>; // emissions, energy_mix, cost, etc.

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'text', nullable: true })
  logsUri: string; // link to logs storage

  @OneToMany(() => Checkpoint, (cp: Checkpoint) => cp.execution)
  checkpoints: Checkpoint[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
