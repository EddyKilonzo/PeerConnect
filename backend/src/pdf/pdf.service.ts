import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument from 'pdfkit';
import { AiService } from '../ai/ai.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

// Define a more specific type for PDFKit document
type PDFKitDoc = InstanceType<typeof PDFDocument>;

export class SessionSummaryPdfDto {
  sessionId: string;
  keyPoints: string[];
  emotionalTone: string;
  actionItems: string[];
  suggestedResources: string[];
  sessionDate: Date;
  topic: string;
  listenerName: string;
  userName: string;
}

export class GroupSummaryPdfDto {
  groupId: string;
  groupName: string;
  topicsCovered: string[];
  groupSentiment: string;
  recommendedResources: string[];
  meetingDate: Date;
  topic: string;
  memberCount: number;
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async generateSessionSummaryPdf(sessionId: string): Promise<Buffer> {
    try {
      // Get session details with summary
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          summary: true,
          topic: true,
          listener: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      if (!session.summary) {
        throw new NotFoundException('Session summary not found');
      }

      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50,
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));

      // Add header
      this.addHeader(doc, 'Session Summary Report');

      // Add session information
      this.addSessionInfo(doc, {
        sessionId: session.id,
        keyPoints: session.summary.keyPoints,
        emotionalTone: session.summary.emotionalTone,
        actionItems: session.summary.actionItems,
        suggestedResources: session.summary.suggestedResources,
        sessionDate: session.startTime,
        topic: session.topic.name,
        listenerName: `${session.listener.firstName} ${session.listener.lastName}`,
        userName: `${session.user.firstName} ${session.user.lastName}`,
      });

