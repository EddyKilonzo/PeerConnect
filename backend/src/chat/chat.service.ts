import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from '../pdf/pdf.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
  ) {}

  async storeSessionMessage(
    sessionId: string,
    senderId: string,
    content: string,
    messageType: 'TEXT' | 'FILE' | 'IMAGE' = 'TEXT',
    fileUrl?: string,
  ): Promise<any> {
    try {
      const message = await this.prisma.message.create({
        data: {
          senderId,
          receiverId: senderId, // For sessions, we'll determine receiver based on session
          content,
          messageType,
          fileUrl,
          sessionId,
        },
      });

      this.logger.log(
        `Message stored for session ${sessionId} from user ${senderId}`,
      );

      return message;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to store session message for session ${sessionId}:`,
        errorMessage,
      );
      throw error;
    }
  }

  async storeGroupMessage(
    groupId: string,
    senderId: string,
    content: string,
    messageType: 'TEXT' | 'FILE' | 'IMAGE' = 'TEXT',
    fileUrl?: string,
  ): Promise<any> {
    try {
      const message = await this.prisma.message.create({
        data: {
          senderId,
          receiverId: senderId, // For group messages, receiver is the group
          content,
          messageType,
          fileUrl,
          groupId,
        },
      });

      this.logger.log(
        `Message stored for group ${groupId} from user ${senderId}`,
      );

      return message;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to store group message for group ${groupId}:`,
        errorMessage,
      );
      throw error;
    }
  }

  async getSessionMessages(sessionId: string): Promise<string[]> {
    try {
      const messages = await this.prisma.message.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        select: { content: true },
      });

      return messages.map((msg) => msg.content);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to get session messages for session ${sessionId}:`,
        errorMessage,
      );
      throw error;
    }
  }

  async getGroupMessages(groupId: string): Promise<string[]> {
    try {
      const messages = await this.prisma.message.findMany({
        where: { groupId },
        orderBy: { createdAt: 'asc' },
        select: { content: true },
      });

      return messages.map((msg) => msg.content);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to get group messages for group ${groupId}:`,
        errorMessage,
      );
      throw error;
    }
  }

  async endSessionAndGenerateSummary(sessionId: string): Promise<{
    summary: any;
    pdfUrl: string;
  }> {
    try {
      this.logger.log(`Ending session ${sessionId} and generating summary`);

      // Update session status to completed
      await this.prisma.session.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          endTime: new Date(),
        },
      });

      // Get all messages from the session
      const messages = await this.getSessionMessages(sessionId);

      if (messages.length === 0) {
        throw new Error('No messages found for session');
      }

      // Generate AI summary and PDF
      const result = await this.pdfService.generateAndStoreSessionSummary(
        sessionId,
        messages,
      );

      this.logger.log(
        `Session ${sessionId} ended and summary generated successfully`,
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to end session ${sessionId} and generate summary:`,
        errorMessage,
      );
      throw error;
    }
  }

  async endGroupDiscussionAndGenerateSummary(groupId: string): Promise<{
    summary: any;
    pdfUrl: string;
  }> {
    try {
      this.logger.log(
        `Ending group discussion ${groupId} and generating summary`,
      );

      // Get all messages from the group
      const messages = await this.getGroupMessages(groupId);

      if (messages.length === 0) {
        throw new Error('No messages found for group');
      }

      // Generate AI summary and PDF
      const result = await this.pdfService.generateAndStoreGroupSummary(
        groupId,
        messages,
      );

      this.logger.log(
        `Group discussion ${groupId} ended and summary generated successfully`,
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to end group discussion ${groupId} and generate summary:`,
        errorMessage,
      );
      throw error;
    }
  }

  async getSessionSummary(sessionId: string): Promise<any> {
    try {
      const summary = await this.prisma.sessionSummary.findUnique({
        where: { sessionId },
        include: {
          session: {
            include: {
              topic: true,
              listener: true,
              user: true,
            },
          },
        },
      });

      if (!summary) {
        throw new Error('Session summary not found');
      }

      return summary;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to get session summary for session ${sessionId}:`,
        errorMessage,
      );
      throw error;
    }
  }

  async getGroupSummary(groupId: string): Promise<any> {
    try {
      const summary = await this.prisma.groupSummary.findUnique({
        where: { groupId },
        include: {
          group: {
            include: {
              topic: true,
              members: true,
            },
          },
        },
      });

      if (!summary) {
        throw new Error('Group summary not found');
      }

      return summary;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to get group summary for group ${groupId}:`,
        errorMessage,
      );
      throw error;
    }
  }
}
