import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Logger,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { MeetingsService } from './meetings.service';
import {
  CreateMeetingDto,
  UpdateMeetingDto,
  MeetingDto,
} from './dto/create-meeting.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  RoleBasedGuard,
  Roles,
  ANY_AUTHENTICATED,
  LISTENER_ONLY,
} from '../auth/guards/role-based.guard';
import { Request as ExpressRequest } from 'express';

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

@ApiTags('meetings')
@Controller('meetings')
@UseGuards(JwtAuthGuard, RoleBasedGuard)
@ANY_AUTHENTICATED()
@ApiBearerAuth()
export class MeetingsController {
  private readonly logger = new Logger(MeetingsController.name);

  constructor(private readonly meetingsService: MeetingsService) {}

  @Post()
  @Roles('LISTENER', 'ADMIN')
  @ApiOperation({
    summary: 'Create a new meeting in a group (Listeners and Admins only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Meeting created successfully',
    type: MeetingDto,
  })
  @ApiBody({ type: CreateMeetingDto })
  async createMeeting(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateMeetingDto,
  ) {
    const userId = req.user.sub;
    this.logger.log(
      `Creating meeting "${dto.title}" in group ${dto.groupId} for user ${userId}`,
    );
    return this.meetingsService.createMeeting(userId, dto);
  }

  @Post(':id/start')
  @Roles('LISTENER', 'ADMIN')
  @ApiOperation({
    summary: 'Start a scheduled meeting (Listeners and Admins only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Meeting started successfully',
    type: MeetingDto,
  })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  async startMeeting(
    @Request() req: AuthenticatedRequest,
    @Param('id') meetingId: string,
  ) {
    const userId = req.user.sub;
    this.logger.log(`Starting meeting ${meetingId} by user ${userId}`);
    return this.meetingsService.startMeeting(meetingId, userId);
  }

  @Post(':id/end')
  @Roles('LISTENER', 'ADMIN')
  @ApiOperation({
    summary:
      'End an active meeting and generate summary (Listeners and Admins only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Meeting ended and summary generated successfully',
    type: MeetingDto,
  })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  async endMeeting(
    @Request() req: AuthenticatedRequest,
    @Param('id') meetingId: string,
  ) {
    const userId = req.user.sub;
    this.logger.log(`Ending meeting ${meetingId} by user ${userId}`);
    return this.meetingsService.endMeeting(meetingId, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get meeting details' })
  @ApiResponse({
    status: 200,
    description: 'Meeting details retrieved successfully',
    type: MeetingDto,
  })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  async getMeeting(@Param('id') meetingId: string) {
    this.logger.log(`Getting meeting details for ${meetingId}`);
    return this.meetingsService.getMeeting(meetingId);
  }

  @Get('group/:groupId')
  @ApiOperation({ summary: 'Get all meetings for a specific group' })
  @ApiResponse({
    status: 200,
    description: 'Group meetings retrieved successfully',
    type: [MeetingDto],
  })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by meeting status',
  })
  async getGroupMeetings(
    @Param('groupId') groupId: string,
    @Query('status') status?: string,
  ) {
    this.logger.log(`Getting meetings for group ${groupId}`);
    return this.meetingsService.getGroupMeetings(groupId);
  }

  @Put(':id')
  @Roles('LISTENER', 'ADMIN')
  @ApiOperation({
    summary: 'Update meeting details (Listeners and Admins only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Meeting updated successfully',
    type: MeetingDto,
  })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  @ApiBody({ type: UpdateMeetingDto })
  async updateMeeting(
    @Request() req: AuthenticatedRequest,
    @Param('id') meetingId: string,
    @Body() dto: UpdateMeetingDto,
  ) {
    const userId = req.user.sub;
    this.logger.log(`Updating meeting ${meetingId} by user ${userId}`);
    return this.meetingsService.updateMeeting(meetingId, userId, dto);
  }

  @Delete(':id')
  @Roles('LISTENER', 'ADMIN')
  @ApiOperation({
    summary: 'Delete a meeting (Listeners and Admins only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Meeting deleted successfully',
  })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  async deleteMeeting(
    @Request() req: AuthenticatedRequest,
    @Param('id') meetingId: string,
  ) {
    const userId = req.user.sub;
    this.logger.log(`Deleting meeting ${meetingId} by user ${userId}`);
    return this.meetingsService.deleteMeeting(meetingId, userId);
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Get meeting summary PDF URL' })
  @ApiResponse({
    status: 200,
    description: 'Meeting summary PDF URL retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        summaryPdfUrl: { type: 'string' },
        groupSummary: {
          type: 'object',
          properties: {
            topicsCovered: { type: 'array', items: { type: 'string' } },
            groupSentiment: { type: 'string' },
            recommendedResources: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  async getMeetingSummary(@Param('id') meetingId: string) {
    this.logger.log(`Getting meeting summary for ${meetingId}`);
    const meeting = await this.meetingsService.getMeeting(meetingId);

    // Get group summary if available
    const groupSummary = await this.meetingsService[
      'prisma'
    ].groupSummary.findUnique({
      where: { groupId: meeting.groupId },
    });

    return {
      summaryPdfUrl: meeting.summaryPdfUrl,
      groupSummary: groupSummary
        ? {
            topicsCovered: groupSummary.topicsCovered,
            groupSentiment: groupSummary.groupSentiment,
            recommendedResources: groupSummary.recommendedResources,
          }
        : null,
    };
  }
}
