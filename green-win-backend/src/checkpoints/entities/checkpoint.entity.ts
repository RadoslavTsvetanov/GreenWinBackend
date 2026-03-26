import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Task } from '../../tasks/entities/task.entity';
import { TaskExecution } from '../../task-executions/entities/task-execution.entity';

@Entity('checkpoints')
export class Checkpoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Task, (task: Task) => task.checkpoints, {
    onDelete: 'CASCADE',
  })
  task: Task;

  @ManyToOne(() => TaskExecution, (exec: TaskExecution) => exec.checkpoints, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  execution: TaskExecution | null;

  @Column({ type: 'text' })
  uri: string; // storage location for the checkpoint (e.g., s3://..., gs://..., or local path)

  @Column({ type: 'int', nullable: true })
  step: number;

  @Column({ type: 'int', nullable: true })
  epoch: number;

  @Column({ type: 'jsonb', nullable: true })
  metrics: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
