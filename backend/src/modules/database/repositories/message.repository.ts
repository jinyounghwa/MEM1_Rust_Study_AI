import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../entities/message.entity';

@Injectable()
export class MessageRepository {
  constructor(
    @InjectRepository(Message)
    private readonly repository: Repository<Message>,
  ) {}

  /**
   * Save a new message
   */
  async save(message: Partial<Message>): Promise<Message> {
    return this.repository.save(message);
  }

  /**
   * Find all messages for a session (ordered by creation time)
   */
  async findBySessionId(sessionId: string): Promise<Message[]> {
    return this.repository.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Find latest message of a session
   */
  async findLatest(sessionId: string): Promise<Message | null> {
    return this.repository.findOne({
      where: { sessionId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Count messages in a session
   */
  async countBySessionId(sessionId: string): Promise<number> {
    return this.repository.count({ where: { sessionId } });
  }

  /**
   * Delete all messages for a session
   */
  async deleteBySessionId(sessionId: string): Promise<void> {
    await this.repository.delete({ sessionId });
  }

  /**
   * Get messages by role
   */
  async findBySessionIdAndRole(
    sessionId: string,
    role: 'system' | 'user' | 'assistant',
  ): Promise<Message[]> {
    return this.repository.find({
      where: { sessionId, role },
      order: { createdAt: 'ASC' },
    });
  }
}
