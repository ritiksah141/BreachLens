import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notifications = inject(NotificationService);

  if (auth.isAuthenticated()) {
    return true;
  }
  notifications.show('Please log in to continue.', 'warning', 3500);
  return router.createUrlTree(['/auth/login']);
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notifications = inject(NotificationService);

  if (!auth.isAuthenticated()) {
    notifications.show('Please log in to access admin features.', 'warning', 3500);
    return router.createUrlTree(['/auth/login']);
  }

  if (auth.isAdmin()) {
    return true;
  }

  // Re-sync role from backend so access is based on current server-side security state.
  return auth.fetchProfile().pipe(
    map(() => {
      if (auth.isAdmin()) {
        return true;
      }
      notifications.show('Access denied: admin privileges are required.', 'error', 4500);
      return router.createUrlTree(['/']);
    }),
    catchError(() => {
      notifications.show('Access denied: admin privileges are required.', 'error', 4500);
      return of(router.createUrlTree(['/']));
    })
  );
};

export const analystGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notifications = inject(NotificationService);

  if (auth.isAnalyst()) {
    return true;
  }
  notifications.show('Analyst access is required for this section.', 'warning', 3500);
  return router.createUrlTree(['/auth/login']);
};
