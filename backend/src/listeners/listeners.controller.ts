import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  Logger,
  Body,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  ListenersService,
  ListenerMatchDto,
  ListenerRecommendationDto,
  ListenerApplicationDto,
  CreateListenerApplicationDto,
  UpdateListenerApplicationDto,
} from './listeners.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  RoleBasedGuard,
  ADMIN_ONLY,
  LISTENER_OR_USER,
} from '../auth/guards/role-based.guard';

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

@ApiTags('Listeners')
@Controller('listeners')
@UseGuards(JwtAuthGuard, RoleBasedGuard)
@LISTENER_OR_USER()
@ApiBearerAuth('JWT-auth')
export class ListenersController {
  private readonly logger = new Logger(ListenersController.name);

  constructor(private readonly listenersService: ListenersService) {}

  @Get('matches')
  @ApiOperation({
    summary: 'Find listeners based on topic overlap',
    description:
      'Find listeners based on topic overlap with current user. Available to all authenticated users (USER, LISTENER, ADMIN).',
  })
  @ApiResponse({
    status: 200,
    description: 'List of listeners sorted by topic overlap',
    type: [ListenerMatchDto],
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of listeners to return (default: 10)',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
  })
  async findListenersByTopicOverlap(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: number,
  ): Promise<ListenerMatchDto[]> {
    const userId = req.user.sub;
    const limitValue = limit ? Math.min(Math.max(limit, 1), 50) : 10; // Ensure limit is between 1-50

    this.logger.log(
      `Finding listeners for user ${userId} with limit ${limitValue}`,
    );
    return this.listenersService.findListenersByTopicOverlap(
      userId,
      limitValue,
    );
  }

  @Get('recommendations')
  @ApiOperation({
    summary: 'Get personalized listener recommendations',
    description:
      'Get personalized listener recommendations for current user. Available to all authenticated users (USER, LISTENER, ADMIN).',
  })
  @ApiResponse({
    status: 200,
    description: 'List of listener recommendations with confidence scores',
    type: [ListenerRecommendationDto],
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of recommendations to return (default: 10)',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
  })
  async getListenerRecommendations(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: number,
  ): Promise<ListenerRecommendationDto[]> {
    const userId = req.user.sub;
    const limitValue = limit ? Math.min(Math.max(limit, 1), 50) : 10;

    this.logger.log(
      `Getting listener recommendations for user ${userId} with limit ${limitValue}`,
    );
    return this.listenersService.getListenerRecommendations(userId, limitValue);
  }

  @Get('topic/:topicId')
  @ApiOperation({ summary: 'Find available listeners for a specific topic' })
  @ApiResponse({
    status: 200,
    description: 'List of available listeners for the specified topic',
    type: [ListenerMatchDto],
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of listeners to return (default: 10)',
  })
  async getAvailableListenersForTopic(
    @Param('topicId') topicId: string,
    @Query('limit') limit?: number,
  ): Promise<ListenerMatchDto[]> {
    const limitValue = limit ? Math.min(Math.max(limit, 1), 50) : 10; // Ensure limit is between 1-50

    this.logger.log(
      `Finding available listeners for topic ${topicId} with limit ${limitValue}`,
    );
    return this.listenersService.getAvailableListenersForTopic(
      topicId,
      limitValue,
    );
  }

  @Post('apply')
  @ApiOperation({
    summary: 'Submit application to become a listener',
    description:
      'Submit an application to become a listener with bio, experience, topics, and motivation',
  })
  @ApiResponse({
    status: 201,
    description: 'Listener application submitted successfully',
    type: ListenerApplicationDto,
  })
  @ApiBody({ type: CreateListenerApplicationDto })
  async submitListenerApplication(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateListenerApplicationDto,
  ): Promise<ListenerApplicationDto> {
    const userId = req.user.sub;
    this.logger.log(`User ${userId} submitting listener application`);
    return this.listenersService.submitListenerApplication(userId, dto);
  }

  @Get('application/my')
  @ApiOperation({
    summary: "Get current user's listener application",
    description:
      "Retrieve the current user's listener application if it exists",
  })
  @ApiResponse({
    status: 200,
    description: 'Listener application retrieved successfully',
    type: ListenerApplicationDto,
  })
  @ApiResponse({
    status: 404,
    description: 'No listener application found for user',
  })
  async getUserListenerApplication(
    @Request() req: AuthenticatedRequest,
  ): Promise<ListenerApplicationDto | null> {
    const userId = req.user.sub;
    this.logger.log(`Getting listener application for user ${userId}`);
    return this.listenersService.getUserListenerApplication(userId);
  }

  @Put('application/update')
  @ApiOperation({
    summary: "Update current user's listener application",
    description: "Update the current user's pending listener application",
  })
  @ApiResponse({
    status: 200,
    description: 'Listener application updated successfully',
    type: ListenerApplicationDto,
  })
  @ApiBody({ type: UpdateListenerApplicationDto })
  async updateListenerApplication(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateListenerApplicationDto,
  ): Promise<ListenerApplicationDto> {
    const userId = req.user.sub;
    this.logger.log(`User ${userId} updating listener application`);
    return this.listenersService.updateListenerApplication(userId, dto);
  }

  @Delete('application/withdraw')
  @ApiOperation({
    summary: "Withdraw current user's listener application",
    description: "Withdraw the current user's pending listener application",
  })
  @ApiResponse({
    status: 200,
    description: 'Listener application withdrawn successfully',
  })
  async withdrawListenerApplication(
    @Request() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    const userId = req.user.sub;
    this.logger.log(`User ${userId} withdrawing listener application`);
    await this.listenersService.withdrawListenerApplication(userId);
    return { message: 'Listener application withdrawn successfully' };
  }

  @Get('applications')
  @ADMIN_ONLY()
  @ApiOperation({
    summary: 'Get all listener applications (Admin only)',
    description: 'Retrieve all listener applications for admin review',
  })
  @ApiResponse({
    status: 200,
    description: 'All listener applications retrieved successfully',
    type: [ListenerApplicationDto],
  })
  async getAllListenerApplications(): Promise<ListenerApplicationDto[]> {
    this.logger.log('Admin retrieving all listener applications');
    return this.listenersService.getAllListenerApplications();
  }

  @Get('applications/status/:status')
  @ADMIN_ONLY()
  @ApiOperation({
    summary: 'Get listener applications by status (Admin only)',
    description:
      'Retrieve listener applications filtered by status (PENDING, APPROVED, REJECTED)',
  })
  @ApiResponse({
    status: 200,
    description: 'Listener applications by status retrieved successfully',
    type: [ListenerApplicationDto],
  })
  @ApiParam({
    name: 'status',
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    description: 'Application status to filter by',
  })
  async getListenerApplicationsByStatus(
    @Param('status') status: 'PENDING' | 'APPROVED' | 'REJECTED',
  ): Promise<ListenerApplicationDto[]> {
    this.logger.log(
      `Admin retrieving listener applications with status: ${status}`,
    );
    return this.listenersService.getListenerApplicationsByStatus(status);
  }
}
