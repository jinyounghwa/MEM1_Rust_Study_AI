import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../entities/session.entity';

@Injectable()
export class SessionRepository {
  constructor(
    @InjectRepository(Session)
    private readonly repository: Repository<Session>,
  ) {}

  /**
   * Create or update a session
   */
  async save(session: Partial<Session>): Promise<Session> {
    return this.repository.save(session);
  }

  /**
   * Find session by userId
   */
  async findOne(userId: string): Promise<Session | null> {
    return this.repository.findOne({
      where: { id: userId },
      relations: ['messages', 'topicISHistory'],
    });
  }

  /**
   * Find session by userId without relations (lighter)
   */
  async findOneLight(userId: string): Promise<Session | null> {
    return this.repository.findOne({
      where: { id: userId },
    });
  }

  /**
   * Get all sessions sorted by updated date (most recent first)
   */
  async findAll(): Promise<Session[]> {
    return this.repository.find({
      order: { updatedAt: 'DESC' },
      select: ['id', 'title', 'allTopics', 'createdAt', 'updatedAt'],
    });
  }

  /**
   * Update session state
   */
  async update(
    userId: string,
    partialSession: Partial<Session>,
  ): Promise<void> {
    await this.repository.update({ id: userId }, {
      ...partialSession,
      updatedAt: new Date(),
    });
  }

  /**
   * Delete session (cascade deletes messages and topic_is_history)
   */
  async delete(userId: string): Promise<void> {
    await this.repository.delete({ id: userId });
  }

  /**
   * Check if session exists
   */
  async exists(userId: string): Promise<boolean> {
    const count = await this.repository.count({ where: { id: userId } });
    return count > 0;
  }
}
