import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'An unknown error occurred';

        if (error.error instanceof ErrorEvent) {
          // Client-side error
          errorMessage = `Client Error: ${error.error.message}`;
        } else {
          // Server-side error
          switch (error.status) {
            case 0:
              errorMessage = 'Unable to connect to the server. Please check your internet connection.';
              break;
            case 400:
              errorMessage = error.error?.message || 'Bad request. Please check your input.';
              break;
            case 401:
              errorMessage = 'Authentication failed. Please log in again.';
              break;
            case 403:
              errorMessage = 'Access denied. You do not have permission to perform this action.';
              break;
            case 404:
              errorMessage = 'The requested resource was not found.';
              break;
            case 409:
              errorMessage = error.error?.message || 'Conflict. The resource already exists.';
              break;
            case 422:
              errorMessage = 'Validation error. Please check your input.';
              break;
            case 429:
              errorMessage = 'Too many requests. Please try again later.';
              break;
            case 500:
              errorMessage = 'Server error. Please try again later.';
              break;
            case 502:
              errorMessage = 'Bad gateway. Please try again later.';
              break;
            case 503:
              errorMessage = 'Service unavailable. Please try again later.';
              break;
            default:
              errorMessage = error.error?.message || `HTTP Error: ${error.status}`;
          }
        }

        // Log error for debugging
        console.error('HTTP Error:', {
          url: request.url,
          method: request.method,
          status: error.status,
          message: errorMessage,
          error: error
        });

        // Here you could integrate with a notification service
        // this.notificationService.showError(errorMessage);

        return throwError(() => new Error(errorMessage));
      })
    );
  }
}
