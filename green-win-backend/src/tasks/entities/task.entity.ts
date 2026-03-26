import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Project } from '../../projects/entities/project.entity';
import { TaskExecution } from '../../task-executions/entities/task-execution.entity';
import { Checkpoint } from '../../checkpoints/entities/checkpoint.entity';
import type { TaskStrategy } from '../../task-strategies/entities/task-strategy.entity';
import { TaskStatus, TaskCodeType } from '../enums/task.enums';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: TaskCodeType,
    default: TaskCodeType.LAMBDA,
  })
  codeType: TaskCodeType;

  @Column({ type: 'text', nullable: true })
  lambdaCode: string;

  @Column({ type: 'text', nullable: true })
  dockerImage: string;

  @Column('text', { array: true, nullable: true })
  allowedCloudProviders: string[];

  @Column('text', { array: true, nullable: true })
  allowedRegions: string[];

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.DRAFT,
  })
  status: TaskStatus;

  @Column({ type: 'timestamptz', nullable: true })
  earliestStartAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  latestFinishAt: Date;

  /**
   * Declares the parameters this task's lambda expects.
   * Example: [{ name: "recipient", type: "string", required: true }]
   */
  @Column({ type: 'jsonb', nullable: true })
  parameterSchema: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object';
    required?: boolean;
    default?: any;
    description?: string;
  }>;

  @ManyToOne(() => User, (user: User) => user.tasks, { onDelete: 'CASCADE' })
  owner: User;

  @ManyToOne(() => Project, (project) => project.tasks, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  project: Project;

  // String-based target breaks the circular import cycle with task-strategy.entity.ts
  @OneToMany('TaskStrategy', (s: any) => s.task)
  strategies: TaskStrategy[];

  @OneToMany(() => TaskExecution, (exec: TaskExecution) => exec.task)
  executions: TaskExecution[];

  @OneToMany(() => Checkpoint, (cp: Checkpoint) => cp.task)
  checkpoints: Checkpoint[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
