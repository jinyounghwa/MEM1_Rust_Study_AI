import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from '../../config/database.config';
import { Session } from './entities/session.entity';
import { Message } from './entities/message.entity';
import { TopicISHistory } from './entities/topic-is-history.entity';
import { SessionRepository } from './repositories/session.repository';
import { MessageRepository } from './repositories/message.repository';
import { TopicISHistoryRepository } from './repositories/topic-is-history.repository';

@Module({
  imports: [TypeOrmModule.forRoot(databaseConfig), TypeOrmModule.forFeature([Session, Message, TopicISHistory])],
  providers: [SessionRepository, MessageRepository, TopicISHistoryRepository],
  exports: [SessionRepository, MessageRepository, TopicISHistoryRepository],
})
export class DatabaseModule {}
