import {
  Entity,
  PrimaryColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Message } from './message.entity';
import { TopicISHistory } from './topic-is-history.entity';

@Entity('sessions')
@Index('idx_sessions_updated_at', ['updatedAt'])
@Index('idx_sessions_created_at', ['createdAt'])
export class Session {
  @PrimaryColumn('varchar', { length: 255 })
  id: string; // userId

  @Column('varchar', { length: 500 })
  title: string;

  @Column('text', { array: true })
  allTopics: string[];

  @Column('varchar', { length: 255 })
  currentTopic: string;

  @Column('integer', { default: 0 })
  currentTopicIndex: number;

  @Column('text', { default: '' })
  currentIS: string;

  @Column('text', { default: '' })
  lastAIResponse: string;

  @Column('integer', { default: 0 })
  stepCount: number;

  @Column('boolean', { default: false })
  rolePlayMode: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => Message, (message) => message.session, { cascade: true })
  messages: Message[];

  @OneToMany(
    () => TopicISHistory,
    (topicISHistory) => topicISHistory.session,
    { cascade: true },
  )
  topicISHistory: TopicISHistory[];
}
