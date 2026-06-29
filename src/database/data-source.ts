import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { entities } from './entities';

/**
 * CLI data-source used only by the TypeORM migration commands. The runtime
 * connection is configured separately in app.module via forRootAsync so it
 * can read namespaced config. Both point at the same DATABASE_URL.
 */
const useSsl = process.env.NODE_ENV === 'production';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities,
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});
