import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PdfService } from '../pdf/pdf.service';
import { AiService } from '../ai/ai.service';
import {
  CreateMeetingDto,
  UpdateMeetingDto,
  MeetingDto,
  MeetingStatus,
  MeetingType,
} from './dto/create-meeting.dto';

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly pdfService: PdfService,
    private readonly aiService: AiService,
  ) {}

  async createMeeting(
    userId: string,
    dto: CreateMeetingDto,
  ): Promise<MeetingDto> {
    try {
      // Verify user is group leader or admin
      const group = await this.prisma.group.findUnique({
        where: { id: dto.groupId },
        include: {
          leader: true,
          members: {
            where: { userId },
            include: { user: true },
          },
        },
      });

      if (!group) {
        throw new NotFoundException('Group not found');
      }

      if (
        group.leaderId !== userId &&
        !group.members.some((m) => m.role === 'ADMIN')
      ) {
        throw new ForbiddenException(
          'Only group leaders and admins can create meetings',
        );
      }

      const meeting = await this.prisma.meeting.create({
        data: {
          groupId: dto.groupId,
          title: dto.title,
          description: dto.description,
          type: dto.type,
          status: MeetingStatus.SCHEDULED,
          scheduledStartTime: new Date(dto.scheduledStartTime),
          scheduledEndTime: dto.scheduledEndTime
            ? new Date(dto.scheduledEndTime)
            : null,
          agenda: dto.agenda || [],
          maxParticipants: dto.maxParticipants,
          notesTemplate: dto.notesTemplate,
          createdBy: userId,
        },
        include: {
          group: {
            include: {
              topic: true,
            },
          },
        },
      });

      // Notify group members about the new meeting
      await this.notifyGroupMembers(
        dto.groupId,
        'New Meeting Scheduled',
        `A new ${dto.type.toLowerCase().replace('_', ' ')} meeting "${dto.title}" has been scheduled for ${new Date(dto.scheduledStartTime).toLocaleDateString()}`,
      );

      this.logger.log(
        `Created meeting "${dto.title}" in group ${dto.groupId} by user ${userId}`,
      );
      return this.mapToMeetingDto(meeting);
    } catch (error) {
      this.logger.error(
        `Failed to create meeting: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async startMeeting(meetingId: string, userId: string): Promise<MeetingDto> {
    try {
      const meeting = await this.prisma.meeting.findUnique({
        where: { id: meetingId },
        include: { group: true },
      });

      if (!meeting) {
        throw new NotFoundException('Meeting not found');
      }

      // Verify user can start the meeting
      if (!(await this.canManageMeeting(meetingId, userId))) {
        throw new ForbiddenException('You cannot start this meeting');
      }

      if (meeting.status !== MeetingStatus.SCHEDULED) {
        throw new ForbiddenException(
          'Meeting cannot be started in its current status',
        );
      }

      const updatedMeeting = await this.prisma.meeting.update({
        where: { id: meetingId },
        data: {
          status: MeetingStatus.ACTIVE,
          actualStartTime: new Date(),
        },
      });

      this.logger.log(`Started meeting ${meetingId} by user ${userId}`);
      return this.mapToMeetingDto(updatedMeeting);
    } catch (error) {
      this.logger.error(
        `Failed to start meeting: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async endMeeting(meetingId: string, userId: string): Promise<MeetingDto> {
    try {
      const meeting = await this.prisma.meeting.findUnique({
        where: { id: meetingId },
        include: {
          group: true,
          messages: {
            orderBy: { createdAt: 'asc' },
            select: { content: true },
          },
        },
      });

      if (!meeting) {
        throw new NotFoundException('Meeting not found');
      }

      if (!(await this.canManageMeeting(meetingId, userId))) {
        throw new ForbiddenException('You cannot end this meeting');
      }

      if (meeting.status !== MeetingStatus.ACTIVE) {
        throw new ForbiddenException('Meeting is not active');
      }

      // End the meeting
      const updatedMeeting = await this.prisma.meeting.update({
        where: { id: meetingId },
        data: {
          status: MeetingStatus.COMPLETED,
          actualEndTime: new Date(),
        },
      });

      // Generate meeting summary and PDF
      await this.generateMeetingSummary(
        meetingId,
        meeting.messages.map((m) => m.content),
      );

      this.logger.log(`Ended meeting ${meetingId} by user ${userId}`);
      return this.mapToMeetingDto(updatedMeeting);
    } catch (error) {
      this.logger.error(
        `Failed to end meeting: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async generateMeetingSummary(
    meetingId: string,
    messages: string[],
  ): Promise<void> {
    try {
      this.logger.log(`Generating summary for meeting ${meetingId}`);

      // Generate AI summary
      const summary = await this.aiService.generateGroupSummary(messages);

      // Create or update group summary
      const meeting = await this.prisma.meeting.findUnique({
        where: { id: meetingId },
        include: { group: true },
      });

      if (!meeting) {
        throw new NotFoundException('Meeting not found');
      }

      // Update or create group summary
      await this.prisma.groupSummary.upsert({
        where: { groupId: meeting.groupId },
        update: {
          topicsCovered: summary.topicsCovered,
          groupSentiment: summary.groupSentiment,
          recommendedResources: summary.recommendedResources,
          aiGenerated: true,
        },
        create: {
          groupId: meeting.groupId,
          topicsCovered: summary.topicsCovered,
          groupSentiment: summary.groupSentiment,
          recommendedResources: summary.recommendedResources,
          aiGenerated: true,
        },
      });

      // Generate PDF and upload to Cloudinary
      const pdfBuffer = await this.pdfService.generateGroupSummaryPdf(
        meeting.groupId,
      );
      const pdfUrl = await this.uploadMeetingPdf(pdfBuffer, meetingId);

      // Update meeting with PDF URL
      await this.prisma.meeting.update({
        where: { id: meetingId },
        data: { summaryPdfUrl: pdfUrl },
      });

      // Update group summary with PDF URL
      await this.prisma.groupSummary.update({
        where: { groupId: meeting.groupId },
        data: { pdfUrl },
      });

      this.logger.log(
        `Meeting summary generated and PDF uploaded for meeting ${meetingId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to generate meeting summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Don't throw error - meeting can still end without summary
    }
  }

  private async uploadMeetingPdf(
    pdfBuffer: Buffer,
    meetingId: string,
  ): Promise<string> {
    try {
      const result = await this.pdfService.uploadMeetingPdf(
        pdfBuffer,
        meetingId,
      );
      return result.secure_url;
    } catch (error) {
      this.logger.error(
        `Failed to upload meeting PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getMeeting(meetingId: string): Promise<MeetingDto> {
    try {
      const meeting = await this.prisma.meeting.findUnique({
        where: { id: meetingId },
        include: {
          group: {
            include: {
              topic: true,
            },
          },
        },
      });

      if (!meeting) {
        throw new NotFoundException('Meeting not found');
      }

      return this.mapToMeetingDto(meeting);
    } catch (error) {
      this.logger.error(
        `Failed to get meeting: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getGroupMeetings(groupId: string): Promise<MeetingDto[]> {
    try {
      const meetings = await this.prisma.meeting.findMany({
        where: { groupId },
        include: {
          group: {
            include: {
              topic: true,
            },
          },
        },
        orderBy: { scheduledStartTime: 'desc' },
      });

      return meetings.map((meeting) => this.mapToMeetingDto(meeting));
    } catch (error) {
      this.logger.error(
        `Failed to get group meetings: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async updateMeeting(
    meetingId: string,
    userId: string,
    dto: UpdateMeetingDto,
  ): Promise<MeetingDto> {
    try {
      if (!(await this.canManageMeeting(meetingId, userId))) {
        throw new ForbiddenException('You cannot update this meeting');
      }

      const updatedMeeting = await this.prisma.meeting.update({
        where: { id: meetingId },
        data: {
          title: dto.title,
          description: dto.description,
          type: dto.type,
          scheduledStartTime: dto.scheduledStartTime
            ? new Date(dto.scheduledStartTime)
            : undefined,
          scheduledEndTime: dto.scheduledEndTime
            ? new Date(dto.scheduledEndTime)
            : undefined,
          agenda: dto.agenda,
          status: dto.status,
        },
        include: {
          group: {
            include: {
              topic: true,
            },
          },
        },
      });

      this.logger.log(`Updated meeting ${meetingId} by user ${userId}`);
      return this.mapToMeetingDto(updatedMeeting);
    } catch (error) {
      this.logger.error(
        `Failed to update meeting: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async deleteMeeting(meetingId: string, userId: string): Promise<void> {
    try {
      if (!(await this.canManageMeeting(meetingId, userId))) {
        throw new ForbiddenException('You cannot delete this meeting');
      }

      await this.prisma.meeting.delete({
        where: { id: meetingId },
      });

      this.logger.log(`Deleted meeting ${meetingId} by user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete meeting: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  private async canManageMeeting(
    meetingId: string,
    userId: string,
  ): Promise<boolean> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        group: {
          include: {
            leader: true,
            members: {
              where: { userId },
              include: { user: true },
            },
          },
        },
      },
    });

    if (!meeting) return false;

    // Group leader can manage
    if (meeting.group.leaderId === userId) return true;

    // Group admins can manage
    if (meeting.group.members.some((m) => m.role === 'ADMIN')) return true;

    return false;
  }

  private async notifyGroupMembers(
    groupId: string,
    title: string,
    message: string,
  ): Promise<void> {
    try {
      const groupMembers = await this.prisma.groupMember.findMany({
        where: { groupId },
        include: { user: true },
      });

      for (const member of groupMembers) {
        await this.notificationsService.createNotification({
          userId: member.userId,
          title,
          message,
          type: 'MEETING_UPDATE',
          relatedId: groupId,
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to notify group members: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private mapToMeetingDto(meeting: any): MeetingDto {
    return {
      id: meeting.id,
      groupId: meeting.groupId,
      title: meeting.title,
      description: meeting.description,
      type: meeting.type,
      status: meeting.status,
      scheduledStartTime: meeting.scheduledStartTime,
      scheduledEndTime: meeting.scheduledEndTime,
      actualStartTime: meeting.actualStartTime,
      actualEndTime: meeting.actualEndTime,
      agenda: meeting.agenda,
      maxParticipants: meeting.maxParticipants,
      notesTemplate: meeting.notesTemplate,
      summaryPdfUrl: meeting.summaryPdfUrl,
      createdAt: meeting.createdAt,
      updatedAt: meeting.updatedAt,
    };
  }
}
