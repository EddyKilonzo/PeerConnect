import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseHttpService } from './base-http.service';
import {
  User,
  PaginationParams
} from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class UsersService extends BaseHttpService {
  constructor(http: HttpClient) {
    super(http);
  }

  getUsers(paginationParams?: PaginationParams): Observable<{ data: User[]; total: number; page: number; limit: number; totalPages: number }> {
    return this.getPaginated<User>('/users', paginationParams);
  }

  getUserById(userId: string): Observable<User> {
    return this.get<User>(`/users/${userId}`);
  }

  getUserProfile(): Observable<User> {
    return this.get<User>('/users/profile');
  }

  searchUsers(query: string, paginationParams?: PaginationParams): Observable<{ data: User[]; total: number; page: number; limit: number; totalPages: number }> {
    const params = { ...paginationParams, search: query };
    return this.getPaginated<User>('/users/search', params);
  }

  getUsersByRole(role: string, paginationParams?: PaginationParams): Observable<{ data: User[]; total: number; page: number; limit: number; totalPages: number }> {
    return this.getPaginated<User>(`/users/role/${role}`, paginationParams);
  }

  getGroupMembers(groupId: string, paginationParams?: PaginationParams): Observable<{ data: User[]; total: number; page: number; limit: number; totalPages: number }> {
    return this.getPaginated<User>(`/groups/${groupId}/members`, paginationParams);
  }

  getMeetingParticipants(meetingId: string, paginationParams?: PaginationParams): Observable<{ data: User[]; total: number; page: number; limit: number; totalPages: number }> {
    return this.getPaginated<User>(`/meetings/${meetingId}/participants`, paginationParams);
  }
}
