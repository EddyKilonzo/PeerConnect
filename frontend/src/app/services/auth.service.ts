import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { BaseHttpService } from './base-http.service';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
  RefreshTokenRequest,
  UpdateUserRequest,
  CompleteProfileRequest
} from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class AuthService extends BaseHttpService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(http: HttpClient) {
    super(http);
    this.initializeAuth();
  }

  private initializeAuth(): void {
    const token = localStorage.getItem('accessToken');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      try {
        const userData = JSON.parse(user) as User;
        this.currentUserSubject.next(userData);
        this.isAuthenticatedSubject.next(true);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        this.clearAuthData();
      }
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.post<AuthResponse>('/auth/login', credentials).pipe(
      tap(response => {
        this.handleSuccessfulAuth(response);
      })
    );
  }

  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.post<AuthResponse>('/auth/register', userData).pipe(
      tap(response => {
        this.handleSuccessfulAuth(response);
      })
    );
  }

  refreshToken(refreshToken: string): Observable<AuthResponse> {
    const request: RefreshTokenRequest = { refreshToken };
    return this.post<AuthResponse>('/auth/refresh', request).pipe(
      tap(response => {
        this.handleSuccessfulAuth(response);
      })
    );
  }

  logout(): void {
    this.clearAuthData();
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  updateProfile(updateData: UpdateUserRequest): Observable<User> {
    return this.patch<User>('/auth/profile', updateData).pipe(
      tap(updatedUser => {
        this.currentUserSubject.next(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      })
    );
  }

  completeProfile(profileData: CompleteProfileRequest): Observable<User> {
    return this.post<User>('/auth/complete-profile', profileData).pipe(
      tap(completedUser => {
        this.currentUserSubject.next(completedUser);
        localStorage.setItem('user', JSON.stringify(completedUser));
      })
    );
  }

  private handleSuccessfulAuth(response: AuthResponse): void {
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    localStorage.setItem('user', JSON.stringify(response.user));
    
    this.currentUserSubject.next(response.user);
    this.isAuthenticatedSubject.next(true);
  }

  private clearAuthData(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  // Method to check if token is expired (you can implement JWT decode logic here)
  isTokenExpired(): boolean {
    const token = localStorage.getItem('accessToken');
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000; // Convert to milliseconds
      return Date.now() >= expiry;
    } catch (error) {
      console.error('Error parsing JWT token:', error);
      return true;
    }
  }

  // Method to get token expiry time
  getTokenExpiryTime(): Date | null {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return new Date(payload.exp * 1000);
    } catch (error) {
      console.error('Error parsing JWT token:', error);
      return null;
    }
  }
}
