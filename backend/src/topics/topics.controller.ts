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
} from '@nestjs/swagger';
import { TopicsService, TopicDto, UserTopicDto } from './topics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards';
import { TopicSelectionDto } from './dto';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('topics')
@Controller('topics')
export class TopicsController {
  private readonly logger = new Logger(TopicsController.name);

  constructor(
    private readonly topicsService: TopicsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all available topics' })
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
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get topics for user selection with current selections marked',
  })
  @ApiResponse({
    status: 200,
    description: 'Topics with selection status for the authenticated user',
    type: [UserTopicDto],
  })
  async getTopicsForUserSelection(@Request() req): Promise<UserTopicDto[]> {
    const userId = req.user.sub;
    this.logger.log(`Getting topics for user selection: ${userId}`);
    return this.topicsService.getTopicsForUserSelection(userId);
  }

  @Get('user')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user's selected topics" })
  @ApiResponse({
    status: 200,
    description: "User's selected topics",
    type: [TopicDto],
  })
  async getUserTopics(@Request() req): Promise<TopicDto[]> {
    const userId = req.user.sub;
    this.logger.log(`Getting topics for user: ${userId}`);
    return this.topicsService.getUserTopics(userId);
  }

  @Put('user')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Update user's topic selection (3-5 topics required)",
  })
  @ApiResponse({
    status: 200,
    description: 'Updated user topics',
    type: [TopicDto],
  })
  async updateUserTopics(
    @Request() req,
    @Body() dto: TopicSelectionDto,
  ): Promise<TopicDto[]> {
    const userId = req.user.sub;
    this.logger.log(`Updating topics for user: ${userId}`);
    return this.topicsService.updateUserTopics(userId, dto.topicIds);
  }

  @Post('user/initial-selection')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Set initial topic selection for new users (3-5 topics required)',
  })
  @ApiResponse({
    status: 200,
    description: 'Initial topics set successfully',
    type: [TopicDto],
  })
  async setInitialTopicSelection(
    @Request() req,
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
  @ApiOperation({ summary: 'Get topic by ID' })
  @ApiResponse({
    status: 200,
    description: 'Topic details',
    type: TopicDto,
  })
  async getTopicById(@Param('id') id: string): Promise<TopicDto | null> {
    this.logger.log(`Getting topic by ID: ${id}`);
    return this.topicsService.getTopicById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new topic (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Topic created successfully',
    type: TopicDto,
  })
  async createTopic(
    @Body() body: { name: string; description?: string },
  ): Promise<TopicDto> {
    this.logger.log(`Creating new topic: ${body.name}`);
    return this.topicsService.createTopic(body.name, body.description);
  }
}
