import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { AiService, SessionSummaryData, GroupSummaryData } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

export class GenerateSessionSummaryDto {
  sessionId: string;
  messages: string[];
}

export class GenerateGroupSummaryDto {
  groupId: string;
  messages: string[];
}

@ApiTags('AI')
@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(private readonly aiService: AiService) {}

  @Post('session/summary')
  @Roles(Role.LISTENER, Role.ADMIN)
  @ApiOperation({
    summary: 'Generate AI summary for a session',
    description:
      'Generate an AI-powered summary of a counseling session. Available to LISTENER and ADMIN roles only.',
  })
  @ApiResponse({
    status: 201,
    description: 'Session summary generated successfully',
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiBody({ type: GenerateSessionSummaryDto })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
  })
  @ApiForbiddenResponse({
    description: 'Access denied - LISTENER or ADMIN role required',
  })
  async generateSessionSummary(
    @Body() dto: GenerateSessionSummaryDto,
    @Request() req: ExpressRequest & { user: { sub: string } },
  ): Promise<SessionSummaryData> {
    try {
      const userId = req.user.sub;
      this.logger.log(
        `User ${userId} requesting AI session summary for session ${dto.sessionId}`,
      );

      if (!dto.messages || dto.messages.length === 0) {
        throw new BadRequestException('Messages array cannot be empty');
      }

      const summary = await this.aiService.generateSessionSummary(dto.messages);

      this.logger.log(
        `AI session summary generated successfully for session ${dto.sessionId}`,
      );

      return summary;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to generate AI session summary for session ${dto.sessionId}:`,
        errorMessage,
      );
      throw error;
    }
  }

  @Post('group/summary')
  @Roles(Role.LISTENER, Role.ADMIN)
  @ApiOperation({
    summary: 'Generate AI summary for a group discussion',
    description:
      'Generate an AI-powered summary of a group discussion. Available to LISTENER and ADMIN roles only.',
  })
  @ApiResponse({
    status: 201,
    description: 'Group summary generated successfully',
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiBody({ type: GenerateGroupSummaryDto })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
  })
  @ApiForbiddenResponse({
    description: 'Access denied - LISTENER or ADMIN role required',
  })
  async generateGroupSummary(
    @Body() dto: GenerateGroupSummaryDto,
    @Request() req: ExpressRequest & { user: { sub: string } },
  ): Promise<GroupSummaryData> {
    try {
      const userId = req.user.sub;
      this.logger.log(
        `User ${userId} requesting AI group summary for group ${dto.groupId}`,
      );

      if (!dto.messages || dto.messages.length === 0) {
        throw new BadRequestException('Messages array cannot be empty');
      }

      const summary = await this.aiService.generateGroupSummary(dto.messages);

      this.logger.log(
        `AI group summary generated successfully for group ${dto.groupId}`,
      );

      return summary;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to generate AI group summary for group ${dto.groupId}:`,
        errorMessage,
      );
      throw error;
    }
  }
}
