import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Add auth token to all requests
    const token = localStorage.getItem('accessToken');
    if (token) {
      request = this.addToken(request, token);
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !request.url.includes('/auth/refresh')) {
          return this.handle401Error(request, next);
        }
        return throwError(() => error);
      })
    );
  }

  private addToken(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  private handle401Error(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        return this.authService.refreshToken(refreshToken).pipe(
          switchMap((response) => {
            this.isRefreshing = false;
            return next.handle(this.addToken(request, response.accessToken));
          }),
          catchError((error) => {
            this.isRefreshing = false;
            this.authService.logout();
            this.router.navigate(['/auth/login']);
            return throwError(() => error);
          })
        );
      } else {
        this.isRefreshing = false;
        this.authService.logout();
        this.router.navigate(['/auth/login']);
        return throwError(() => new Error('No refresh token available'));
      }
    }

    // If already refreshing, wait for it to complete
    return new Observable<HttpEvent<unknown>>(observer => {
      const checkRefreshing = () => {
        if (!this.isRefreshing) {
          const token = localStorage.getItem('accessToken');
          if (token) {
            next.handle(this.addToken(request, token)).subscribe({
              next: (event) => observer.next(event),
              error: (error) => observer.error(error),
              complete: () => observer.complete()
            });
          } else {
            observer.error(new Error('Authentication failed'));
            observer.complete();
          }
        } else {
          setTimeout(checkRefreshing, 100);
        }
      };
      checkRefreshing();
    });
  }
}
