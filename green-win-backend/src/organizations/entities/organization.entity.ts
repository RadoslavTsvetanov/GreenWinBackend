import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  contactPerson: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  address: string;

  // Emissions and sustainability parameters
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  monthlyEmissionsTarget: number; // in kg CO2

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    nullable: true,
  })
  currentMonthEmissions: number; // in kg CO2

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    nullable: true,
  })
  totalEmissions: number; // cumulative emissions in kg CO2

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  annualEmissionsTarget: number; // in kg CO2

  @Column({ type: 'int', default: 0 })
  totalTasksExecuted: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    nullable: true,
  })
  totalEnergySaved: number; // in kWh

  @Column({ type: 'jsonb', nullable: true })
  emissionsMetadata: Record<string, any>; // Additional emissions tracking data

  @Column('text', { array: true, nullable: true })
  preferredCloudProviders: string[];

  @Column('text', { array: true, nullable: true })
  preferredRegions: string[];

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Project, (project) => project.organization)
  projects: Project[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
