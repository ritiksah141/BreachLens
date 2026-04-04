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

/**
 * Attaches the JWT as `x-access-token` header — matching the Flask backend's
 * `_get_token_from_header()` which reads `request.headers.get("x-access-token")`.
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const authService = inject(AuthService);
  const notifications = inject(NotificationService);
  const token = authService.getToken();
  const isAuthEntryCall = /\/auth\/(login|register)$/i.test(req.url);

  const requestToSend = token
    ? req.clone({ setHeaders: { 'x-access-token': token } })
    : req;

  return next(requestToSend).pipe(
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
