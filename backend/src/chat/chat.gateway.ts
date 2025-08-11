import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  SendMessageDto,
  JoinRoomDto,
  LeaveRoomDto,
  TypingDto,
  ChatMessageDto,
  ChatRoomType,
  MessageType as DtoMessageType,
} from './dto/chat-message.dto';
import { MessageType as PrismaMessageType } from '@prisma/client';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userName?: string;
  userRole?: string;
}

interface MessageData {
  senderId: string;
  receiverId: string;
  content: string;
  messageType: PrismaMessageType;
  fileUrl?: string;
  sessionId?: string;
  groupId?: string;
  meetingId?: string;
}

interface WhereClause {
  sessionId?: string;
  groupId?: string;
  meetingId?: string;
  OR?: Array<{
    senderId?: string;
    receiverId?: string;
  }>;
}

interface BroadcastData {
  [key: string]: unknown;
}

interface JwtPayload {
  id: string;
  sub: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  iat: number;
  exp: number;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly connectedUsers = new Map<string, AuthenticatedSocket>();
  private readonly userRooms = new Map<string, Set<string>>();

  constructor(
    private readonly chatService: ChatService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit() {
    this.logger.log('Chat WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract user info from handshake auth
      const token = client.handshake.auth.token as string;
      if (!token) {
        this.logger.warn('Client connected without token');
        client.disconnect();
        return;
      }

      // Verify JWT token and get user info
      const user = await this.verifyToken(token);
      if (!user) {
        this.logger.warn('Invalid token for client connection');
        client.disconnect();
        return;
      }

      // Store user info in socket
      client.userId = user.id;
      client.userName = `${user.firstName} ${user.lastName}`;
      client.userRole = user.role;

      // Store connected user
      this.connectedUsers.set(user.id, client);
      this.userRooms.set(user.id, new Set());

      this.logger.log(`User ${user.id} (${client.userName}) connected`);

      // Emit connection confirmation
      client.emit('connected', {
        userId: user.id,
        userName: client.userName,
        userRole: user.role,
        timestamp: new Date(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Connection error: ${errorMessage}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      // Remove user from all rooms
      const userRooms = this.userRooms.get(client.userId);
      if (userRooms) {
        userRooms.forEach((roomId) => {
          client.leave(roomId);
        });
        this.userRooms.delete(client.userId);
      }

      // Remove connected user
      this.connectedUsers.delete(client.userId);

      this.logger.log(
        `User ${client.userId} (${client.userName}) disconnected`,
      );
    }
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody() data: JoinRoomDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.userId) {
        client.emit('error', { message: 'User not authenticated' });
        return;
      }

      const { roomId, roomType } = data;
      const roomName = this.getRoomName(roomId, roomType);

      // Verify user has access to this room
      const hasAccess = await this.verifyRoomAccess(
        client.userId,
        roomId,
        roomType,
      );

      if (!hasAccess) {
        client.emit('error', { message: 'Access denied to this room' });
        return;
      }

      // Join the room
      await client.join(roomName);

      // Store user's room membership
      const userRooms = this.userRooms.get(client.userId) || new Set();
      userRooms.add(roomName);
      this.userRooms.set(client.userId, userRooms);

      // Notify others in the room
      client.to(roomName).emit('userJoined', {
        userId: client.userId,
        userName: client.userName,
        timestamp: new Date(),
      });

      // Send room history
      const messages = await this.getRoomMessages(roomId, roomType);
      client.emit('roomHistory', {
        roomId,
        roomType,
        messages,
        timestamp: new Date(),
      });

      this.logger.log(`User ${client.userId} joined room ${roomName}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Join room error: ${errorMessage}`);
      client.emit('error', { message: 'Failed to join room' });
    }
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @MessageBody() data: LeaveRoomDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.userId) {
        client.emit('error', { message: 'User not authenticated' });
        return;
      }

      const { roomId, roomType } = data;
      const roomName = this.getRoomName(roomId, roomType);

      // Leave the room
      await client.leave(roomName);

      // Remove from user's room list
      const userRooms = this.userRooms.get(client.userId);
      if (userRooms) {
        userRooms.delete(roomName);
      }

      // Notify others in the room
      client.to(roomName).emit('userLeft', {
        userId: client.userId,
        userName: client.userName,
        timestamp: new Date(),
      });

      this.logger.log(`User ${client.userId} left room ${roomName}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Leave room error: ${errorMessage}`);
      client.emit('error', { message: 'Failed to leave room' });
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: SendMessageDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.userId) {
        client.emit('error', { message: 'User not authenticated' });
        return;
      }

      const {
        content,
        messageType,
        roomId,
        roomType,
        fileUrl,
        fileName,
        fileSize,
        replyToId,
      } = data;
      const roomName = this.getRoomName(roomId, roomType);

      // Verify user is in the room
      const userRooms = this.userRooms.get(client.userId);
      if (!userRooms || !userRooms.has(roomName)) {
        client.emit('error', { message: 'You are not in this room' });
        return;
      }

      // Store message in database
      const message = await this.storeMessage(
        roomId,
        roomType,
        client.userId,
        content,
        messageType,
        fileUrl,
      );

      // Create message DTO
      const messageDto: ChatMessageDto = {
        id: message.id,
        content: message.content,
        messageType: message.messageType as DtoMessageType,
        senderId: message.senderId,
        senderName: client.userName || 'Unknown User',
        senderAvatar: undefined, // TODO: Add avatar support
        fileUrl: message.fileUrl || undefined,
        fileName,
        fileSize,
        roomId,
        roomType,
        createdAt: message.createdAt,
        replyToId,
        replyToContent: undefined, // TODO: Add reply content
      };

      // Broadcast message to all users in the room
      this.server.to(roomName).emit('newMessage', messageDto);

      this.logger.log(
        `Message sent in room ${roomName} by user ${client.userId}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Send message error: ${errorMessage}`);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: TypingDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.userId) {
        return;
      }

