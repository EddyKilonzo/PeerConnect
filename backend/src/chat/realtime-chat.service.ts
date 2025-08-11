import { Injectable, Logger } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { ChatRoomType, MessageType } from './dto/chat-message.dto';

// Proper TypeScript interfaces instead of 'any'
interface MeetingWithGroup {
  id: string;
  title: string;
  groupId: string;
  group: {
    id: string;
    name: string;
    description?: string;
  };
}

interface MeetingData {
  id: string;
  title: string;
  description: string;
  groupId: string;
  scheduledStartTime: Date;
  scheduledEndTime?: Date;
  status: string;
}

interface ResourceData {
  id: string;
  title: string;
  description: string;
  type: string;
  fileUrl: string;
  topicId: string;
  uploadedById: string;
}

interface NewGroupMember {
  user: {
    firstName: string;
    lastName: string;
  };
}

// Extend BroadcastData to ensure compatibility with ChatGateway
interface SystemMessageData {
  [key: string]: unknown;
  id: string;
  content: string;
  messageType: MessageType;
  roomId: string;
  roomType: ChatRoomType;
  createdAt: Date;
  timestamp: Date;
}

interface NotificationData {
  [key: string]: unknown;
  groupId?: string;
  meetingId?: string;
  meeting?: MeetingData;
  newMember?: NewGroupMember;
  resource?: ResourceData;
  topicId?: string;
  timestamp: Date;
}

interface TypingIndicatorData {
  [key: string]: unknown;
  userId: string;
  userName: string;
  roomId: string;
  roomType: ChatRoomType;
  timestamp: Date;
}

interface ReadReceiptData {
  [key: string]: unknown;
  userId: string;
  messageId: string;
  roomId: string;
  roomType: ChatRoomType;
  timestamp: Date;
}

interface RoomStats {
  roomId: string;
  roomType: ChatRoomType;
  messageCount: number;
  onlineUsersCount: number;
  timestamp: Date;
}

@Injectable()
export class RealtimeChatService {
  private readonly logger = new Logger(RealtimeChatService.name);

