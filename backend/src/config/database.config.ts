import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Session } from '../modules/database/entities/session.entity';
import { Message } from '../modules/database/entities/message.entity';
import { TopicISHistory } from '../modules/database/entities/topic-is-history.entity';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'rustlearn_mem1',
  entities: [Session, Message, TopicISHistory],
  synchronize: process.env.DB_SYNCHRONIZE === 'true' || true,
  logging: process.env.DB_LOGGING === 'true' || false,
  ssl:
    process.env.NODE_ENV === 'production'
      ? {
          rejectUnauthorized: false,
        }
      : false,
};