      const { roomId, roomType } = data;
      const roomName = this.getRoomName(roomId, roomType);

      // Notify others in the room
      client.to(roomName).emit('userTyping', {
        userId: client.userId,
        userName: client.userName,
        roomId,
        roomType,
        timestamp: new Date(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Typing error: ${errorMessage}`);
    }
  }

  @SubscribeMessage('stopTyping')
  handleStopTyping(
    @MessageBody() data: TypingDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.userId) {
        return;
      }

      const { roomId, roomType } = data;
      const roomName = this.getRoomName(roomId, roomType);

      // Notify others in the room
      client.to(roomName).emit('userStopTyping', {
        userId: client.userId,
        userName: client.userName,
        roomId,
        roomType,
        timestamp: new Date(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Stop typing error: ${errorMessage}`);
    }
  }

  // Helper methods
  private getRoomName(roomId: string, roomType: ChatRoomType): string {
    return `${roomType.toLowerCase()}_${roomId}`;
  }

  private async verifyToken(token: string): Promise<JwtPayload | null> {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      return payload as JwtPayload;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Token verification failed: ${errorMessage}`);
      return null;
    }
  }

  private async verifyRoomAccess(
    userId: string,
    roomId: string,
    roomType: ChatRoomType,
  ): Promise<boolean> {
    try {
      switch (roomType) {
        case ChatRoomType.SESSION: {
          const session = await this.prisma.session.findFirst({
            where: {
              id: roomId,
              OR: [{ userId }, { listenerId: userId }],
            },
          });
          return !!session;
        }

        case ChatRoomType.GROUP: {
          const groupMember = await this.prisma.groupMember.findFirst({
            where: {
              groupId: roomId,
              userId,
            },
          });
          return !!groupMember;
        }

        case ChatRoomType.MEETING: {
          const meeting = (await (this.prisma as any).meeting.findFirst({
            where: {
              id: roomId,
            },
          })) as { id: string; groupId: string } | null;

          if (!meeting) return false;

          // Check if user is a member of the group
          const groupMember = await this.prisma.groupMember.findFirst({
            where: {
              groupId: meeting.groupId,
              userId,
            },
          });

          return !!groupMember;
        }

        case ChatRoomType.DIRECT:
          // For direct messages, check if users are connected
          return this.connectedUsers.has(roomId);

        default:
          return false;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Room access verification error: ${errorMessage}`);
      return false;
    }
  }

  private async storeMessage(
    roomId: string,
    roomType: ChatRoomType,
    senderId: string,
    content: string,
    messageType: DtoMessageType,
    fileUrl?: string,
  ) {
    try {
      const messageData: MessageData = {
        senderId,
        receiverId: senderId, // Will be updated based on room type
        content,
        messageType: messageType as PrismaMessageType,
        fileUrl,
      };

      // Set the appropriate room reference
      switch (roomType) {
        case ChatRoomType.SESSION:
          messageData.sessionId = roomId;
          break;
        case ChatRoomType.GROUP:
          messageData.groupId = roomId;
          break;
        case ChatRoomType.MEETING:
          messageData.meetingId = roomId;
          break;
        case ChatRoomType.DIRECT:
          messageData.receiverId = roomId;
          break;
      }

      return await this.prisma.message.create({
        data: messageData,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Store message error: ${errorMessage}`);
      throw error;
    }
  }

  private async getRoomMessages(
    roomId: string,
    roomType: ChatRoomType,
  ): Promise<ChatMessageDto[]> {
    try {
      const whereClause: WhereClause = {};

      switch (roomType) {
        case ChatRoomType.SESSION:
          whereClause.sessionId = roomId;
          break;
        case ChatRoomType.GROUP:
          whereClause.groupId = roomId;
          break;
        case ChatRoomType.MEETING:
          whereClause.meetingId = roomId;
          break;
        case ChatRoomType.DIRECT:
          whereClause.OR = [{ senderId: roomId }, { receiverId: roomId }];
          break;
      }

      const messages = await this.prisma.message.findMany({
        where: whereClause,
        include: {
          sender: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: 50, // Limit to last 50 messages
      });

      return messages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        messageType: msg.messageType as DtoMessageType,
        senderId: msg.senderId,
        senderName: `${msg.sender.firstName} ${msg.sender.lastName}`,
        senderAvatar: undefined,
        fileUrl: msg.fileUrl || undefined,
        fileName: undefined,
        fileSize: undefined,
        roomId,
        roomType,
        createdAt: msg.createdAt,
        replyToId: undefined,
        replyToContent: undefined,
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Get room messages error: ${errorMessage}`);
      return [];
    }
  }

  // Public methods for other services to use
  broadcastToRoom(
    roomId: string,
    roomType: ChatRoomType,
    event: string,
    data: BroadcastData,
  ) {
    const roomName = this.getRoomName(roomId, roomType);
    this.server.to(roomName).emit(event, data);
  }

  broadcastToUser(userId: string, event: string, data: BroadcastData) {
    try {
      const userSocket = this.connectedUsers.get(userId);
      if (userSocket) {
        userSocket.emit(event, data);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to broadcast to user ${userId}: ${errorMessage}`,
      );
    }
  }

  broadcastToUsers(userIds: string[], event: string, data: BroadcastData) {
    userIds.forEach((userId) => {
      this.broadcastToUser(userId, event, data);
    });
  }
}
