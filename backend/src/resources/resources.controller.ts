import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import {
  ResourcesService,
  CreateResourceDto,
  UpdateResourceDto,
  ResourceDto,
  ResourceApprovalDto,
} from './resources.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';

@ApiTags('Resources')
@Controller('resources')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ResourcesController {
  private readonly logger = new Logger(ResourcesController.name);

  constructor(private readonly resourcesService: ResourcesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('LISTENER', 'ADMIN')
  @ApiOperation({
    summary: 'Upload a new resource',
    description:
      'Upload a new resource. Available to LISTENER and ADMIN roles only.',
  })
  @ApiResponse({
    status: 201,
    description: 'Resource uploaded successfully',
    type: ResourceDto,
  })
  @ApiBody({ type: CreateResourceDto })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
  })
  @ApiForbiddenResponse({
    description: 'Access denied - LISTENER or ADMIN role required',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  async uploadResource(
    @Request() req,
    @Body() dto: CreateResourceDto,
  ): Promise<ResourceDto> {
    const userId = req.user.sub;
    this.logger.log(`User ${userId} uploading resource "${dto.title}"`);
    return this.resourcesService.uploadResource(userId, dto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update resource details',
    description:
      'Update resource details. Available to all authenticated users (USER, LISTENER, ADMIN).',
  })
  @ApiResponse({
    status: 200,
    description: 'Resource updated successfully',
    type: ResourceDto,
  })
  @ApiParam({ name: 'id', description: 'Resource ID' })
  @ApiBody({ type: UpdateResourceDto })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
  })
  @ApiNotFoundResponse({
    description: 'Resource not found',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  async updateResource(
    @Request() req,
    @Param('id') resourceId: string,
    @Body() dto: UpdateResourceDto,
  ): Promise<ResourceDto> {
    const userId = req.user.sub;
    this.logger.log(`User ${userId} updating resource ${resourceId}`);
    return this.resourcesService.updateResource(userId, resourceId, dto);
  }

  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Approve or reject a resource',
    description: 'Approve or reject a resource. Available to ADMIN role only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resource approval status updated successfully',
    type: ResourceDto,
  })
  @ApiParam({ name: 'id', description: 'Resource ID' })
  @ApiBody({ type: ResourceApprovalDto })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
  })
  @ApiForbiddenResponse({
    description: 'Access denied - ADMIN role required',
  })
  @ApiNotFoundResponse({
    description: 'Resource not found',
  })
  async approveResource(
    @Request() req,
    @Param('id') resourceId: string,
    @Body() dto: ResourceApprovalDto,
  ): Promise<ResourceDto> {
    const adminUserId = req.user.sub;
    this.logger.log(
      `Admin ${adminUserId} ${dto.isApproved ? 'approving' : 'rejecting'} resource ${resourceId}`,
    );
    return this.resourcesService.approveResource(adminUserId, resourceId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a resource' })
  @ApiResponse({
    status: 200,
    description: 'Resource deleted successfully',
  })
  @ApiParam({ name: 'id', description: 'Resource ID' })
  async deleteResource(
    @Request() req,
    @Param('id') resourceId: string,
  ): Promise<{ message: string }> {
    const userId = req.user.sub;
    this.logger.log(`User ${userId} deleting resource ${resourceId}`);
    await this.resourcesService.deleteResource(userId, resourceId);
    return { message: 'Resource deleted successfully' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get resource details' })
  @ApiResponse({
    status: 200,
    description: 'Resource details retrieved successfully',
    type: ResourceDto,
  })
  @ApiParam({ name: 'id', description: 'Resource ID' })
  async getResource(@Param('id') resourceId: string): Promise<ResourceDto> {
    this.logger.log(`Getting resource details for ${resourceId}`);
    return this.resourcesService.getResource(resourceId);
  }

  @Get('topic/:topicId')
  @ApiOperation({ summary: 'Get resources by topic' })
  @ApiResponse({
    status: 200,
    description: 'Resources by topic retrieved successfully',
    type: [ResourceDto],
  })
  @ApiParam({ name: 'topicId', description: 'Topic ID' })
  @ApiQuery({
    name: 'includeUnapproved',
    required: false,
    type: Boolean,
    description: 'Include unapproved resources (Admin only)',
  })
  async getResourcesByTopic(
    @Param('topicId') topicId: string,
    @Query('includeUnapproved') includeUnapproved?: boolean,
    @Request() req?: any,
  ): Promise<ResourceDto[]> {
    // Only admins can see unapproved resources
    if (includeUnapproved && req?.user?.role !== 'ADMIN') {
      includeUnapproved = false;
    }

    this.logger.log(
      `Getting resources for topic ${topicId} (includeUnapproved: ${includeUnapproved})`,
    );
    return this.resourcesService.getResourcesByTopic(
      topicId,
      includeUnapproved,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all resources' })
  @ApiResponse({
    status: 200,
    description: 'All resources retrieved successfully',
    type: [ResourceDto],
  })
  @ApiQuery({
    name: 'includeUnapproved',
    required: false,
    type: Boolean,
    description: 'Include unapproved resources (Admin only)',
  })
  async getAllResources(
    @Query('includeUnapproved') includeUnapproved?: boolean,
    @Request() req?: any,
  ): Promise<ResourceDto[]> {
    // Only admins can see unapproved resources
    if (includeUnapproved && req?.user?.role !== 'ADMIN') {
      includeUnapproved = false;
    }

    this.logger.log(
      `Getting all resources (includeUnapproved: ${includeUnapproved})`,
    );
    return this.resourcesService.getAllResources(includeUnapproved);
  }

  @Get('admin/pending-approval')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get resources pending approval (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Pending approval resources retrieved successfully',
    type: [ResourceDto],
  })
  async getPendingApprovalResources(): Promise<ResourceDto[]> {
    this.logger.log('Getting resources pending approval');
    return this.resourcesService.getPendingApprovalResources();
  }

  @Post(':id/download')
  @ApiOperation({ summary: 'Track resource download' })
  @ApiResponse({
    status: 200,
    description: 'Download tracked successfully',
  })
  @ApiParam({ name: 'id', description: 'Resource ID' })
  async trackDownload(
    @Param('id') resourceId: string,
  ): Promise<{ message: string }> {
    this.logger.log(`Tracking download for resource ${resourceId}`);
    await this.resourcesService.incrementDownloadCount(resourceId);
    return { message: 'Download tracked successfully' };
  }

  @Get(':id/download-file')
  @ApiOperation({ summary: 'Download resource file' })
  @ApiResponse({
    status: 200,
    description: 'Resource download information',
    schema: {
      type: 'object',
      properties: {
        downloadUrl: { type: 'string' },
        fileName: { type: 'string' },
        contentType: { type: 'string' },
        fileSize: { type: 'number' },
      },
    },
  })
  @ApiParam({ name: 'id', description: 'Resource ID' })
  async downloadResource(@Request() req, @Param('id') resourceId: string) {
    const userId = req.user.sub;
    this.logger.log(`User ${userId} downloading resource ${resourceId}`);
    return this.resourcesService.downloadResource(resourceId, userId);
  }

  @Get(':id/stream')
  @ApiOperation({ summary: 'Stream resource for in-app viewing' })
  @ApiResponse({
    status: 200,
    description: 'Resource streaming information',
    schema: {
      type: 'object',
      properties: {
        streamUrl: { type: 'string' },
        contentType: { type: 'string' },
        fileName: { type: 'string' },
      },
    },
  })
  @ApiParam({ name: 'id', description: 'Resource ID' })
  async streamResource(@Request() req, @Param('id') resourceId: string) {
    const userId = req.user.sub;
    this.logger.log(`User ${userId} streaming resource ${resourceId}`);
    return this.resourcesService.streamResource(resourceId, userId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search resources' })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
    type: [ResourceDto],
  })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: 'Search query',
  })
  @ApiQuery({
    name: 'topicId',
    required: false,
    type: String,
    description: 'Filter by topic ID',
  })
  async searchResources(
    @Query('q') query: string,
    @Query('topicId') topicId?: string,
  ): Promise<ResourceDto[]> {
    this.logger.log(
      `Searching resources with query: "${query}"${topicId ? `, topic: ${topicId}` : ''}`,
    );
    return this.resourcesService.searchResources(query, topicId);
  }
}
