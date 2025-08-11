export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  isRead: boolean;
  userId: string;
  relatedId?: string;
  relatedType?: 'GROUP' | 'MEETING' | 'RESOURCE' | 'CHAT';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNotificationRequest {
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  userId: string;
  relatedId?: string;
  relatedType?: 'GROUP' | 'MEETING' | 'RESOURCE' | 'CHAT';
}
