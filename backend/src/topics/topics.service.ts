import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export class TopicDto {
  id: string;
  name: string;
  description?: string | null;
}

export class UserTopicDto {
  id: string;
  name: string;
  description?: string | null;
  isSelected: boolean;
}

@Injectable()
export class TopicsService {
  private readonly logger = new Logger(TopicsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAllTopics(): Promise<TopicDto[]> {
    try {
      const topics = await this.prisma.topic.findMany({
        select: {
          id: true,
          name: true,
          description: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      this.logger.log(`Retrieved ${topics.length} topics`);
      return topics;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to retrieve topics', errorMessage);
      throw error;
    }
  }

  async getTopicsForUserSelection(userId: string): Promise<UserTopicDto[]> {
    try {
      // Get all topics
      const allTopics = await this.prisma.topic.findMany({
        select: {
          id: true,
          name: true,
          description: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      // Get user's selected topics
      const userTopics = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          topics: {
            select: {
              id: true,
            },
          },
        },
      });

      const selectedTopicIds = new Set(
        userTopics?.topics.map((topic) => topic.id) || [],
      );

      // Mark topics as selected or not
      const topicsWithSelection = allTopics.map((topic) => ({
        ...topic,
        isSelected: selectedTopicIds.has(topic.id),
      }));

      this.logger.log(
        `Retrieved ${topicsWithSelection.length} topics for user ${userId}`,
      );
      return topicsWithSelection;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to retrieve topics for user ${userId}`,
        errorMessage,
      );
      throw error;
    }
  }

  async getUserTopics(userId: string): Promise<TopicDto[]> {
    try {
      const userTopics = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          topics: {
            select: {
              id: true,
              name: true,
              description: true,
            },
            orderBy: {
              name: 'asc',
            },
          },
        },
      });

      const topics = userTopics?.topics || [];
      this.logger.log(`Retrieved ${topics.length} topics for user ${userId}`);
      return topics;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to retrieve user topics for user ${userId}`,
        errorMessage,
      );
      throw error;
    }
  }

  async validateTopicSelection(topicIds: string[]): Promise<void> {
    try {
      if (topicIds.length < 3 || topicIds.length > 5) {
        throw new BadRequestException('You must select between 3 and 5 topics');
      }

      // Check if all topic IDs exist
      const existingTopics = await this.prisma.topic.findMany({
        where: { id: { in: topicIds } },
        select: { id: true },
      });

      if (existingTopics.length !== topicIds.length) {
        throw new BadRequestException('One or more topic IDs are invalid');
      }

      this.logger.log(`Validated topic selection: ${topicIds.length} topics`);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to validate topic selection', errorMessage);
      throw error;
    }
  }

  async updateUserTopics(
    userId: string,
    topicIds: string[],
  ): Promise<TopicDto[]> {
    try {
      // Validate topic selection
      await this.validateTopicSelection(topicIds);

      // Update user's topics
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          topics: {
            set: topicIds.map((id) => ({ id })),
          },
        },
        select: {
          topics: {
            select: {
              id: true,
              name: true,
              description: true,
            },
            orderBy: {
              name: 'asc',
            },
          },
        },
      });

      const topics = updatedUser.topics;
      this.logger.log(
        `Updated topics for user ${userId}: ${topics.length} topics`,
      );
      return topics;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to update topics for user ${userId}`,
        errorMessage,
      );
      throw error;
    }
  }

  async createTopic(name: string, description?: string): Promise<TopicDto> {
    try {
      const topic = await this.prisma.topic.create({
        data: {
          name,
          description,
        },
        select: {
          id: true,
          name: true,
          description: true,
        },
      });

      this.logger.log(`Created topic: ${topic.name} (ID: ${topic.id})`);
      return topic;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create topic: ${name}`, errorMessage);
      throw error;
    }
  }

  async getTopicById(id: string): Promise<TopicDto | null> {
    try {
      const topic = await this.prisma.topic.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          description: true,
        },
      });

      return topic;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to retrieve topic ID: ${id}`, errorMessage);
      throw error;
    }
  }
}
