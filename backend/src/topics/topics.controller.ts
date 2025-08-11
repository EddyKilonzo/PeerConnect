import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { TopicsService, TopicDto, UserTopicDto } from './topics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards';
import { TopicSelectionDto } from './dto';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Topics')
@Controller('topics')
export class TopicsController {
  private readonly logger = new Logger(TopicsController.name);

  constructor(
    private readonly topicsService: TopicsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get all available topics',
    description:
      'Get all available topics. Available to all users (no authentication required).',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all topics',
    type: [TopicDto],
  })
  async getAllTopics(): Promise<TopicDto[]> {
    this.logger.log('Getting all topics');
    return this.topicsService.getAllTopics();
  }

  @Get('user-selection')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get topics for user selection with current selections marked',
    description:
      'Get topics for user selection with current selections marked. Available to all authenticated users (USER, LISTENER, ADMIN).',
  })
  @ApiResponse({
    status: 200,
    description: 'Topics with selection status for the authenticated user',
    type: [UserTopicDto],
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
  })
  async getTopicsForUserSelection(
    @Request() req: { user: { sub: string } },
  ): Promise<UserTopicDto[]> {
    const userId = req.user.sub;
    this.logger.log(`Getting topics for user selection: ${userId}`);
    return this.topicsService.getTopicsForUserSelection(userId);
  }

  @Get('user')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: "Get current user's selected topics",
    description:
      "Get current user's selected topics. Available to all authenticated users (USER, LISTENER, ADMIN).",
  })
  @ApiResponse({
    status: 200,
    description: "User's selected topics",
    type: [TopicDto],
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
  })
  async getUserTopics(
    @Request() req: { user: { sub: string } },
  ): Promise<TopicDto[]> {
    const userId = req.user.sub;
    this.logger.log(`Getting topics for user: ${userId}`);
    return this.topicsService.getUserTopics(userId);
  }

  @Put('user')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: "Update user's topic selection",
    description:
      "Update user's topic selection (3-5 topics required). Available to all authenticated users (USER, LISTENER, ADMIN).",
  })
  @ApiResponse({
    status: 200,
    description: 'Updated user topics',
    type: [TopicDto],
  })
  @ApiBody({ type: TopicSelectionDto })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
  })
  @ApiBadRequestResponse({
    description: 'Invalid topic selection (must be 3-5 topics)',
  })
  async updateUserTopics(
    @Request() req: { user: { sub: string } },
    @Body() dto: TopicSelectionDto,
  ): Promise<TopicDto[]> {
    const userId = req.user.sub;
    this.logger.log(`Updating topics for user: ${userId}`);
    return this.topicsService.updateUserTopics(userId, dto.topicIds);
  }

  @Post('user/initial-selection')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Set initial topic selection for new users',
    description:
      'Set initial topic selection for new users (3-5 topics required). Available to all authenticated users (USER, LISTENER, ADMIN).',
  })
  @ApiResponse({
    status: 200,
    description: 'Initial topics set successfully',
    type: [TopicDto],
  })
  @ApiBody({ type: TopicSelectionDto })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
  })
  @ApiBadRequestResponse({
    description: 'Invalid topic selection (must be 3-5 topics)',
  })
  async setInitialTopicSelection(
    @Request() req: { user: { sub: string } },
    @Body() dto: TopicSelectionDto,
  ): Promise<TopicDto[]> {
    const userId = req.user.sub;
    this.logger.log(`Setting initial topics for user: ${userId}`);

    // Update user's topics and mark profile as completed
    const topics = await this.topicsService.updateUserTopics(
      userId,
      dto.topicIds,
    );

    // Mark profile as completed
    await this.prisma.user.update({
      where: { id: userId },
      data: { profileCompleted: true },
    });

    this.logger.log(
      `Profile completed for user: ${userId} with ${topics.length} topics`,
    );
    return topics;
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get topic by ID',
    description:
      'Get topic by ID. Available to all users (no authentication required).',
  })
  @ApiResponse({
    status: 200,
    description: 'Topic details',
    type: TopicDto,
  })
  @ApiParam({ name: 'id', description: 'Topic ID' })
  @ApiNotFoundResponse({
    description: 'Topic not found',
  })
  async getTopicById(@Param('id') id: string): Promise<TopicDto | null> {
    this.logger.log(`Getting topic by ID: ${id}`);
    return this.topicsService.getTopicById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new topic',
    description: 'Create a new topic. Available to ADMIN role only.',
  })
  @ApiResponse({
    status: 201,
    description: 'Topic created successfully',
    type: TopicDto,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Topic name' },
        description: {
          type: 'string',
          description: 'Topic description (optional)',
        },
      },
      required: ['name'],
    },
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
  })
  @ApiForbiddenResponse({
    description: 'Access denied - ADMIN role required',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  async createTopic(
    @Body() body: { name: string; description?: string },
  ): Promise<TopicDto> {
    this.logger.log(`Creating new topic: ${body.name}`);
    return this.topicsService.createTopic(body.name, body.description);
  }
}
