import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type {
  CreateNotificationDto,
  SessionReminderData,
  NewResourceData,
  GroupActivityData,
} from './dto/create-notification.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get user notifications',
    description: 'Retrieve paginated notifications for the authenticated user',
  })
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
    description: 'Items per page (default: 20)',
  })
  @ApiOkResponse({
    description: 'Notifications retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        notifications: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              message: { type: 'string' },
              type: { type: 'string' },
              isRead: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            pages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async getUserNotifications(
    @Request() req: AuthenticatedRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const userId = req.user.id;
    return this.notificationsService.getUserNotifications(userId, page, limit);
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Get unread notification count',
    description:
      'Get the count of unread notifications for the authenticated user',
  })
  @ApiOkResponse({
    description: 'Unread count retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        unreadCount: {
          type: 'number',
          description: 'Number of unread notifications',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
  })
  async getUnreadCount(@Request() req: AuthenticatedRequest) {
    const userId = req.user.id;
    return this.notificationsService.getUnreadCount(userId);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get notification statistics',
    description: 'Get notification statistics for the authenticated user',
  })
  @ApiOkResponse({
    description: 'Notification stats retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number', description: 'Total notifications' },
        unread: { type: 'number', description: 'Unread notifications' },
        read: { type: 'number', description: 'Read notifications' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
  })
  async getNotificationStats(@Request() req: AuthenticatedRequest) {
    const userId = req.user.id;
    return this.notificationsService.getNotificationStats(userId);
  }

  @Put(':id/read')
  @ApiOperation({
    summary: 'Mark notification as read',
    description:
      'Mark a specific notification as read for the authenticated user',
  })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiOkResponse({
    description: 'Notification marked as read successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Notification marked as read' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
  })
  @ApiNotFoundResponse({
    description: 'Notification not found',
  })
  async markAsRead(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = req.user.id;
    return this.notificationsService.markAsRead(id, userId);
  }

  @Put('mark-all-read')
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description: 'Mark all notifications as read for the authenticated user',
  })
  @ApiOkResponse({
    description: 'All notifications marked as read successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'All notifications marked as read',
        },
        updatedCount: {
          type: 'number',
          description: 'Number of notifications updated',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
  })
  async markAllAsRead(@Request() req: AuthenticatedRequest) {
    const userId = req.user.id;
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete notification',
    description: 'Delete a specific notification for the authenticated user',
  })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiOkResponse({
    description: 'Notification deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Notification deleted successfully',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated',
  })
  @ApiNotFoundResponse({
    description: 'Notification not found',
  })
  async deleteNotification(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = req.user.id;
    return this.notificationsService.deleteNotification(id, userId);
  }

  // Admin endpoints for creating notifications
  @Post()
  @ApiOperation({
    summary: 'Create notification',
    description: 'Create a new notification (Admin only)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'User ID to send notification to',
        },
        title: { type: 'string', description: 'Notification title' },
        message: { type: 'string', description: 'Notification message' },
        type: {
          type: 'string',
          enum: ['INFO', 'WARNING', 'ERROR', 'SUCCESS'],
          description: 'Notification type',
        },
        relatedId: {
          type: 'string',
          description: 'Related entity ID (optional)',
        },
        sendEmail: {
          type: 'boolean',
          description: 'Whether to send email notification (optional)',
        },
      },
      required: ['userId', 'title', 'message', 'type'],
    },
  })
  @ApiCreatedResponse({
    description: 'Notification created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        message: { type: 'string' },
        type: { type: 'string' },
        userId: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async createNotification(@Body() data: CreateNotificationDto) {
    return this.notificationsService.createNotification(data);
  }

  @Post('bulk')
  @ApiOperation({
    summary: 'Create bulk notifications',
    description:
      'Create multiple notifications for multiple users (Admin only)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        notifications: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              message: { type: 'string' },
              type: { type: 'string' },
            },
          },
        },
        userIds: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Bulk notifications created successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Bulk notifications created successfully',
        },
        createdCount: {
          type: 'number',
          description: 'Number of notifications created',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  async createBulkNotifications(
    @Body()
    data: {
      notifications: Omit<CreateNotificationDto, 'userId'>[];
      userIds: string[];
    },
  ) {
    return this.notificationsService.createBulkNotifications(
      data.notifications,
      data.userIds,
    );
  }

  // Specific notification endpoints
  @Post('session-reminder')
  @ApiOperation({
    summary: 'Send session reminder',
    description: 'Send a session reminder notification (Admin only)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User ID to send reminder to' },
        sessionId: { type: 'string', description: 'Session ID' },
        reminderTime: {
          type: 'string',
          format: 'date-time',
          description: 'When to send the reminder',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Session reminder sent successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Session reminder sent successfully',
        },
      },
    },
  })
  async sendSessionReminder(@Body() data: SessionReminderData) {
    return this.notificationsService.sendSessionReminder(data);
  }

  @Post('new-resource')
  @ApiOperation({
    summary: 'Notify new resource',
    description: 'Send notification about a new resource (Admin only)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        resourceId: { type: 'string', description: 'Resource ID' },
        resourceTitle: { type: 'string', description: 'Resource title' },
        topicId: { type: 'string', description: 'Topic ID for targeted users' },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'New resource notification sent successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'New resource notification sent successfully',
        },
        notifiedCount: {
          type: 'number',
          description: 'Number of users notified',
        },
      },
    },
  })
  async notifyNewResource(@Body() data: NewResourceData) {
    return this.notificationsService.notifyNewResource(data);
  }

  @Post('group-activity')
  @ApiOperation({
    summary: 'Notify group activity',
    description: 'Send notification about group activity (Admin only)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        groupId: { type: 'string', description: 'Group ID' },
        activityType: { type: 'string', description: 'Type of activity' },
        activityDescription: {
          type: 'string',
          description: 'Description of the activity',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Group activity notification sent successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Group activity notification sent successfully',
        },
        notifiedCount: {
          type: 'number',
          description: 'Number of group members notified',
        },
      },
    },
  })
  async notifyGroupActivity(@Body() data: GroupActivityData) {
    return this.notificationsService.notifyGroupActivity(data);
  }
}
