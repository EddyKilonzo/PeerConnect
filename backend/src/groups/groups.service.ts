import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateGroupDto, ContentFilterDto } from './dto/create-group.dto';

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Generate anonymous names for users
  private generateAnonymousName(): string {
    const adjectives = [
      'Mysterious',
      'Curious',
      'Wise',
      'Brave',
      'Calm',
      'Eager',
      'Gentle',
      'Happy',
    ];
    const nouns = [
      'Explorer',
      'Thinker',
      'Dreamer',
      'Creator',
      'Learner',
      'Helper',
      'Friend',
      'Guide',
    ];
    const randomNum = Math.floor(Math.random() * 1000);

    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];

    return `${adjective}${noun}${randomNum}`;
  }

  // Create a new group
  async createGroup(data: CreateGroupDto, creatorId: string) {
    try {
      const group = await this.prisma.group.create({
        data: {
          name: data.name,
          description: data.description,
          topicId: data.topicId,
          leaderId: creatorId, // Use existing leaderId field
          maxMembers: data.maxMembers || 100,
          isActive: true,
        },
        include: {
          members: true,
        },
      });

      // Add creator as admin member
      await this.prisma.groupMember.create({
        data: {
          userId: creatorId,
          groupId: group.id,
          role: 'ADMIN', // Use existing ADMIN role
          joinedAt: new Date(),
        },
      });

      this.logger.log(`Created group ${group.name} by user ${creatorId}`);
      return group;
    } catch (error) {
      this.logger.error(
        `Failed to create group: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  // Join a group
  async joinGroup(groupId: string, userId: string) {
    try {
      const group = await this.prisma.group.findUnique({
        where: { id: groupId },
        include: { members: true },
      });

      if (!group) {
        throw new NotFoundException('Group not found');
      }

      if (!group.isActive) {
        throw new ForbiddenException('Group is not active');
      }

      if (group.members.length >= group.maxMembers) {
        throw new ForbiddenException('Group is at maximum capacity');
      }

      const existingMember = group.members.find((m) => m.userId === userId);
      if (existingMember) {
        throw new ForbiddenException('User is already a member of this group');
      }

      const member = await this.prisma.groupMember.create({
        data: {
          groupId,
          userId,
          role: 'MEMBER',
          joinedAt: new Date(),
        },
      });

      this.logger.log(`User ${userId} joined group ${groupId}`);
      return member;
    } catch (error) {
      this.logger.error(
        `Failed to join group: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  // AI-assisted content filtering
  filterContent(
    content: string,
    type: 'MESSAGE' | 'VOICE_TRANSCRIPT',
  ): ContentFilterDto {
    try {
      // This would integrate with an AI service for content moderation
      // For now, implementing basic keyword filtering
      const harmfulKeywords = [
        'hate',
        'violence',
        'harassment',
        'bullying',
        'suicide',
        'self-harm',
        'drugs',
        'illegal',
        'scam',
        'spam',
        'inappropriate',
      ];

      const flaggedTerms = harmfulKeywords.filter((keyword) =>
        content.toLowerCase().includes(keyword.toLowerCase()),
      );

      let severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
      let suggestedAction:
        | 'WARN'
        | 'MUTE'
        | 'LISTENER_RESPONSE'
        | 'BAN'
        | 'LOCK_ROOM'
        | 'NONE' = 'NONE';

      if (flaggedTerms.length > 0) {
        // Check for scam/illicit marketing keywords first
        const scamKeywords = [
          'scam',
          'fraud',
          'illegal',
          'counterfeit',
          'money-laundering',
        ];
        const hasScamContent = scamKeywords.some((keyword) =>
          content.toLowerCase().includes(keyword.toLowerCase()),
        );

        if (hasScamContent) {
          severity = 'HIGH';
          suggestedAction = 'BAN'; // Ban for scams and illicit marketing
        } else if (flaggedTerms.length >= 3) {
          severity = 'HIGH';
          suggestedAction = 'LISTENER_RESPONSE'; // Listener response for other high-severity content
        } else if (flaggedTerms.length >= 2) {
          severity = 'MEDIUM';
          suggestedAction = 'MUTE';
        } else {
          severity = 'LOW';
          suggestedAction = 'WARN';
        }
      }

      return {
        content,
        type,
        severity,
        flaggedTerms,
        suggestedAction,
        confidence: flaggedTerms.length > 0 ? 0.8 : 0.95,
      };
    } catch (error) {
      this.logger.error(
        `Failed to filter content: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Return safe default
      return {
        content,
        type,
        severity: 'LOW',
        flaggedTerms: [],
        suggestedAction: 'NONE',
        confidence: 0.5,
      };
    }
  }

  // Send message in group (with locking restrictions)
  async sendGroupMessage(groupId: string, userId: string, content: string) {
    try {
      const group = await this.prisma.group.findUnique({
        where: { id: groupId },
        include: { members: true },
      });

      if (!group) {
        throw new NotFoundException('Group not found');
      }

      const member = group.members.find((m) => m.userId === userId);
      if (!member) {
        throw new ForbiddenException('User is not a member of this group');
      }

      // Check if group is locked and user is not admin/lead
      if (!group.isActive && member.role === 'MEMBER') {
        throw new ForbiddenException(
          'Group is inactive. Only admins and leads can send messages.',
        );
      }

      // AI content filtering
      const contentFilter = this.filterContent(content, 'MESSAGE');

      // Handle different content actions
      if (contentFilter.severity === 'HIGH') {
        if (contentFilter.suggestedAction === 'BAN') {
          // Ban user for scams/illicit marketing
          throw new ForbiddenException(
            'Message blocked due to scam/illicit content. User has been banned.',
          );
        } else if (contentFilter.suggestedAction === 'LISTENER_RESPONSE') {
          // Allow message but notify listeners to respond
          this.logger.warn(
            `High-severity content detected in group ${groupId}. Notifying listeners for response.`,
          );
          // TODO: Implement listener notification system
        }
      }

      // Create the message
      const message = await this.prisma.message.create({
        data: {
          senderId: userId,
          receiverId: groupId, // Using groupId as receiver for group messages
          content,
          messageType: 'TEXT',
          groupId,
        },
      });

      this.logger.log(`Message sent in group ${groupId} by user ${userId}`);
      return message;
    } catch (error) {
      this.logger.error(
        `Failed to send group message: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  // Check if user can send messages in group
  async canSendMessage(groupId: string, userId: string): Promise<boolean> {
    try {
      const group = await this.prisma.group.findUnique({
        where: { id: groupId },
        include: { members: true },
      });

      if (!group) {
        return false;
      }

      const member = group.members.find((m) => m.userId === userId);
      if (!member) {
        return false;
      }

      // If group is inactive, only admins and leads can send messages
      if (!group.isActive) {
        return member.role === 'ADMIN' || member.role === 'LISTENER'; // LISTENER is the lead role
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to check message permissions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return false;
    }
  }

  // Get group messages with pagination
  async getGroupMessages(
    groupId: string,
    page: number = 1,
    limit: number = 50,
  ) {
    try {
      const skip = (page - 1) * limit;

      const [messages, total] = await Promise.all([
        this.prisma.message.findMany({
          where: { groupId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
        this.prisma.message.count({
          where: { groupId },
        }),
      ]);

      return {
        messages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get group messages: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  // Get group information
  async getGroup(groupId: string) {
    try {
      const group = await this.prisma.group.findUnique({
        where: { id: groupId },
        include: {
          members: {
            select: {
              id: true,
              userId: true,
              role: true,
              joinedAt: true,
            },
          },
          topic: true,
          leader: true,
        },
      });

      if (!group) {
        throw new NotFoundException('Group not found');
      }

      return group;
    } catch (error) {
      this.logger.error(
        `Failed to get group: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  // Handle listener response to flagged content
  async createListenerResponse(
    groupId: string,
    userId: string,
    listenerId: string,
    responseData: {
      responseContent: string;
      responseType:
        | 'SUPPORT'
        | 'GUIDANCE'
        | 'RESOURCE'
        | 'ESCALATION'
        | 'CLARIFICATION';
      followUpRequired: boolean;
      followUpNotes?: string;
    },
  ) {
    try {
      // Verify the listener has appropriate role
      const group = await this.prisma.group.findUnique({
        where: { id: groupId },
        include: { members: true },
      });

      if (!group) {
        throw new NotFoundException('Group not found');
      }

      const listener = group.members.find((m) => m.userId === listenerId);
      if (
        !listener ||
        (listener.role !== 'ADMIN' && listener.role !== 'LISTENER')
      ) {
        throw new ForbiddenException(
          'Only admins and listeners can respond to flagged content',
        );
      }

      // Create listener response record
      const listenerResponse = {
        id: `lr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        groupId,
        userId,
        listenerId,
        content: '', // This would be the original flagged content
        flaggedTerms: [], // This would be the flagged terms
        severity: 'HIGH' as const,
        responseContent: responseData.responseContent,
        responseType: responseData.responseType,
        createdAt: new Date(),
        respondedAt: new Date(),
        status: 'IN_PROGRESS' as const,
        followUpRequired: responseData.followUpRequired,
        followUpNotes: responseData.followUpNotes,
      };

      this.logger.log(
        `Listener ${listenerId} responded to flagged content from user ${userId} in group ${groupId}`,
      );

      // TODO: Store listener response in database
      // TODO: Send notification to the flagged user
      // TODO: Update moderation log

      return listenerResponse;
    } catch (error) {
      this.logger.error(
        `Failed to create listener response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
