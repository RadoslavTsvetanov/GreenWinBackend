import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { Task } from '../../tasks/entities/task.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => Organization, (org) => org.projects, {
    onDelete: 'CASCADE',
  })
  organization: Organization;

  @OneToMany(() => Task, (task) => task.project)
  tasks: Task[];

  // Emissions tracking for this project
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  emissionsTarget: number; // in kg CO2

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  currentEmissions: number; // in kg CO2

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalCostSavings: number; // in USD or default currency

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalEnergySaved: number; // in kWh

  @Column({ type: 'int', default: 0 })
  completedTasks: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // Additional project metadata

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
