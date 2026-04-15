import { inject } from '@angular/core';
import { ResolveFn, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { BreachService } from '../services/breach.service';
import { NotificationService } from '../services/notification.service';
import { Breach } from '../models/models';

export const breachResolver: ResolveFn<Breach | null> = (route) => {
  const breachService = inject(BreachService);
  const notifications = inject(NotificationService);
  const router = inject(Router);
  const id = route.paramMap.get('id') ?? '';

  return breachService.getBreach(id).pipe(
    map((res: any) => res.data as Breach),
    catchError(() => {
      notifications.show('Breach not found.', 'error', 3000);
      router.navigate(['/breaches']);
      return of(null);
    })
  );
};
