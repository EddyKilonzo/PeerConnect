import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseHttpService } from './base-http.service';
import {
  Group,
  CreateGroupRequest,
  UpdateGroupRequest,
  PaginationParams
} from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class GroupsService extends BaseHttpService {
  constructor(http: HttpClient) {
    super(http);
  }

  getGroups(paginationParams?: PaginationParams): Observable<{ data: Group[]; total: number; page: number; limit: number; totalPages: number }> {
    return this.getPaginated<Group>('/groups', paginationParams);
  }

  getGroupById(groupId: string): Observable<Group> {
    return this.get<Group>(`/groups/${groupId}`);
  }

  createGroup(groupData: CreateGroupRequest): Observable<Group> {
    return this.post<Group>('/groups', groupData);
  }

  updateGroup(groupId: string, updateData: UpdateGroupRequest): Observable<Group> {
    return this.patch<Group>(`/groups/${groupId}`, updateData);
  }

  deleteGroup(groupId: string): Observable<void> {
    return this.delete<void>(`/groups/${groupId}`);
  }

  joinGroup(groupId: string): Observable<Group> {
    return this.post<Group>(`/groups/${groupId}/join`, {});
  }

  leaveGroup(groupId: string): Observable<void> {
    return this.delete<void>(`/groups/${groupId}/leave`);
  }

  getMyGroups(paginationParams?: PaginationParams): Observable<{ data: Group[]; total: number; page: number; limit: number; totalPages: number }> {
    return this.getPaginated<Group>('/groups/my-groups', paginationParams);
  }

  searchGroups(query: string, paginationParams?: PaginationParams): Observable<{ data: Group[]; total: number; page: number; limit: number; totalPages: number }> {
    const params = { ...paginationParams, search: query };
    return this.getPaginated<Group>('/groups/search', params);
  }
}
