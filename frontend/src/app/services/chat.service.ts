import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseHttpService } from './base-http.service';
import {
  ChatMessage,
  SendMessageRequest,
  ChatRoom,
  PaginationParams
} from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class ChatService extends BaseHttpService {
  constructor(http: HttpClient) {
    super(http);
  }

  getMessages(groupId?: string, meetingId?: string, paginationParams?: PaginationParams): Observable<{ data: ChatMessage[]; total: number; page: number; limit: number; totalPages: number }> {
    let endpoint = '/chat/messages';
    const params: Record<string, string> = {};
    
    if (groupId) {
      params['groupId'] = groupId;
    }
    if (meetingId) {
      params['meetingId'] = meetingId;
    }

    return this.getPaginated<ChatMessage>(endpoint, { ...paginationParams, ...params });
  }

  sendMessage(messageData: SendMessageRequest): Observable<ChatMessage> {
    return this.post<ChatMessage>('/chat/messages', messageData);
  }

  getChatRooms(): Observable<ChatRoom[]> {
    return this.get<ChatRoom[]>('/chat/rooms');
  }

  getPrivateMessages(userId: string, paginationParams?: PaginationParams): Observable<{ data: ChatMessage[]; total: number; page: number; limit: number; totalPages: number }> {
    return this.getPaginated<ChatMessage>(`/chat/private/${userId}`, paginationParams);
  }

  markMessageAsRead(messageId: string): Observable<void> {
    return this.patch<void>(`/chat/messages/${messageId}/read`, {});
  }

  deleteMessage(messageId: string): Observable<void> {
    return this.delete<void>(`/chat/messages/${messageId}`);
  }

  searchMessages(query: string, groupId?: string, meetingId?: string, paginationParams?: PaginationParams): Observable<{ data: ChatMessage[]; total: number; page: number; limit: number; totalPages: number }> {
    const params: Record<string, string> = { search: query };
    
    if (groupId) {
      params['groupId'] = groupId;
    }
    if (meetingId) {
      params['meetingId'] = meetingId;
    }

    return this.getPaginated<ChatMessage>('/chat/search', { ...paginationParams, ...params });
  }
}
