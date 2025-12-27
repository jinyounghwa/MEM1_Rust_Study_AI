import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Session } from './session.entity';

@Entity('topic_is_history')
@Unique(['sessionId', 'topic'])
export class TopicISHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 255 })
  sessionId: string;

  @Column('varchar', { length: 255 })
  topic: string;

  @Column('text')
  isSummary: string;

  @CreateDateColumn()
  completedAt: Date;

  // Relations
  @ManyToOne(() => Session, (session) => session.topicISHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sessionId' })
  session: Session;
}
