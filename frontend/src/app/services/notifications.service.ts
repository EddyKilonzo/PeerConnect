import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseHttpService } from './base-http.service';
import {
  Notification,
  CreateNotificationRequest,
  PaginationParams
} from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService extends BaseHttpService {
  constructor(http: HttpClient) {
    super(http);
  }

  getNotifications(paginationParams?: PaginationParams): Observable<{ data: Notification[]; total: number; page: number; limit: number; totalPages: number }> {
    return this.getPaginated<Notification>('/notifications', paginationParams);
  }

  getNotificationById(notificationId: string): Observable<Notification> {
    return this.get<Notification>(`/notifications/${notificationId}`);
  }

  markAsRead(notificationId: string): Observable<Notification> {
    return this.patch<Notification>(`/notifications/${notificationId}/read`, {});
  }

  markAllAsRead(): Observable<void> {
    return this.patch<void>('/notifications/mark-all-read', {});
  }

  deleteNotification(notificationId: string): Observable<void> {
    return this.delete<void>(`/notifications/${notificationId}`);
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.get<{ count: number }>('/notifications/unread-count');
  }

  getUnreadNotifications(paginationParams?: PaginationParams): Observable<{ data: Notification[]; total: number; page: number; limit: number; totalPages: number }> {
    return this.getPaginated<Notification>('/notifications/unread', paginationParams);
  }

  createNotification(notificationData: CreateNotificationRequest): Observable<Notification> {
    return this.post<Notification>('/notifications', notificationData);
  }
}
