import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export class ListenerMatchDto {
  id: string;
  firstName: string;
  lastName: string;
  profilePicture?: string | null;
  bio?: string | null;
  topicOverlap: number;
  matchingTopics: string[];
  rating?: number;
  sessionCount: number;
}

export class ListenerRecommendationDto {
  listenerId: string;
  firstName: string;
  lastName: string;
  profilePicture?: string | null;
  bio?: string | null;
  topicOverlap: number;
  matchingTopics: string[];
  confidence: number;
}

export class ListenerApplicationDto {
  id: string;
  userId: string;
  bio: string;
  experience: string;
  topics: string[];
  motivation: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    profilePicture?: string;
  };
}

export class CreateListenerApplicationDto {
  bio: string;
  experience: string;
  topicIds: string[];
  motivation: string;
}

export class UpdateListenerApplicationDto {
  bio?: string;
  experience?: string;
  topicIds?: string[];
  motivation?: string;
}

@Injectable()
export class ListenersService {
  private readonly logger = new Logger(ListenersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findListenersByTopicOverlap(
    userId: string,
    limit: number = 10,
  ): Promise<ListenerMatchDto[]> {
    try {
      // Get user's topics
      const userTopics = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          topics: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!userTopics?.topics || userTopics.topics.length === 0) {
        this.logger.warn(`User ${userId} has no topics selected`);
        return [];
      }

      const userTopicIds = userTopics.topics.map((topic) => topic.id);

      // Find listeners with overlapping topics
      const listeners = await this.prisma.user.findMany({
        where: {
          role: 'LISTENER',
          isApproved: true,
          isEmailVerified: true,
          status: { in: ['ONLINE', 'AVAILABLE'] },
          topics: {
            some: {
              id: { in: userTopicIds },
            },
          },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
          bio: true,
          topics: {
            select: {
              id: true,
              name: true,
            },
          },
          listenerSessions: {
            select: {
              id: true,
            },
          },
        },
        take: limit,
      });

      // Calculate topic overlap and create response
      const listenersWithOverlap = listeners.map((listener) => {
        const listenerTopicIds = listener.topics.map((topic) => topic.id);
        const matchingTopicIds = userTopicIds.filter((id) =>
          listenerTopicIds.includes(id),
        );
        const topicOverlap = matchingTopicIds.length;
        const matchingTopics = listener.topics
          .filter((topic) => matchingTopicIds.includes(topic.id))
          .map((topic) => topic.name);

        return {
          id: listener.id,
          firstName: listener.firstName,
          lastName: listener.lastName,
          profilePicture: listener.profilePicture,
          bio: listener.bio,
          topicOverlap,
          matchingTopics,
          sessionCount: listener.listenerSessions.length,
        };
      });

      // Sort by topic overlap (descending) and then by session count (descending)
      const sortedListeners = listenersWithOverlap.sort((a, b) => {
        if (a.topicOverlap !== b.topicOverlap) {
          return b.topicOverlap - a.topicOverlap;
        }
        return b.sessionCount - a.sessionCount;
      });

      this.logger.log(
        `Found ${sortedListeners.length} listeners for user ${userId} with topic overlap`,
      );
      return sortedListeners;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to find listeners for user ${userId}`,
        errorMessage,
      );
      throw error;
    }
  }

  async getListenerRecommendations(
    userId: string,
    limit: number = 5,
  ): Promise<ListenerRecommendationDto[]> {
    try {
      const listeners = await this.findListenersByTopicOverlap(
        userId,
        limit * 2,
      );

      // Calculate confidence scores based on topic overlap and availability
      const recommendations = listeners.slice(0, limit).map((listener) => {
        const confidence = this.calculateConfidenceScore(
          listener.topicOverlap,
          listener.sessionCount,
        );

        return {
          listenerId: listener.id,
          firstName: listener.firstName,
          lastName: listener.lastName,
          profilePicture: listener.profilePicture,
          bio: listener.bio,
          topicOverlap: listener.topicOverlap,
          matchingTopics: listener.matchingTopics,
          confidence,
        };
      });

      this.logger.log(
        `Generated ${recommendations.length} listener recommendations for user ${userId}`,
      );
      return recommendations;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to get listener recommendations for user ${userId}`,
        errorMessage,
      );
      throw error;
    }
  }

  async getAvailableListenersForTopic(
    topicId: string,
    limit: number = 10,
  ): Promise<ListenerMatchDto[]> {
    try {
      const listeners = await this.prisma.user.findMany({
        where: {
          role: 'LISTENER',
          isApproved: true,
          isEmailVerified: true,
          status: { in: ['ONLINE', 'AVAILABLE'] },
          topics: {
            some: {
              id: topicId,
            },
          },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
          bio: true,
          topics: {
            select: {
              id: true,
              name: true,
            },
          },
          listenerSessions: {
            select: {
              id: true,
            },
          },
        },
        take: limit,
        orderBy: {
          listenerSessions: {
            _count: 'desc',
          },
        },
      });

      const listenersWithOverlap = listeners.map((listener) => {
        const topicOverlap = 1; // Since we're filtering by specific topic
        const matchingTopics = listener.topics
          .filter((topic) => topic.id === topicId)
          .map((topic) => topic.name);

        return {
          id: listener.id,
          firstName: listener.firstName,
          lastName: listener.lastName,
          profilePicture: listener.profilePicture,
          bio: listener.bio,
          topicOverlap,
          matchingTopics,
          sessionCount: listener.listenerSessions.length,
        };
      });

      this.logger.log(
        `Found ${listenersWithOverlap.length} available listeners for topic ${topicId}`,
      );
      return listenersWithOverlap;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to get available listeners for topic ${topicId}`,
        errorMessage,
      );
      throw error;
    }
  }

  private calculateConfidenceScore(
    topicOverlap: number,
    sessionCount: number,
  ): number {
    // Base confidence on topic overlap (0-1 scale)
    const topicScore = Math.min(topicOverlap / 5, 1);

    // Experience bonus based on session count (0-0.2 scale)
    const experienceScore = Math.min(sessionCount / 100, 0.2);

    // Combined confidence score (0-1 scale)
    const confidence = topicScore + experienceScore;

    return Math.min(confidence, 1);
  }

  async submitListenerApplication(
    userId: string,
    dto: CreateListenerApplicationDto,
  ): Promise<ListenerApplicationDto> {
    try {
      // Check if user already has an application
      const existingApplication =
        await this.prisma.listenerApplication.findUnique({
          where: { userId },
        });

      if (existingApplication) {
        throw new ConflictException('You already have a listener application');
      }

      // Validate topic selection (3-5 topics required)
      if (dto.topicIds.length < 3 || dto.topicIds.length > 5) {
        throw new BadRequestException('You must select between 3 and 5 topics');
      }

      // Verify that all topic IDs exist
      const existingTopics = await this.prisma.topic.findMany({
        where: { id: { in: dto.topicIds } },
        select: { id: true },
      });

      if (existingTopics.length !== dto.topicIds.length) {
        throw new BadRequestException('One or more topic IDs are invalid');
      }

      // Create the application
      const application = await this.prisma.listenerApplication.create({
        data: {
          userId,
          bio: dto.bio,
          experience: dto.experience,
          topics: dto.topicIds,
          motivation: dto.motivation,
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              profilePicture: true,
            },
          },
        },
      });

      this.logger.log(
        `Listener application submitted by user ${userId} with ${dto.topicIds.length} topics`,
      );

      return this.mapToListenerApplicationDto(application);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to submit listener application for user ${userId}`,
        errorMessage,
      );
      throw error;
    }
  }

  async getUserListenerApplication(
    userId: string,
  ): Promise<ListenerApplicationDto | null> {
    try {
      const application = await this.prisma.listenerApplication.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              profilePicture: true,
            },
          },
        },
      });

      if (!application) {
        return null;
      }

      return this.mapToListenerApplicationDto(application);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to get listener application for user ${userId}`,
        errorMessage,
      );
      throw error;
    }
  }

  async updateListenerApplication(
    userId: string,
    dto: UpdateListenerApplicationDto,
  ): Promise<ListenerApplicationDto> {
    try {
      const application = await this.prisma.listenerApplication.findUnique({
        where: { userId },
      });

      if (!application) {
        throw new NotFoundException('Listener application not found');
      }

      if (application.status !== 'PENDING') {
        throw new BadRequestException(
          'Cannot update application that is not pending',
        );
      }

      // Validate topic selection if provided
      if (dto.topicIds) {
        if (dto.topicIds.length < 3 || dto.topicIds.length > 5) {
          throw new BadRequestException(
            'You must select between 3 and 5 topics',
          );
        }

        // Verify that all topic IDs exist
        const existingTopics = await this.prisma.topic.findMany({
          where: { id: { in: dto.topicIds } },
          select: { id: true },
        });

        if (existingTopics.length !== dto.topicIds.length) {
          throw new BadRequestException('One or more topic IDs are invalid');
        }
      }

      // Update the application
      const updatedApplication = await this.prisma.listenerApplication.update({
        where: { userId },
        data: {
          ...(dto.bio && { bio: dto.bio }),
          ...(dto.experience && { experience: dto.experience }),
          ...(dto.topicIds && { topics: dto.topicIds }),
          ...(dto.motivation && { motivation: dto.motivation }),
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              profilePicture: true,
            },
          },
        },
      });

      this.logger.log(`Listener application updated by user ${userId}`);

      return this.mapToListenerApplicationDto(updatedApplication);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to update listener application for user ${userId}`,
        errorMessage,
      );
      throw error;
    }
  }

  async withdrawListenerApplication(userId: string): Promise<void> {
    try {
      const application = await this.prisma.listenerApplication.findUnique({
        where: { userId },
      });

      if (!application) {
        throw new NotFoundException('Listener application not found');
      }

      if (application.status !== 'PENDING') {
        throw new BadRequestException(
          'Cannot withdraw application that is not pending',
        );
      }

      await this.prisma.listenerApplication.delete({
        where: { userId },
      });

      this.logger.log(`Listener application withdrawn by user ${userId}`);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to withdraw listener application for user ${userId}`,
        errorMessage,
      );
      throw error;
    }
  }

  async getAllListenerApplications(): Promise<ListenerApplicationDto[]> {
    try {
      const applications = await this.prisma.listenerApplication.findMany({
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              profilePicture: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return applications.map((application) =>
        this.mapToListenerApplicationDto(application),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Failed to get all listener applications',
        errorMessage,
      );
      throw error;
    }
  }

  async getListenerApplicationsByStatus(
    status: 'PENDING' | 'APPROVED' | 'REJECTED',
  ): Promise<ListenerApplicationDto[]> {
    try {
      const applications = await this.prisma.listenerApplication.findMany({
        where: { status },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              profilePicture: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return applications.map((application) =>
        this.mapToListenerApplicationDto(application),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to get listener applications with status ${status}`,
        errorMessage,
      );
      throw error;
    }
  }

  private mapToListenerApplicationDto(application: {
    id: string;
    userId: string;
    bio: string;
    experience: string;
    topics: string[];
    motivation: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    adminNotes?: string | null;
    reviewedBy?: string | null;
    reviewedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      profilePicture?: string | null;
    };
  }): ListenerApplicationDto {
    return {
      id: application.id,
      userId: application.userId,
      bio: application.bio,
      experience: application.experience,
      topics: application.topics,
      motivation: application.motivation,
      status: application.status,
      adminNotes: application.adminNotes || undefined,
      reviewedBy: application.reviewedBy || undefined,
      reviewedAt: application.reviewedAt || undefined,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      user: {
        firstName: application.user.firstName,
        lastName: application.user.lastName,
        email: application.user.email,
        profilePicture: application.user.profilePicture || undefined,
      },
    };
  }
}
