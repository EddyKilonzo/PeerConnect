import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';

export enum MessageType {
  TEXT = 'TEXT',
  FILE = 'FILE',
  IMAGE = 'IMAGE',
  SYSTEM = 'SYSTEM',
  TYPING = 'TYPING',
  STOP_TYPING = 'STOP_TYPING',
}

export enum ChatRoomType {
  SESSION = 'SESSION',
  GROUP = 'GROUP',
  MEETING = 'MEETING',
  DIRECT = 'DIRECT',
}

export class ChatMessageDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty({ enum: MessageType })
  @IsEnum(MessageType)
  messageType: MessageType;

  @ApiProperty()
  @IsUUID()
  senderId: string;

  @ApiProperty()
  @IsString()
  senderName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  senderAvatar?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileSize?: string;

  @ApiProperty()
  @IsUUID()
  roomId: string;

  @ApiProperty({ enum: ChatRoomType })
  @IsEnum(ChatRoomType)
  roomType: ChatRoomType;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  replyToId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  replyToContent?: string;
}

export class SendMessageDto {
  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty({ enum: MessageType })
  @IsEnum(MessageType)
  messageType: MessageType;

  @ApiProperty()
  @IsUUID()
  roomId: string;

  @ApiProperty({ enum: ChatRoomType })
  @IsEnum(ChatRoomType)
  roomType: ChatRoomType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileSize?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  replyToId?: string;
}

export class JoinRoomDto {
  @ApiProperty()
  @IsUUID()
  roomId: string;

  @ApiProperty({ enum: ChatRoomType })
  @IsEnum(ChatRoomType)
  roomType: ChatRoomType;

  @ApiProperty()
  @IsUUID()
  userId: string;
}

export class LeaveRoomDto {
  @ApiProperty()
  @IsUUID()
  roomId: string;

  @ApiProperty({ enum: ChatRoomType })
  @IsEnum(ChatRoomType)
  roomType: ChatRoomType;

  @ApiProperty()
  @IsUUID()
  userId: string;
}

export class TypingDto {
  @ApiProperty()
  @IsUUID()
  roomId: string;

  @ApiProperty({ enum: ChatRoomType })
  @IsEnum(ChatRoomType)
  roomType: ChatRoomType;

  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty()
  @IsString()
  userName: string;
}

export class ChatEvent {
  @ApiProperty()
  event: string;

  @ApiProperty()
  data: any;

  @ApiProperty()
  timestamp: Date;
}
