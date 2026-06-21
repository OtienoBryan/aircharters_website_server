import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

export const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: ['dist/**/*.entity{.ts,.js}'],
  migrations: ['dist/database/migrations/*{.ts,.js}'],
  synchronize: false, // Disabled to prevent schema conflicts
  logging: process.env.NODE_ENV === 'development',
  charset: 'utf8mb4',
  timezone: '+00:00',
  
  // Connection Pooling Optimizations
  extra: {
    // Connection pool settings
    connectionLimit: 20,
    charset: 'utf8mb4_unicode_ci',
    
    // Connection management
    multipleStatements: false,
    dateStrings: true,
    
    // Performance optimizations
    supportBigNumbers: true,
    bigNumberStrings: true,
    
    // Connection health checks
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    
    // SSL/TLS Configuration for caching_sha2_password
    ssl: {
      rejectUnauthorized: false,
    },
  },
  
  // TypeORM specific optimizations
  maxQueryExecutionTime: 30000,
  cache: {
    duration: 30000,
  },
  
  // Migration settings
  migrationsRun: true,
  migrationsTableName: 'migrations',
});

export const getDataSource = (configService: ConfigService) => {
  return new DataSource({
    type: 'mysql',
    host: configService.get('DB_HOST'),
    port: configService.get('DB_PORT'),
    username: configService.get('DB_USERNAME'),
    password: configService.get('DB_PASSWORD'),
    database: configService.get('DB_DATABASE'),
    entities: ['dist/**/*.entity{.ts,.js}'],
    migrations: ['dist/database/migrations/*{.ts,.js}'],
    synchronize: false, // Disabled to prevent schema conflicts
    logging: configService.get('NODE_ENV') === 'development',
    charset: 'utf8mb4',
    timezone: '+00:00', 
    
    // Connection Pooling Optimizations
    extra: {
      // Connection pool settings
      connectionLimit: 20,
      charset: 'utf8mb4_unicode_ci',
      
      // Connection management
      multipleStatements: false,
      dateStrings: true,
      
      // Performance optimizations
      supportBigNumbers: true,
      bigNumberStrings: true,
      
      // Connection health checks
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      
      // SSL/TLS Configuration for caching_sha2_password
      ssl: {
        rejectUnauthorized: false,
      },
    },
    
    // TypeORM specific optimizations
    maxQueryExecutionTime: 30000,
    cache: {
      duration: 30000,
    },
    
    // Migration settings
    migrationsRun: true,
    migrationsTableName: 'migrations',
  });
}; 