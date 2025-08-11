import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseHttpService } from './base-http.service';
import {
  Meeting,
  CreateMeetingRequest,
  UpdateMeetingRequest,
  PaginationParams
} from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class MeetingsService extends BaseHttpService {
  constructor(http: HttpClient) {
    super(http);
  }

  getMeetings(paginationParams?: PaginationParams): Observable<{ data: Meeting[]; total: number; page: number; limit: number; totalPages: number }> {
    return this.getPaginated<Meeting>('/meetings', paginationParams);
  }

  getMeetingById(meetingId: string): Observable<Meeting> {
    return this.get<Meeting>(`/meetings/${meetingId}`);
  }

  createMeeting(meetingData: CreateMeetingRequest): Observable<Meeting> {
    return this.post<Meeting>('/meetings', meetingData);
  }

  updateMeeting(meetingId: string, updateData: UpdateMeetingRequest): Observable<Meeting> {
    return this.patch<Meeting>(`/meetings/${meetingId}`, updateData);
  }

  deleteMeeting(meetingId: string): Observable<void> {
    return this.delete<void>(`/meetings/${meetingId}`);
  }

  joinMeeting(meetingId: string): Observable<Meeting> {
    return this.post<Meeting>(`/meetings/${meetingId}/join`, {});
  }

  leaveMeeting(meetingId: string): Observable<void> {
    return this.delete<void>(`/meetings/${meetingId}/leave`);
  }

  respondToMeeting(meetingId: string, status: 'ACCEPTED' | 'DECLINED' | 'MAYBE'): Observable<Meeting> {
    return this.patch<Meeting>(`/meetings/${meetingId}/respond`, { status });
  }

  getMyMeetings(paginationParams?: PaginationParams): Observable<{ data: Meeting[]; total: number; page: number; limit: number; totalPages: number }> {
    return this.getPaginated<Meeting>('/meetings/my-meetings', paginationParams);
  }

  getGroupMeetings(groupId: string, paginationParams?: PaginationParams): Observable<{ data: Meeting[]; total: number; page: number; limit: number; totalPages: number }> {
    return this.getPaginated<Meeting>(`/groups/${groupId}/meetings`, paginationParams);
  }

  searchMeetings(query: string, paginationParams?: PaginationParams): Observable<{ data: Meeting[]; total: number; page: number; limit: number; totalPages: number }> {
    const params = { ...paginationParams, search: query };
    return this.getPaginated<Meeting>('/meetings/search', params);
  }
}
