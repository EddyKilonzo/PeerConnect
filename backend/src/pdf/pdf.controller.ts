import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
  Request,
  Logger,
  NotFoundException,
  BadRequestException,
  Post,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { PdfService } from './pdf.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';

@ApiTags('pdf')
@Controller('pdf')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PdfController {
  private readonly logger = new Logger(PdfController.name);

  constructor(private readonly pdfService: PdfService) {}

  @Get('session/:sessionId/summary')
  @ApiOperation({
    summary: 'Download session summary as PDF',
    description: 'Generate and download a PDF summary of a specific session',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF generated and downloaded successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Session or summary not found',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'ID of the session to generate PDF for',
  })
  async downloadSessionSummaryPdf(
    @Param('sessionId') sessionId: string,
    @Request() req,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const userId = req.user.sub;
      this.logger.log(
        `User ${userId} requesting session summary PDF for session ${sessionId}`,
      );

      // Generate PDF
      const pdfBuffer =
        await this.pdfService.generateSessionSummaryPdf(sessionId);

      // Set response headers for PDF download
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="session-summary-${sessionId}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      });

      // Send PDF buffer
      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to generate session summary PDF for session ${sessionId}:`,
        errorMessage,
      );
      throw error;
    }
  }

  @Get('group/:groupId/summary')
  @ApiOperation({
    summary: 'Download group discussion summary as PDF',
    description:
      'Generate and download a PDF summary of a specific group discussion',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF generated and downloaded successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Group or summary not found',
  })
  @ApiParam({
    name: 'groupId',
    description: 'ID of the group to generate PDF for',
  })
  async downloadGroupSummaryPdf(
    @Param('groupId') groupId: string,
    @Request() req,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const userId = req.user.sub;
      this.logger.log(
        `User ${userId} requesting group summary PDF for group ${groupId}`,
      );

      // Generate PDF
      const pdfBuffer = await this.pdfService.generateGroupSummaryPdf(groupId);

      // Set response headers for PDF download
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="group-summary-${groupId}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      });

      // Send PDF buffer
      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to generate group summary PDF for group ${groupId}:`,
        errorMessage,
      );
      throw error;
    }
  }

  @Get('session/:sessionId/summary/preview')
  @ApiOperation({
    summary: 'Preview session summary PDF in browser',
    description:
      'Generate and display a PDF summary of a specific session in the browser',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF generated and displayed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Session or summary not found',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'ID of the session to preview PDF for',
  })
  async previewSessionSummaryPdf(
    @Param('sessionId') sessionId: string,
    @Request() req,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const userId = req.user.sub;
      this.logger.log(
        `User ${userId} previewing session summary PDF for session ${sessionId}`,
      );

      // Generate PDF
      const pdfBuffer =
        await this.pdfService.generateSessionSummaryPdf(sessionId);

      // Set response headers for PDF preview
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="session-summary-${sessionId}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      });

      // Send PDF buffer
      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to preview session summary PDF for session ${sessionId}:`,
        errorMessage,
      );
      throw error;
    }
  }

  @Get('group/:groupId/summary/preview')
  @ApiOperation({
    summary: 'Preview group discussion summary PDF in browser',
    description:
      'Generate and display a PDF summary of a specific group discussion in the browser',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF generated and displayed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Group or summary not found',
  })
  @ApiParam({
    name: 'groupId',
    description: 'ID of the group to preview PDF for',
  })
  async previewGroupSummaryPdf(
    @Param('groupId') groupId: string,
    @Request() req,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const userId = req.user.sub;
      this.logger.log(
        `User ${userId} previewing group summary PDF for group ${groupId}`,
      );

      // Generate PDF
      const pdfBuffer = await this.pdfService.generateGroupSummaryPdf(groupId);

      // Set response headers for PDF preview
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="group-summary-${groupId}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      });

      // Send PDF buffer
      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to preview group summary PDF for group ${groupId}:`,
        errorMessage,
      );
      throw error;
    }
  }

  @Post('session/:sessionId/summary/generate')
  @ApiOperation({
    summary: 'Generate AI summary and PDF for a session',
    description:
      'Generate an AI-powered summary and PDF for a specific session',
  })
  @ApiResponse({
    status: 201,
    description: 'Session summary and PDF generated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'ID of the session to generate summary for',
  })
  async generateSessionSummaryWithPdf(
    @Param('sessionId') sessionId: string,
    @Body() body: { messages: string[] },
    @Request() req,
  ): Promise<{ summary: any; pdfUrl: string }> {
    try {
      const userId = req.user.sub;
      this.logger.log(
        `User ${userId} requesting AI session summary generation for session ${sessionId}`,
      );

      if (!body.messages || body.messages.length === 0) {
        throw new BadRequestException('Messages array cannot be empty');
      }

      const result = await this.pdfService.generateAndStoreSessionSummary(
        sessionId,
        body.messages,
      );

      this.logger.log(
        `Session summary and PDF generated successfully for session ${sessionId}`,
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to generate session summary with PDF for session ${sessionId}:`,
        errorMessage,
      );
      throw error;
    }
  }

  @Post('group/:groupId/summary/generate')
  @ApiOperation({
    summary: 'Generate AI summary and PDF for a group discussion',
    description:
      'Generate an AI-powered summary and PDF for a specific group discussion',
  })
  @ApiResponse({
    status: 201,
    description: 'Group summary and PDF generated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiParam({
    name: 'groupId',
    description: 'ID of the group to generate summary for',
  })
  async generateGroupSummaryWithPdf(
    @Param('groupId') groupId: string,
    @Body() body: { messages: string[] },
    @Request() req,
  ): Promise<{ summary: any; pdfUrl: string }> {
    try {
      const userId = req.user.sub;
      this.logger.log(
        `User ${userId} requesting AI group summary generation for group ${groupId}`,
      );

      if (!body.messages || body.messages.length === 0) {
        throw new BadRequestException('Messages array cannot be empty');
      }

      const result = await this.pdfService.generateAndStoreGroupSummary(
        groupId,
        body.messages,
      );

      this.logger.log(
        `Group summary and PDF generated successfully for group ${groupId}`,
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to generate group summary with PDF for group ${groupId}:`,
        errorMessage,
      );
      throw error;
    }
  }

  @Get('session/:sessionId/summary/info')
  @ApiOperation({
    summary: 'Get session summary information with PDF URL',
    description: 'Retrieve session summary details and PDF URL',
  })
  @ApiResponse({
    status: 200,
    description: 'Session summary information retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Session summary not found',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'ID of the session to get summary info for',
  })
  async getSessionSummaryInfo(
    @Param('sessionId') sessionId: string,
    @Request() req,
  ): Promise<{ summary: any; pdfUrl: string }> {
    try {
      const userId = req.user.sub;
      this.logger.log(
        `User ${userId} requesting session summary info for session ${sessionId}`,
      );

      const result = await this.pdfService.getSessionSummaryWithPdf(sessionId);

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to get session summary info for session ${sessionId}:`,
        errorMessage,
      );
      throw error;
    }
  }

  @Get('group/:groupId/summary/info')
  @ApiOperation({
    summary: 'Get group summary information with PDF URL',
    description: 'Retrieve group summary details and PDF URL',
  })
  @ApiResponse({
    status: 200,
    description: 'Group summary information retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Group summary not found',
  })
  @ApiParam({
    name: 'groupId',
    description: 'ID of the group to get summary info for',
  })
  async getGroupSummaryInfo(
    @Param('groupId') groupId: string,
    @Request() req,
  ): Promise<{ summary: any; pdfUrl: string }> {
    try {
      const userId = req.user.sub;
      this.logger.log(
        `User ${userId} requesting group summary info for group ${groupId}`,
      );

      const result = await this.pdfService.getGroupSummaryWithPdf(groupId);

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to get group summary info for group ${groupId}:`,
        errorMessage,
      );
      throw error;
    }
  }
}
