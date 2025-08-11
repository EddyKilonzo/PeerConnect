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

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getUserNotifications(
    @Request() req: AuthenticatedRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const userId = req.user.id;
    return this.notificationsService.getUserNotifications(userId, page, limit);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: AuthenticatedRequest) {
    const userId = req.user.id;
    return this.notificationsService.getUnreadCount(userId);
  }

  @Get('stats')
  async getNotificationStats(@Request() req: AuthenticatedRequest) {
    const userId = req.user.id;
    return this.notificationsService.getNotificationStats(userId);
  }

  @Put(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = req.user.id;
    return this.notificationsService.markAsRead(id, userId);
  }

  @Put('mark-all-read')
  async markAllAsRead(@Request() req: AuthenticatedRequest) {
    const userId = req.user.id;
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':id')
  async deleteNotification(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = req.user.id;
    return this.notificationsService.deleteNotification(id, userId);
  }

  // Admin endpoints for creating notifications
  @Post()
  async createNotification(@Body() data: CreateNotificationDto) {
    return this.notificationsService.createNotification(data);
  }

  @Post('bulk')
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
  async sendSessionReminder(@Body() data: SessionReminderData) {
    return this.notificationsService.sendSessionReminder(data);
  }

  @Post('new-resource')
  async notifyNewResource(@Body() data: NewResourceData) {
    return this.notificationsService.notifyNewResource(data);
  }

  @Post('group-activity')
  async notifyGroupActivity(@Body() data: GroupActivityData) {
    return this.notificationsService.notifyGroupActivity(data);
  }
}
