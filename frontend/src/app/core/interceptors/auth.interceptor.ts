import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { environment } from '../../../environments/environment';

const CSRF_COOKIE = 'bl_csrf';
const CSRF_HEADER = 'X-CSRF-Token';

const readCookie = (name: string): string | null => {
  const parts = document.cookie.split(';').map((c) => c.trim());
  for (const part of parts) {
    if (part.startsWith(`${name}=`)) {
      return decodeURIComponent(part.substring(name.length + 1));
    }
  }
  return null;
};

/**
 * Attaches the JWT as `Authorization: Bearer <token>` header — matching the Flask backend's
 * `_get_token_from_header()` which prioritises the Authorization header.
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const authService = inject(AuthService);
  const notifications = inject(NotificationService);
  const token = authService.getToken();
  const isAuthEntryCall = /\/auth\/(login|register)$/i.test(req.url);

  const isApiCall = req.url.startsWith(environment.apiUrl);
  const needsCsrf = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());
  const csrfToken = needsCsrf ? readCookie(CSRF_COOKIE) : null;

  const baseRequest = isApiCall ? req.clone({ withCredentials: true }) : req;

  const requestToSend = token
    ? baseRequest.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : baseRequest;

  const finalRequest = csrfToken && isApiCall
    ? requestToSend.clone({ setHeaders: { [CSRF_HEADER]: csrfToken } })
    : requestToSend;

  return next(finalRequest).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !isAuthEntryCall) {
        authService.handleSessionExpired();
      } else if (error instanceof HttpErrorResponse && error.status === 403) {
        notifications.show('Action blocked by server authorization policy.', 'error', 4500);
        // Refresh profile so role-dependent UI reflects backend truth after a forbidden action.
        authService.fetchProfile().subscribe({ error: () => {} });
      }
      return throwError(() => error);
    })
  );
};
