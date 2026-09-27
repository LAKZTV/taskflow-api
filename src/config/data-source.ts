import { DataSource, DataSourceOptions } from 'typeorm';
import { config as loadEnv } from 'dotenv';

loadEnv();

/**
 * Single source of truth for TypeORM configuration.
 * Used by AppModule at runtime and by the TypeORM CLI for migrations.
 * NOTE: `synchronize` is permanently false — schema changes go through migrations.
 */
export function buildDataSourceOptions(): DataSourceOptions {
  return {
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USER ?? 'poonsuk',
    password: process.env.DB_PASSWORD ?? 'poonsuk_dev_password',
    database: process.env.DB_NAME ?? 'poonsuk',
    entities: [__dirname + '/../modules/**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    synchronize: false,
    logging: process.env.NODE_ENV !== 'production' ? ['error', 'warn'] : ['error'],
  };
}

export default new DataSource(buildDataSourceOptions());