  constructor(
    private readonly chatGateway: ChatGateway,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Send a system message to a room
   */
  async sendSystemMessage(
    roomId: string,
    roomType: ChatRoomType,
    content: string,
  ): Promise<SystemMessageData> {
    try {
      const message = await this.prisma.message.create({
        data: {
          senderId: 'system',
          receiverId: 'system',
          content,
          messageType: MessageType.TEXT,
          ...this.getRoomReference(roomId, roomType),
        },
      });

      const systemMessageData: SystemMessageData = {
        id: message.id,
        content: message.content,
        messageType: MessageType.TEXT,
        roomId,
        roomType,
        createdAt: message.createdAt,
        timestamp: new Date(),
      };

      // Broadcast to all users in the room
      this.chatGateway.broadcastToRoom(
        roomId,
        roomType,
        'systemMessage',
        systemMessageData,
      );

      this.logger.log(
        `System message sent to ${roomType} ${roomId}: ${content}`,
      );
      return systemMessageData;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send system message: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Notify users about new meeting
   */
  async notifyNewMeeting(
    groupId: string,
    meetingData: MeetingData,
  ): Promise<void> {
    try {
      const groupMembers = await this.prisma.groupMember.findMany({
        where: { groupId },
        include: { user: true },
      });

      const userIds = groupMembers.map((member) => member.userId);

      const notificationData: NotificationData = {
        groupId,
        meeting: meetingData,
        timestamp: new Date(),
      };

      this.chatGateway.broadcastToUsers(
        userIds,
        'newMeeting',
        notificationData,
      );

      this.logger.log(`New meeting notification sent to group ${groupId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to notify new meeting: ${errorMessage}`);
    }
  }

  /**
   * Notify users about meeting start
   */
  async notifyMeetingStart(
    meetingId: string,
    meetingData: MeetingData,
  ): Promise<void> {
    try {
      const meeting = (await this.prisma.meeting.findUnique({
        where: { id: meetingId },
        include: {
          group: true,
        },
      })) as MeetingWithGroup;

      if (!meeting) return;

      // Get group members separately
      const groupMembers = await this.prisma.groupMember.findMany({
        where: { groupId: meeting.groupId },
        include: { user: true },
      });

      const userIds = groupMembers.map((member) => member.userId);

      const notificationData: NotificationData = {
        meetingId,
        meeting: meetingData,
        timestamp: new Date(),
      };

      this.chatGateway.broadcastToUsers(
        userIds,
        'meetingStarted',
        notificationData,
      );

      // Send system message to meeting room
      await this.sendSystemMessage(
        meetingId,
        ChatRoomType.MEETING,
        `Meeting "${meeting.title}" has started`,
      );

      this.logger.log(
        `Meeting start notification sent for meeting ${meetingId}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to notify meeting start: ${errorMessage}`);
    }
  }

  /**
   * Notify users about meeting end
   */
  async notifyMeetingEnd(
    meetingId: string,
    meetingData: MeetingData,
  ): Promise<void> {
    try {
      const meeting = (await this.prisma.meeting.findUnique({
        where: { id: meetingId },
        include: {
          group: true,
        },
      })) as MeetingWithGroup;

      if (!meeting) return;

      // Get group members separately
      const groupMembers = await this.prisma.groupMember.findMany({
        where: { groupId: meeting.groupId },
        include: { user: true },
      });

      const userIds = groupMembers.map((member) => member.userId);

      const notificationData: NotificationData = {
        meetingId,
        meeting: meetingData,
        timestamp: new Date(),
      };

      this.chatGateway.broadcastToUsers(
        userIds,
        'meetingEnded',
        notificationData,
      );

      // Send system message to meeting room
      await this.sendSystemMessage(
        meetingId,
        ChatRoomType.MEETING,
        `Meeting "${meeting.title}" has ended. Summary will be available shortly.`,
      );

      this.logger.log(`Meeting end notification sent for meeting ${meetingId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to notify meeting end: ${errorMessage}`);
    }
  }

  /**
   * Notify users about new group member
   */
  async notifyNewGroupMember(
    groupId: string,
    newMember: NewGroupMember,
  ): Promise<void> {
    try {
      const groupMembers = await this.prisma.groupMember.findMany({
        where: { groupId },
        include: { user: true },
      });

      const userIds = groupMembers.map((member) => member.userId);

      const notificationData: NotificationData = {
        groupId,
        newMember,
        timestamp: new Date(),
      };

      this.chatGateway.broadcastToUsers(
        userIds,
        'newGroupMember',
        notificationData,
      );

      // Send system message to group room
      await this.sendSystemMessage(
        groupId,
        ChatRoomType.GROUP,
        `${newMember.user.firstName} ${newMember.user.lastName} joined the group`,
      );

      this.logger.log(`New member notification sent for group ${groupId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to notify new group member: ${errorMessage}`);
    }
  }

  /**
   * Notify users about new resource
   */
  async notifyNewResource(
    resourceData: ResourceData,
    topicId: string,
  ): Promise<void> {
    try {
      // Get users interested in this topic
      const topicUsers = await this.prisma.user.findMany({
        where: {
          topics: {
            some: { id: topicId },
          },
        },
      });

      const userIds = topicUsers.map((user) => user.id);

      const notificationData: NotificationData = {
        resource: resourceData,
        topicId,
        timestamp: new Date(),
      };

      this.chatGateway.broadcastToUsers(
        userIds,
        'newResource',
        notificationData,
      );

      this.logger.log(`New resource notification sent for topic ${topicId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to notify new resource: ${errorMessage}`);
    }
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(
    roomId: string,
    roomType: ChatRoomType,
    userId: string,
    userName: string,
  ): void {
    try {
      const typingData: TypingIndicatorData = {
        userId,
        userName,
        roomId,
        roomType,
        timestamp: new Date(),
      };

      this.chatGateway.broadcastToRoom(
        roomId,
        roomType,
        'userTyping',
        typingData,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send typing indicator: ${errorMessage}`);
    }
  }

  /**
   * Send stop typing indicator
   */
  sendStopTypingIndicator(
    roomId: string,
    roomType: ChatRoomType,
    userId: string,
    userName: string,
  ): void {
    try {
      const typingData: TypingIndicatorData = {
        userId,
        userName,
        roomId,
        roomType,
        timestamp: new Date(),
      };

      this.chatGateway.broadcastToRoom(
        roomId,
        roomType,
        'userStopTyping',
        typingData,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send stop typing indicator: ${errorMessage}`,
      );
    }
  }

  /**
   * Get online users in a room
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getOnlineUsers(_roomId: string, _roomType: ChatRoomType): Promise<string[]> {
    try {
      // This would need to be implemented based on your WebSocket connection tracking
      // For now, return an empty array
      return Promise.resolve([]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get online users: ${errorMessage}`);
      return Promise.resolve([]);
    }
  }

  /**
   * Send read receipt
   */
  sendReadReceipt(
    roomId: string,
    roomType: ChatRoomType,
    userId: string,
    messageId: string,
  ): void {
    try {
      const readReceiptData: ReadReceiptData = {
        userId,
        messageId,
        roomId,
        roomType,
        timestamp: new Date(),
      };

      this.chatGateway.broadcastToRoom(
        roomId,
        roomType,
        'messageRead',
        readReceiptData,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send read receipt: ${errorMessage}`);
    }
  }

  /**
   * Get room statistics
   */
  async getRoomStats(
    roomId: string,
    roomType: ChatRoomType,
  ): Promise<RoomStats | null> {
    try {
      const messageCount = await this.prisma.message.count({
        where: this.getRoomReference(roomId, roomType),
      });

      const onlineUsers = await this.getOnlineUsers(roomId, roomType);

      const roomStats: RoomStats = {
        roomId,
        roomType,
        messageCount,
        onlineUsersCount: onlineUsers.length,
        timestamp: new Date(),
      };

      return roomStats;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get room stats: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Helper method to get room reference for database queries
   */
  private getRoomReference(roomId: string, roomType: ChatRoomType) {
    switch (roomType) {
      case ChatRoomType.SESSION:
        return { sessionId: roomId };
      case ChatRoomType.GROUP:
        return { groupId: roomId };
      case ChatRoomType.MEETING:
        return { meetingId: roomId };
      case ChatRoomType.DIRECT:
        return { receiverId: roomId };
      default:
        return {};
    }
  }
}
