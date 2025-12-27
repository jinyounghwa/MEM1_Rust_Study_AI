import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Session } from './session.entity';

@Entity('messages')
@Index('idx_messages_session_id', ['sessionId'])
@Index('idx_messages_session_created', ['sessionId', 'createdAt'])
@Index('idx_messages_role', ['role'])
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 255 })
  sessionId: string;

  @Column('varchar', { length: 20 })
  role: 'system' | 'user' | 'assistant';

  @Column('text')
  content: string;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => Session, (session) => session.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sessionId' })
  session: Session;
}
