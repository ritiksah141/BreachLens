import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { catchError, of, timer, switchMap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HealthService {
  private http = inject(HttpClient);

  isOnline = signal(navigator.onLine);
  isBackendReady = signal(false);

  constructor() {
    window.addEventListener('online', () => this.isOnline.set(true));
    window.addEventListener('offline', () => {
      this.isOnline.set(false);
      this.isBackendReady.set(false);
    });

    // Start polling health every 30 seconds
    timer(0, 30000).pipe(
      switchMap(() => {
        if (!this.isOnline()) return of(null);
        return this.http.get(`${environment.apiUrl}/health/live`).pipe(
          catchError(() => of(null))
        );
      })
    ).subscribe(res => {
      this.isBackendReady.set(!!res);
    });
  }

  get isSecureChannelActive(): boolean {
    return this.isOnline() && this.isBackendReady();
  }
}