      // Finalize PDF
      doc.end();

      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          const result = Buffer.concat(chunks);
          this.logger.log(
            `Session summary PDF generated for session ${sessionId}`,
          );
          resolve(result);
        });

        doc.on('error', (error) => {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Error generating PDF for session ${sessionId}:`,
            errorMessage,
          );
          reject(new Error(`PDF generation failed: ${errorMessage}`));
        });
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to generate session summary PDF for ${sessionId}:`,
        errorMessage,
      );
      throw error;
    }
  }

  async generateGroupSummaryPdf(groupId: string): Promise<Buffer> {
    try {
      // Get group details with summary
      const group = await this.prisma.group.findUnique({
        where: { id: groupId },
        include: {
          summary: true,
          topic: true,
          members: true,
        },
      });

      if (!group) {
        throw new NotFoundException('Group not found');
      }

      if (!group.summary) {
        throw new NotFoundException('Group summary not found');
      }

      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50,
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));

      // Add header
      this.addHeader(doc, 'Group Discussion Summary Report');

      // Add group information
      this.addGroupInfo(doc, {
        groupId: group.id,
        groupName: group.name,
        topicsCovered: group.summary.topicsCovered,
        groupSentiment: group.summary.groupSentiment,
        recommendedResources: group.summary.recommendedResources,
        meetingDate: group.createdAt,
        topic: group.topic.name,
        memberCount: group.members.length,
      });

      // Finalize PDF
      doc.end();

      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          const result = Buffer.concat(chunks);
          this.logger.log(`Group summary PDF generated for group ${groupId}`);
          resolve(result);
        });

        doc.on('error', (error) => {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Error generating PDF for group ${groupId}:`,
            errorMessage,
          );
          reject(new Error(`PDF generation failed: ${errorMessage}`));
        });
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to generate group summary PDF for ${groupId}:`,
        errorMessage,
      );
      throw error;
    }
  }

  private addHeader(doc: PDFKitDoc, title: string): void {
    // Title
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text(title, { align: 'center' })
      .moveDown(2);

    // Date
    doc
      .fontSize(12)
      .font('Helvetica')
      .text(`Generated on: ${new Date().toLocaleDateString()}`, {
        align: 'right',
      })
      .moveDown(2);
  }

  private addSessionInfo(doc: PDFKitDoc, data: SessionSummaryPdfDto): void {
    // Session Details Section
    doc.fontSize(16).font('Helvetica-Bold').text('Session Details').moveDown(1);

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Date: ${data.sessionDate.toLocaleDateString()}`)
      .text(`Topic: ${data.topic}`)
      .text(`Listener: ${data.listenerName}`)
      .text(`User: ${data.userName}`)
      .moveDown(2);

    // Key Points Section
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Key Points Discussed')
      .moveDown(1);

    data.keyPoints.forEach((point) => {
      doc.fontSize(10).font('Helvetica').text(`• ${point}`).moveDown(0.5);
    });
    doc.moveDown(1);

    // Emotional Tone Section
    doc.fontSize(14).font('Helvetica-Bold').text('Emotional Tone').moveDown(1);

    doc.fontSize(10).font('Helvetica').text(data.emotionalTone).moveDown(2);

    // Action Items Section
    doc.fontSize(14).font('Helvetica-Bold').text('Action Items').moveDown(1);

    data.actionItems.forEach((item) => {
      doc.fontSize(10).font('Helvetica').text(`• ${item}`).moveDown(0.5);
    });
    doc.moveDown(1);

    // Suggested Resources Section
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Suggested Resources')
      .moveDown(1);

    data.suggestedResources.forEach((resource) => {
      doc.fontSize(10).font('Helvetica').text(`• ${resource}`).moveDown(0.5);
    });
  }

  private addGroupInfo(doc: PDFKitDoc, data: GroupSummaryPdfDto): void {
    // Group Details Section
    doc.fontSize(16).font('Helvetica-Bold').text('Group Details').moveDown(1);

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Group Name: ${data.groupName}`)
      .text(`Date: ${data.meetingDate.toLocaleDateString()}`)
      .text(`Topic: ${data.topic}`)
      .text(`Members: ${data.memberCount}`)
      .moveDown(2);

    // Topics Covered Section
    doc.fontSize(14).font('Helvetica-Bold').text('Topics Covered').moveDown(1);

    data.topicsCovered.forEach((topic) => {
      doc.fontSize(10).font('Helvetica').text(`• ${topic}`).moveDown(0.5);
    });
    doc.moveDown(1);

    // Group Sentiment Section
    doc.fontSize(14).font('Helvetica-Bold').text('Group Sentiment').moveDown(1);

    doc.fontSize(10).font('Helvetica').text(data.groupSentiment).moveDown(2);

    // Recommended Resources Section
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Recommended Resources')
      .moveDown(1);

    data.recommendedResources.forEach((resource) => {
      doc.fontSize(10).font('Helvetica').text(`• ${resource}`).moveDown(0.5);
    });
  }

  async updateSessionSummaryPdfUrl(
    sessionId: string,
    pdfUrl: string,
  ): Promise<void> {
    try {
      await this.prisma.sessionSummary.update({
        where: { sessionId },
        data: { pdfUrl },
      });

      this.logger.log(`PDF URL updated for session summary ${sessionId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to update PDF URL for session ${sessionId}:`,
        errorMessage,
      );
      throw error;
    }
  }

  async updateGroupSummaryPdfUrl(
    groupId: string,
    pdfUrl: string,
  ): Promise<void> {
    try {
      await this.prisma.groupSummary.update({
        where: { groupId },
        data: { pdfUrl },
      });

      this.logger.log(`PDF URL updated for group summary ${groupId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to update PDF URL for group ${groupId}:`,
        errorMessage,
      );
      throw error;
    }
  }

  async generateAndStoreSessionSummary(
    sessionId: string,
    messages: string[],
  ): Promise<{ summary: any; pdfUrl: string }> {
    try {
      this.logger.log(`Generating AI summary for session ${sessionId}`);

      // Generate AI summary
      const aiSummary = await this.aiService.generateSessionSummary(messages);

      // Create or update session summary in database
      const summary = await this.prisma.sessionSummary.upsert({
        where: { sessionId },
        update: {
          keyPoints: aiSummary.keyPoints,
          emotionalTone: aiSummary.emotionalTone,
          actionItems: aiSummary.actionItems,
          suggestedResources: aiSummary.suggestedResources,
          aiGenerated: true,
        },
        create: {
          sessionId,
          keyPoints: aiSummary.keyPoints,
          emotionalTone: aiSummary.emotionalTone,
          actionItems: aiSummary.actionItems,
          suggestedResources: aiSummary.suggestedResources,
          aiGenerated: true,
        },
      });

      // Generate PDF
      const pdfBuffer = await this.generateSessionSummaryPdf(sessionId);

      // Upload PDF to Cloudinary
      const uploadResult = await this.cloudinaryService.uploadFile(pdfBuffer, {
        folder: 'session-summaries',
        resource_type: 'raw',
        public_id: `session-summary-${sessionId}`,
      });
      const pdfUrl = uploadResult.secure_url;

      // Update summary with PDF URL
      await this.updateSessionSummaryPdfUrl(sessionId, pdfUrl);

      this.logger.log(
        `Session summary and PDF generated successfully for session ${sessionId}`,
      );

      return { summary, pdfUrl };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to generate and store session summary for ${sessionId}:`,
        errorMessage,
      );
      throw error;
    }
  }

  async generateAndStoreGroupSummary(
    groupId: string,
    messages: string[],
  ): Promise<{ summary: any; pdfUrl: string }> {
    try {
      this.logger.log(`Generating AI summary for group ${groupId}`);

      // Generate AI summary
      const aiSummary = await this.aiService.generateGroupSummary(messages);

      // Create or update group summary in database
      const summary = await this.prisma.groupSummary.upsert({
        where: { groupId },
        update: {
          topicsCovered: aiSummary.topicsCovered,
          groupSentiment: aiSummary.groupSentiment,
          recommendedResources: aiSummary.recommendedResources,
          aiGenerated: true,
        },
        create: {
          groupId,
          topicsCovered: aiSummary.topicsCovered,
          groupSentiment: aiSummary.groupSentiment,
          recommendedResources: aiSummary.recommendedResources,
          aiGenerated: true,
        },
      });

      // Generate PDF
      const pdfBuffer = await this.generateGroupSummaryPdf(groupId);

      // Upload PDF to Cloudinary
      const uploadResult = await this.cloudinaryService.uploadFile(pdfBuffer, {
        folder: 'group-summaries',
        resource_type: 'raw',
        public_id: `group-summary-${groupId}`,
      });
      const pdfUrl = uploadResult.secure_url;

      // Update summary with PDF URL
      await this.updateGroupSummaryPdfUrl(groupId, pdfUrl);

      this.logger.log(
        `Group summary and PDF generated successfully for group ${groupId}`,
      );

      return { summary, pdfUrl };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to generate and store group summary for ${groupId}:`,
        errorMessage,
      );
      throw error;
    }
  }

  async getSessionSummaryWithPdf(sessionId: string): Promise<{
    summary: any;
    pdfUrl: string;
  }> {
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
        throw new NotFoundException('Session summary not found');
      }

      if (!summary.pdfUrl) {
        throw new NotFoundException('PDF not yet generated for this summary');
      }

      return {
        summary,
        pdfUrl: summary.pdfUrl,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to get session summary with PDF for ${sessionId}:`,
        errorMessage,
      );
      throw error;
    }
  }

  async getGroupSummaryWithPdf(groupId: string): Promise<{
    summary: any;
    pdfUrl: string;
  }> {
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
        throw new NotFoundException('Group summary not found');
      }

      if (!summary.pdfUrl) {
        throw new NotFoundException('PDF not yet generated for this summary');
      }

      return {
        summary,
        pdfUrl: summary.pdfUrl,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to get group summary with PDF for ${groupId}:`,
        errorMessage,
      );
      throw error;
    }
  }

  async uploadMeetingPdf(
    pdfBuffer: Buffer,
    meetingId: string,
  ): Promise<{ secure_url: string }> {
    try {
      this.logger.log(`Uploading meeting PDF for meeting ${meetingId}`);

      const result = await this.cloudinaryService.uploadFile(pdfBuffer, {
        folder: 'peerconnect/meetings',
        public_id: `meeting_${meetingId}`,
        resource_type: 'raw',
        overwrite: true,
      });

      this.logger.log(`Meeting PDF uploaded successfully: ${result.public_id}`);
      return { secure_url: result.secure_url };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to upload meeting PDF for ${meetingId}:`,
        errorMessage,
      );
      throw error;
    }
  }
}
