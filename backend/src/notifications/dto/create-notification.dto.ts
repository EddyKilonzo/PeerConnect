import { NotificationType } from '@prisma/client';

export { NotificationType };

export interface CreateNotificationDto {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  relatedId?: string;
  sendEmail?: boolean;
}

export interface SessionReminderData {
  sessionId: string;
  userId: string;
  listenerId: string;
  topicName: string;
  startTime: Date;
  userName: string;
  listenerName: string;
}

export interface NewResourceData {
  resourceId: string;
  resourceTitle: string;
  topicName: string;
  uploadedByName: string;
  userIds: string[];
}

export interface GroupActivityData {
  groupId: string;
  groupName: string;
  activityType:
    | 'NEW_MEMBER'
    | 'NEW_MESSAGE'
    | 'NEW_RESOURCE'
    | 'SESSION_SCHEDULED';
  activityDescription: string;
  userIds: string[];
}
