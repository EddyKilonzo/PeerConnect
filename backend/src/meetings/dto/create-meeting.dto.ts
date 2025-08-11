import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  IsEnum,
} from 'class-validator';

export enum MeetingStatus {
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum MeetingType {
  GROUP_THERAPY = 'GROUP_THERAPY',
  SUPPORT_GROUP = 'SUPPORT_GROUP',
  WORKSHOP = 'WORKSHOP',
  DISCUSSION = 'DISCUSSION',
}

export class CreateMeetingDto {
  @ApiProperty({ description: 'Group ID where the meeting will take place' })
  @IsString()
  groupId: string;

  @ApiProperty({ description: 'Meeting title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Meeting description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Meeting type', enum: MeetingType })
  @IsEnum(MeetingType)
  type: MeetingType;

  @ApiProperty({ description: 'Scheduled start time' })
  @IsDateString()
  scheduledStartTime: string;

  @ApiPropertyOptional({ description: 'Scheduled end time' })
  @IsOptional()
  @IsDateString()
  scheduledEndTime?: string;

  @ApiPropertyOptional({ description: 'Meeting agenda items' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  agenda?: string[];

  @ApiPropertyOptional({ description: 'Maximum participants' })
  @IsOptional()
  @IsString()
  maxParticipants?: string;

  @ApiPropertyOptional({ description: 'Meeting notes template' })
  @IsOptional()
  @IsString()
  notesTemplate?: string;
}

export class UpdateMeetingDto {
  @ApiPropertyOptional({ description: 'Meeting title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Meeting description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Meeting type', enum: MeetingType })
  @IsOptional()
  @IsEnum(MeetingType)
  type?: MeetingType;

  @ApiPropertyOptional({ description: 'Scheduled start time' })
  @IsOptional()
  @IsDateString()
  scheduledStartTime?: string;

  @ApiPropertyOptional({ description: 'Scheduled end time' })
  @IsOptional()
  @IsDateString()
  scheduledEndTime?: string;

  @ApiPropertyOptional({ description: 'Meeting agenda items' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  agenda?: string[];

  @ApiPropertyOptional({ description: 'Meeting status', enum: MeetingStatus })
  @IsOptional()
  @IsEnum(MeetingStatus)
  status?: MeetingStatus;
}

export class MeetingDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  groupId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: MeetingType })
  type: MeetingType;

  @ApiProperty({ enum: MeetingStatus })
  status: MeetingStatus;

  @ApiProperty()
  scheduledStartTime: Date;

  @ApiPropertyOptional()
  scheduledEndTime?: Date;

  @ApiPropertyOptional()
  actualStartTime?: Date;

  @ApiPropertyOptional()
  actualEndTime?: Date;

  @ApiPropertyOptional()
  agenda?: string[];

  @ApiPropertyOptional()
  maxParticipants?: string;

  @ApiPropertyOptional()
  notesTemplate?: string;

  @ApiPropertyOptional()
  summaryPdfUrl?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
