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

@ApiTags('groups')
@Controller('groups')
@UseGuards(JwtAuthGuard, RoleBasedGuard)
@ANY_AUTHENTICATED()
@ApiBearerAuth()
export class GroupsController {
  private readonly logger = new Logger(GroupsController.name);

  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @Roles('LISTENER', 'ADMIN')
  @ApiOperation({
    summary: 'Create a new peer group (Listeners and Admins only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Group created successfully',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        topicId: { type: 'string' },
        isPrivate: { type: 'boolean' },
        isLocked: { type: 'boolean' },
        maxMembers: { type: 'number' },
        rules: { type: 'array', items: { type: 'string' } },
        tags: { type: 'array', items: { type: 'string' } },
        allowAnonymous: { type: 'boolean' },
      },
    },
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
  @ApiOperation({ summary: 'Join a peer group' })
  @ApiResponse({
    status: 200,
    description: 'Successfully joined group',
  })
  @ApiParam({ name: 'id', description: 'Group ID' })
  async joinGroup(
    @Request() req: AuthenticatedRequest,
    @Param('id') groupId: string,
  ) {
    const userId = req.user.sub;
    this.logger.log(`User ${userId} joining group ${groupId}`);
    return this.groupsService.joinGroup(groupId, userId);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send a message in a group' })
  @ApiResponse({
    status: 201,
    description: 'Message sent successfully',
  })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiBody({
    schema: { type: 'object', properties: { content: { type: 'string' } } },
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
  @ApiOperation({ summary: 'Get group messages' })
  @ApiResponse({
    status: 200,
    description: 'Group messages retrieved successfully',
  })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getGroupMessages(
    @Param('id') groupId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ) {
    return this.groupsService.getGroupMessages(groupId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get group details' })
  @ApiResponse({
    status: 200,
    description: 'Group details retrieved successfully',
  })
  @ApiParam({ name: 'id', description: 'Group ID' })
  async getGroupDetails(@Param('id') groupId: string) {
    return this.groupsService.getGroup(groupId);
  }

  @Get(':id/can-send-message')
  @ApiOperation({ summary: 'Check if user can send messages in group' })
  @ApiResponse({
    status: 200,
    description: 'Permission check result',
  })
  @ApiParam({ name: 'id', description: 'Group ID' })
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
  @ApiOperation({ summary: 'Create a listener response to flagged content' })
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
