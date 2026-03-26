import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// Load .env from current directory (Windows compatible)
dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'greenwin',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [
    'src/users/entities/*.entity.ts',
    'src/tasks/entities/*.entity.ts',
    'src/task-executions/entities/*.entity.ts',
    'src/checkpoints/entities/*.entity.ts',
  ],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: false,
});

export default AppDataSource;
