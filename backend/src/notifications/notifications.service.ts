import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Notification, NotificationType } from '@prisma/client';
import {
  CreateNotificationDto,
  SessionReminderData,
  NewResourceData,
  GroupActivityData,
} from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailerService: MailerService,
  ) {}

  async createNotification(data: CreateNotificationDto) {
    try {
      // Check if a similar notification already exists for this user
      const existingNotification = await this.prisma.notification.findFirst({
        where: {
          userId: data.userId,
          type: data.type,
          relatedId: data.relatedId,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Within the last 24 hours
          },
        },
      });

      // Only create if no similar notification exists
      if (existingNotification) {
        this.logger.log(
          `Skipped duplicate notification for user ${data.userId}, type: ${data.type}, relatedId: ${data.relatedId}`,
        );
        return existingNotification;
      }

      const notification = await this.prisma.notification.create({
        data: {
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type,
          relatedId: data.relatedId,
        },
      });

      this.logger.log(
        `Created unique notification for user ${data.userId}: ${data.title}`,
      );

      // Send email if requested
      if (data.sendEmail) {
        await this.sendNotificationEmail(
          data.userId,
          data.title,
          data.message,
          data.type,
        );
      }

      return notification;
    } catch (error) {
      this.logger.error(
        `Failed to create notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async createBulkNotifications(
    data: Omit<CreateNotificationDto, 'userId'>[],
    userIds: string[],
  ) {
    try {
      const notifications: Notification[] = [];

      // Create one notification per user per notification data item
      for (const userId of userIds) {
        for (const notificationData of data) {
          // Check if a similar notification already exists for this user
          const existingNotification = await this.prisma.notification.findFirst(
            {
              where: {
                userId,
                type: notificationData.type,
                relatedId: notificationData.relatedId,
                createdAt: {
                  gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Within the last 24 hours
                },
              },
            },
          );

          // Only create if no similar notification exists
          if (!existingNotification) {
            const notification = await this.prisma.notification.create({
              data: {
                userId,
                title: notificationData.title,
                message: notificationData.message,
                type: notificationData.type,
                relatedId: notificationData.relatedId,
              },
            });
            notifications.push(notification);

            // Send email if requested
            if (notificationData.sendEmail) {
              await this.sendNotificationEmail(
                userId,
                notificationData.title,
                notificationData.message,
                notificationData.type,
              );
            }
          } else {
            this.logger.log(
              `Skipped duplicate notification for user ${userId}, type: ${notificationData.type}, relatedId: ${notificationData.relatedId}`,
            );
          }
        }
      }

      this.logger.log(
        `Created ${notifications.length} unique bulk notifications`,
      );
      return notifications;
    } catch (error) {
      this.logger.error(
        `Failed to create bulk notifications: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    try {
      const skip = (page - 1) * limit;

      const [notifications, total] = await Promise.all([
        this.prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.notification.count({
          where: { userId },
        }),
      ]);

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get notifications for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async markAsRead(notificationId: string, userId: string) {
    try {
      const notification = await this.prisma.notification.update({
        where: {
          id: notificationId,
          userId, // Ensure user can only mark their own notifications as read
        },
        data: { isRead: true },
      });

      this.logger.log(
        `Marked notification ${notificationId} as read for user ${userId}`,
      );
      return notification;
    } catch (error) {
      this.logger.error(
        `Failed to mark notification as read: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async markAllAsRead(userId: string) {
    try {
      const result = await this.prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });

      this.logger.log(
        `Marked ${result.count} notifications as read for user ${userId}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to mark all notifications as read: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getUnreadCount(userId: string) {
    try {
      const count = await this.prisma.notification.count({
        where: { userId, isRead: false },
      });

      return { unreadCount: count };
    } catch (error) {
      this.logger.error(
        `Failed to get unread count for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async deleteNotification(notificationId: string, userId: string) {
    try {
      const notification = await this.prisma.notification.delete({
        where: {
          id: notificationId,
          userId, // Ensure user can only delete their own notifications
        },
      });

      this.logger.log(
        `Deleted notification ${notificationId} for user ${userId}`,
      );
      return notification;
    } catch (error) {
      this.logger.error(
        `Failed to delete notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  // Check if a notification exists for a user
  async notificationExists(
    userId: string,
    type: NotificationType,
    relatedId?: string,
  ): Promise<boolean> {
    try {
      const notification = await this.prisma.notification.findFirst({
        where: {
          userId,
          type,
          relatedId,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Within the last 24 hours
          },
        },
      });

      return !!notification;
    } catch (error) {
      this.logger.error(
        `Failed to check notification existence: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return false;
    }
  }

  // Get notification statistics for a user
  async getNotificationStats(userId: string) {
    try {
      const [total, unread, byType] = await Promise.all([
        this.prisma.notification.count({ where: { userId } }),
        this.prisma.notification.count({ where: { userId, isRead: false } }),
        this.prisma.notification.groupBy({
          by: ['type'],
          where: { userId },
          _count: { type: true },
        }),
      ]);

      return {
        total,
        unread,
        byType: byType.reduce(
          (acc, item) => {
            acc[item.type] = item._count.type;
            return acc;
          },
          {} as Record<string, number>,
        ),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get notification stats for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  // Clean up old notifications (older than 30 days)
  async cleanupOldNotifications(daysOld: number = 30) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      const result = await this.prisma.notification.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
          isRead: true, // Only delete read notifications
        },
      });

      this.logger.log(`Cleaned up ${result.count} old notifications`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to cleanup old notifications: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  // Session reminder notifications
  async sendSessionReminder(data: SessionReminderData) {
    try {
      const title = 'Session Reminder';
      const message = `Your session on "${data.topicName}" with ${data.listenerName} starts in 30 minutes at ${data.startTime.toLocaleTimeString()}.`;

      // Create in-app notification
      await this.createNotification({
        userId: data.userId,
        title,
        message,
        type: 'SESSION_REMINDER',
        relatedId: data.sessionId,
        sendEmail: true,
      });

      this.logger.log(`Sent session reminder for session ${data.sessionId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send session reminder: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // New resource notifications
  async notifyNewResource(data: NewResourceData) {
    try {
      const title = 'New Resource Available';
      const message = `A new resource "${data.resourceTitle}" has been added to "${data.topicName}" by ${data.uploadedByName}.`;

      // Create bulk notifications for all users interested in this topic
      await this.createBulkNotifications(
        [
          {
            title,
            message,
            type: 'NEW_RESOURCE',
            relatedId: data.resourceId,
            sendEmail: true,
          },
        ],
        data.userIds,
      );

      this.logger.log(
        `Sent new resource notifications for resource ${data.resourceId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send new resource notifications: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // Group activity notifications
  async notifyGroupActivity(data: GroupActivityData) {
    try {
      const title = 'Group Activity Update';
      const message = `${data.activityDescription} in group "${data.groupName}".`;

      // Create bulk notifications for all group members
      await this.createBulkNotifications(
        [
          {
            title,
            message,
            type: 'GROUP_ACTIVITY',
            relatedId: data.groupId,
            sendEmail: false, // Group activities usually don't need email notifications
          },
        ],
        data.userIds,
      );

      this.logger.log(
        `Sent group activity notifications for group ${data.groupId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send group activity notifications: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // Scheduled task to send session reminders
  @Cron(CronExpression.EVERY_MINUTE)
  async checkUpcomingSessions() {
    try {
      const thirtyMinutesFromNow = new Date(Date.now() + 30 * 60 * 1000);
      const oneMinuteLater = new Date(Date.now() + 31 * 60 * 1000);

      // Find sessions starting in the next 30-31 minutes
      const upcomingSessions = await this.prisma.session.findMany({
        where: {
          status: 'ACTIVE',
          startTime: {
            gte: thirtyMinutesFromNow,
            lt: oneMinuteLater,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          listener: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          topic: {
            select: {
              name: true,
            },
          },
        },
      });

      for (const session of upcomingSessions) {
        // Check if we haven't already sent a reminder for this session
        const existingReminder = await this.prisma.notification.findFirst({
          where: {
            relatedId: session.id,
            type: 'SESSION_REMINDER',
            createdAt: {
              gte: new Date(Date.now() - 60 * 60 * 1000), // Within the last hour
            },
          },
        });

        if (!existingReminder) {
          await this.sendSessionReminder({
            sessionId: session.id,
            userId: session.userId,
            listenerId: session.listenerId,
            topicName: session.topic.name,
            startTime: session.startTime,
            userName: `${session.user.firstName} ${session.user.lastName}`,
            listenerName: `${session.listener.firstName} ${session.listener.lastName}`,
          });
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to check upcoming sessions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // Scheduled task to cleanup old notifications (daily at 2 AM)
  @Cron('0 2 * * *')
  async cleanupOldNotificationsTask() {
    try {
      await this.cleanupOldNotifications(30); // Clean up notifications older than 30 days
    } catch (error) {
      this.logger.error(
        `Failed to cleanup old notifications: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async sendNotificationEmail(
    userId: string,
    title: string,
    message: string,
    type: NotificationType,
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true },
      });

      if (!user || !user.email) {
        this.logger.warn(`User ${userId} not found or has no email`);
        return;
      }

      // Type assertion to resolve unsafe call issue
      const mailer = this.mailerService as {
        sendSessionReminderEmail: (
          email: string,
          firstName: string,
          title: string,
          message: string,
        ) => Promise<void>;
        sendNewResourceEmail: (
          email: string,
          firstName: string,
          title: string,
          message: string,
        ) => Promise<void>;
        sendGroupActivityEmail: (
          email: string,
          firstName: string,
          title: string,
          message: string,
        ) => Promise<void>;
        sendGeneralNotificationEmail: (
          email: string,
          firstName: string,
          title: string,
          message: string,
        ) => Promise<void>;
      };

      // Send email based on notification type
      switch (type) {
        case 'SESSION_REMINDER':
          await mailer.sendSessionReminderEmail(
            user.email,
            user.firstName,
            title,
            message,
          );
          break;
        case 'NEW_RESOURCE':
          await mailer.sendNewResourceEmail(
            user.email,
            user.firstName,
            title,
            message,
          );
          break;
        case 'GROUP_ACTIVITY':
          await mailer.sendGroupActivityEmail(
            user.email,
            user.firstName,
            title,
            message,
          );
          break;
        default:
          await mailer.sendGeneralNotificationEmail(
            user.email,
            user.firstName,
            title,
            message,
          );
      }

      this.logger.log(`Sent ${type} email to ${user.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send notification email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
