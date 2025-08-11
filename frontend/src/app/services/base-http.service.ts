import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiResponse, ApiError, PaginationParams } from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class BaseHttpService {
  private readonly baseUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) {}

  protected get<T>(endpoint: string, params?: Record<string, string | number | boolean>): Observable<T> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, params[key]!.toString());
        }
      });
    }

    return this.http.get<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, { params: httpParams })
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  protected getPaginated<T>(endpoint: string, paginationParams?: PaginationParams): Observable<{ data: T[]; total: number; page: number; limit: number; totalPages: number }> {
    let httpParams = new HttpParams();
    
    if (paginationParams) {
      if (paginationParams.page !== undefined) {
        httpParams = httpParams.set('page', paginationParams.page.toString());
      }
      if (paginationParams.limit !== undefined) {
        httpParams = httpParams.set('limit', paginationParams.limit.toString());
      }
      if (paginationParams.sortBy) {
        httpParams = httpParams.set('sortBy', paginationParams.sortBy);
      }
      if (paginationParams.sortOrder) {
        httpParams = httpParams.set('sortOrder', paginationParams.sortOrder);
      }
    }

    return this.http.get<ApiResponse<{ data: T[]; total: number; page: number; limit: number; totalPages: number }>>(`${this.baseUrl}${endpoint}`, { params: httpParams })
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  protected post<T>(endpoint: string, data: unknown): Observable<T> {
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, data)
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  protected put<T>(endpoint: string, data: unknown): Observable<T> {
    return this.http.put<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, data)
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  protected patch<T>(endpoint: string, data: unknown): Observable<T> {
    return this.http.patch<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, data)
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  protected delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<ApiResponse<T>>(`${this.baseUrl}${endpoint}`)
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  protected getHeaders(): HttpHeaders {
    const token = this.getAuthToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    });
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      if (error.status === 0) {
        errorMessage = 'Unable to connect to the server. Please check your internet connection.';
      } else if (error.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
        // Optionally redirect to login or refresh token
        this.handleUnauthorized();
      } else if (error.status === 403) {
        errorMessage = 'Access denied. You do not have permission to perform this action.';
      } else if (error.status === 404) {
        errorMessage = 'The requested resource was not found.';
      } else if (error.status === 422) {
        errorMessage = 'Validation error. Please check your input.';
      } else if (error.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else {
        errorMessage = error.error?.message || `HTTP Error: ${error.status}`;
      }
    }

    console.error('HTTP Error:', error);
    return throwError(() => new Error(errorMessage));
  }

  private handleUnauthorized(): void {
    // Clear stored tokens
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    
    // Optionally redirect to login page
    // this.router.navigate(['/auth/login']);
  }
}
