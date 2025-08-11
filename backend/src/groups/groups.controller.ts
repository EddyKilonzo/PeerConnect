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
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import type { CreateGroupDto } from './dto/create-group.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  RoleBasedGuard,
  Roles,
  ANY_AUTHENTICATED,
  ADMIN_ONLY,
} from '../auth/guards/role-based.guard';
import { Request as ExpressRequest } from 'express';

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

@ApiTags('Groups')
@Controller('groups')
@UseGuards(JwtAuthGuard, RoleBasedGuard)
@ANY_AUTHENTICATED()
@ApiBearerAuth('JWT-auth')
export class GroupsController {
  private readonly logger = new Logger(GroupsController.name);

  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @Roles('LISTENER', 'ADMIN')
  @ApiOperation({
    summary: 'Create a new peer group',
    description:
      'Create a new peer group. Available to LISTENER and ADMIN roles only.',
  })
  @ApiResponse({
    status: 201,
    description: 'Group created successfully',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Group name' },
        description: { type: 'string', description: 'Group description' },
        topicId: { type: 'string', description: 'Associated topic ID' },
        isPrivate: { type: 'boolean', description: 'Whether group is private' },
        isLocked: { type: 'boolean', description: 'Whether group is locked' },
        maxMembers: {
          type: 'number',
          description: 'Maximum number of members',
        },
        rules: {
          type: 'array',
          items: { type: 'string' },
          description: 'Group rules',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Group tags',
        },
        allowAnonymous: {
          type: 'boolean',
          description: 'Whether to allow anonymous users',
        },
      },
      required: ['name', 'topicId'],
    },
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
  })
  @ApiForbiddenResponse({
    description: 'Access denied - LISTENER or ADMIN role required',
  })
  async createGroup(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateGroupDto,
  ) {
    const userId = req.user.sub;
    this.logger.log(`Creating group "${dto.name}" for user ${userId}`);
    return this.groupsService.createGroup(dto, userId);
  }

  @Post(':id/join')
  @ApiOperation({
    summary: 'Join a peer group',
    description:
      'Join an existing peer group. Available to all authenticated users (USER, LISTENER, ADMIN).',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully joined group',
  })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
  })
  @ApiNotFoundResponse({
    description: 'Group not found',
  })
  async joinGroup(
    @Request() req: AuthenticatedRequest,
    @Param('id') groupId: string,
  ) {
    const userId = req.user.sub;
    this.logger.log(`User ${userId} joining group ${groupId}`);
    return this.groupsService.joinGroup(groupId, userId);
  }

  @Post(':id/messages')
  @ApiOperation({
    summary: 'Send a message in a group',
    description:
      'Send a message in a group. Available to all authenticated users (USER, LISTENER, ADMIN).',
  })
  @ApiResponse({
    status: 201,
    description: 'Message sent successfully',
  })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Message content' },
      },
      required: ['content'],
    },
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
  })
  @ApiNotFoundResponse({
    description: 'Group not found',
  })
  async sendMessage(
    @Request() req: AuthenticatedRequest,
    @Param('id') groupId: string,
    @Body() body: { content: string },
  ) {
    const userId = req.user.sub;
    this.logger.log(`User ${userId} sending message in group ${groupId}`);
    return this.groupsService.sendGroupMessage(groupId, userId, body.content);
  }

  @Get(':id/messages')
  @ApiOperation({
    summary: 'Get group messages',
    description:
      'Retrieve messages from a group. Available to all authenticated users (USER, LISTENER, ADMIN).',
  })
  @ApiResponse({
    status: 200,
    description: 'Group messages retrieved successfully',
  })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 50)',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
  })
  @ApiNotFoundResponse({
    description: 'Group not found',
  })
  async getGroupMessages(
    @Param('id') groupId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ) {
    return this.groupsService.getGroupMessages(groupId, page, limit);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get group details',
    description:
      'Retrieve group details. Available to all authenticated users (USER, LISTENER, ADMIN).',
  })
  @ApiResponse({
    status: 200,
    description: 'Group details retrieved successfully',
  })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
  })
  @ApiNotFoundResponse({
    description: 'Group not found',
  })
  async getGroupDetails(@Param('id') groupId: string) {
    return this.groupsService.getGroup(groupId);
  }

  @Get(':id/can-send-message')
  @ApiOperation({
    summary: 'Check if user can send messages in group',
    description:
      'Check if the authenticated user can send messages in a group. Available to all authenticated users (USER, LISTENER, ADMIN).',
  })
  @ApiResponse({
    status: 200,
    description: 'Permission check result',
  })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
  })
  @ApiNotFoundResponse({
    description: 'Group not found',
  })
  async canSendMessage(
    @Request() req: AuthenticatedRequest,
    @Param('id') groupId: string,
  ) {
    const userId = req.user.sub;
    const canSend = await this.groupsService.canSendMessage(groupId, userId);
    return { canSend, userId, groupId };
  }

  @Post(':id/listener-response')
  @Roles('LISTENER', 'ADMIN')
  @ApiOperation({
    summary: 'Create a listener response to flagged content',
    description:
      'Create a listener response to flagged content. Available to LISTENER and ADMIN roles only.',
  })
  @ApiResponse({
    status: 201,
    description: 'Listener response created successfully',
  })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'User who triggered the response',
        },
        responseContent: {
          type: 'string',
          description: 'Listener response message',
        },
        responseType: {
          type: 'string',
          enum: [
            'SUPPORT',
            'GUIDANCE',
            'RESOURCE',
            'ESCALATION',
            'CLARIFICATION',
          ],
          description: 'Type of response',
        },
        followUpRequired: {
          type: 'boolean',
          description: 'Whether follow-up is needed',
        },
        followUpNotes: { type: 'string', description: 'Notes for follow-up' },
      },
      required: [
        'userId',
        'responseContent',
        'responseType',
        'followUpRequired',
      ],
    },
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
  })
  @ApiForbiddenResponse({
    description: 'Access denied - LISTENER or ADMIN role required',
  })
  @ApiNotFoundResponse({
    description: 'Group not found',
  })
  async createListenerResponse(
    @Request() req: AuthenticatedRequest,
    @Param('id') groupId: string,
    @Body()
    body: {
      userId: string;
      responseContent: string;
      responseType:
        | 'SUPPORT'
        | 'GUIDANCE'
        | 'RESOURCE'
        | 'ESCALATION'
        | 'CLARIFICATION';
      followUpRequired: boolean;
      followUpNotes?: string;
    },
  ) {
    const listenerId = req.user.sub;
    this.logger.log(
      `Listener ${listenerId} responding to flagged content from user ${body.userId} in group ${groupId}`,
    );
    return this.groupsService.createListenerResponse(
      groupId,
      body.userId,
      listenerId,
      {
        responseContent: body.responseContent,
        responseType: body.responseType,
        followUpRequired: body.followUpRequired,
        followUpNotes: body.followUpNotes,
      },
    );
  }
}
