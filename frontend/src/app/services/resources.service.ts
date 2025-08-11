import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseHttpService } from './base-http.service';
import {
  Resource,
  CreateResourceRequest,
  UpdateResourceRequest,
  PaginationParams
} from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class ResourcesService extends BaseHttpService {
  constructor(http: HttpClient) {
    super(http);
  }

  getResources(paginationParams?: PaginationParams): Observable<{ data: Resource[]; total: number; page: number; limit: number; totalPages: number }> {
    return this.getPaginated<Resource>('/resources', paginationParams);
  }

  getResourceById(resourceId: string): Observable<Resource> {
    return this.get<Resource>(`/resources/${resourceId}`);
  }

  createResource(resourceData: CreateResourceRequest): Observable<Resource> {
    return this.post<Resource>('/resources', resourceData);
  }

  updateResource(resourceId: string, updateData: UpdateResourceRequest): Observable<Resource> {
    return this.patch<Resource>(`/resources/${resourceId}`, updateData);
  }

  deleteResource(resourceId: string): Observable<void> {
    return this.delete<void>(`/resources/${resourceId}`);
  }

  getMyResources(paginationParams?: PaginationParams): Observable<{ data: Resource[]; total: number; page: number; limit: number; totalPages: number }> {
    return this.getPaginated<Resource>('/resources/my-resources', paginationParams);
  }

  getGroupResources(groupId: string, paginationParams?: PaginationParams): Observable<{ data: Resource[]; total: number; page: number; limit: number; totalPages: number }> {
    return this.getPaginated<Resource>(`/groups/${groupId}/resources`, paginationParams);
  }

  searchResources(query: string, type?: string, paginationParams?: PaginationParams): Observable<{ data: Resource[]; total: number; page: number; limit: number; totalPages: number }> {
    const params: Record<string, string> = { search: query };
    
    if (type) {
      params['type'] = type;
    }

    return this.getPaginated<Resource>('/resources/search', { ...paginationParams, ...params });
  }

  getResourcesByType(type: string, paginationParams?: PaginationParams): Observable<{ data: Resource[]; total: number; page: number; limit: number; totalPages: number }> {
    return this.getPaginated<Resource>(`/resources/type/${type}`, paginationParams);
  }

  getPopularResources(paginationParams?: PaginationParams): Observable<{ data: Resource[]; total: number; page: number; limit: number; totalPages: number }> {
    return this.getPaginated<Resource>('/resources/popular', paginationParams);
  }
}
