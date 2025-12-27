import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TopicISHistory } from '../entities/topic-is-history.entity';

@Injectable()
export class TopicISHistoryRepository {
  constructor(
    @InjectRepository(TopicISHistory)
    private readonly repository: Repository<TopicISHistory>,
  ) {}

  /**
   * Save an IS summary for a topic
   */
  async save(topicIS: Partial<TopicISHistory>): Promise<TopicISHistory> {
    return this.repository.save(topicIS);
  }

  /**
   * Find all IS summaries for a session (ordered by completion date)
   */
  async findBySessionId(sessionId: string): Promise<TopicISHistory[]> {
    return this.repository.find({
      where: { sessionId },
      order: { completedAt: 'ASC' },
    });
  }

  /**
   * Find IS summary for a specific topic
   */
  async findBySessionIdAndTopic(
    sessionId: string,
    topic: string,
  ): Promise<TopicISHistory | null> {
    return this.repository.findOne({
      where: { sessionId, topic },
    });
  }

  /**
   * Get all previous topics' IS summaries (for building prompt)
   */
  async getPreviousTopicsSummary(
    sessionId: string,
    currentTopic: string,
  ): Promise<Map<string, string>> {
    const histories = await this.findBySessionId(sessionId);
    const summaryMap = new Map<string, string>();

    for (const history of histories) {
      if (history.topic !== currentTopic) {
        summaryMap.set(history.topic, history.isSummary);
      }
    }

    return summaryMap;
  }

  /**
   * Delete all IS histories for a session
   */
  async deleteBySessionId(sessionId: string): Promise<void> {
    await this.repository.delete({ sessionId });
  }

  /**
   * Check if topic IS exists
   */
  async exists(sessionId: string, topic: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { sessionId, topic },
    });
    return count > 0;
  }
}
