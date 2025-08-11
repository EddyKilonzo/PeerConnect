import { Injectable, Logger } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { ChatRoomType, MessageType } from './dto/chat-message.dto';

interface MeetingWithGroup {
  id: string;
  title: string;
  groupId: string;
  group: any;
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
  ) {
    try {
      const message = await this.prisma.message.create({
        data: {
          senderId: 'system',
          receiverId: 'system',
          content,
          messageType: MessageType.TEXT, // Changed from SYSTEM to TEXT since SYSTEM is not in Prisma enum
          ...this.getRoomReference(roomId, roomType),
        },
      });

      // Broadcast to all users in the room
      this.chatGateway.broadcastToRoom(roomId, roomType, 'systemMessage', {
        id: message.id,
        content: message.content,
        messageType: MessageType.TEXT,
        roomId,
        roomType,
        createdAt: message.createdAt,
        timestamp: new Date(),
      });

      this.logger.log(
        `System message sent to ${roomType} ${roomId}: ${content}`,
      );
      return message;
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
  async notifyNewMeeting(groupId: string, meetingData: any) {
    try {
      const groupMembers = await this.prisma.groupMember.findMany({
        where: { groupId },
        include: { user: true },
      });

      const userIds = groupMembers.map((member) => member.userId);

      this.chatGateway.broadcastToUsers(userIds, 'newMeeting', {
        groupId,
        meeting: meetingData,
        timestamp: new Date(),
      });

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
  async notifyMeetingStart(meetingId: string, meetingData: any) {
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

      this.chatGateway.broadcastToUsers(userIds, 'meetingStarted', {
        meetingId,
        meeting: meetingData,
        timestamp: new Date(),
      });

      // Send system message to meeting room
      void this.sendSystemMessage(
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
  async notifyMeetingEnd(meetingId: string, meetingData: any) {
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

      this.chatGateway.broadcastToUsers(userIds, 'meetingEnded', {
        meetingId,
        meeting: meetingData,
        timestamp: new Date(),
      });

      // Send system message to meeting room
      void this.sendSystemMessage(
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
    newMember: { user: { firstName: string; lastName: string } },
  ) {
    try {
      const groupMembers = await this.prisma.groupMember.findMany({
        where: { groupId },
        include: { user: true },
      });

      const userIds = groupMembers.map((member) => member.userId);

      this.chatGateway.broadcastToUsers(userIds, 'newGroupMember', {
        groupId,
        newMember,
        timestamp: new Date(),
      });

      // Send system message to group room
      void this.sendSystemMessage(
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
  async notifyNewResource(resourceData: any, topicId: string) {
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

      this.chatGateway.broadcastToUsers(userIds, 'newResource', {
        resource: resourceData,
        topicId,
        timestamp: new Date(),
      });

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
  ) {
    try {
      this.chatGateway.broadcastToRoom(roomId, roomType, 'userTyping', {
        userId,
        userName,
        roomId,
        roomType,
        timestamp: new Date(),
      });
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
  ) {
    try {
      this.chatGateway.broadcastToRoom(roomId, roomType, 'userStopTyping', {
        userId,
        userName,
        roomId,
        roomType,
        timestamp: new Date(),
      });
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
  getOnlineUsers(roomId: string, roomType: ChatRoomType): Promise<string[]> {
    return new Promise((resolve) => {
      try {
        // This would need to be implemented based on your WebSocket connection tracking
        // For now, return an empty array
        resolve([]);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to get online users: ${errorMessage}`);
        resolve([]);
      }
    });
  }

  /**
   * Send read receipt
   */
  sendReadReceipt(
    roomId: string,
    roomType: ChatRoomType,
    userId: string,
    messageId: string,
  ) {
    try {
      this.chatGateway.broadcastToRoom(roomId, roomType, 'messageRead', {
        userId,
        messageId,
        roomId,
        roomType,
        timestamp: new Date(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send read receipt: ${errorMessage}`);
    }
  }

  /**
   * Get room statistics
   */
  async getRoomStats(roomId: string, roomType: ChatRoomType) {
    try {
      const messageCount = await this.prisma.message.count({
        where: this.getRoomReference(roomId, roomType),
      });

      const onlineUsers = await this.getOnlineUsers(roomId, roomType);

      return {
        roomId,
        roomType,
        messageCount,
        onlineUsersCount: onlineUsers.length,
        timestamp: new Date(),
      };
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
