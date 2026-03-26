import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Task } from '../../tasks/entities/task.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ nullable: true })
  name: string;

  @Column('text', {
    array: true,
    name: 'default_cloud_providers',
    nullable: true,
  })
  defaultCloudProviders: string[];

  @Column('text', { array: true, name: 'default_regions', nullable: true })
  defaultRegions: string[];

  @OneToMany(() => Task, (task: Task) => task.owner)
  tasks: Task[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
