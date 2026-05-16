import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NotificationService } from './notification.service';
import {
  ApiResponse,
  AuthToken,
  LoginCredentials,
  RegisterPayload,
  User,
} from '../models/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = environment.apiUrl;

  // Reactive state — signals
  private _user = signal<User | null>(null);
  readonly showSessionModal = signal(false);

  readonly isAuthenticated = computed(() => !!this._user());
  readonly currentUser = computed(() => this._user());
  readonly isAdmin = computed(() => this._user()?.role === 'admin');
  readonly isAnalyst = computed(
    () =>
      this._user()?.role === 'analyst' || this._user()?.role === 'admin'
  );

  constructor(
    private http: HttpClient,
    private router: Router,
    private notifications: NotificationService
  ) {
    this.fetchProfile().subscribe({ error: () => {} });
  }

  // ------------------------------------------------------------------
  // Token helpers (used by AuthInterceptor)
  // ------------------------------------------------------------------

  getToken(): string | null {
    return localStorage.getItem('bl_token');
  }

  // ------------------------------------------------------------------
  // Auth operations
  // ------------------------------------------------------------------

  login(credentials: LoginCredentials): Observable<ApiResponse<User>> {
    return this.http
      .post<ApiResponse<AuthToken>>(`${this.apiUrl}/auth/login`, credentials)
      .pipe(
        switchMap((res) => {
          const token = res.data?.token;
          if (token) {
            localStorage.setItem('bl_token', token);
            return this.fetchProfile();
          }
          return throwError(() => new Error('No token received'));
        }),
        catchError((err) => throwError(() => err))
      );
  }

  register(payload: RegisterPayload): Observable<ApiResponse<User>> {
    return this.http
      .post<ApiResponse<User>>(`${this.apiUrl}/auth/register`, payload)
      .pipe(
        tap(() => this.notifications.show('Your account has been created.', 'success', 4000)),
        catchError((err) => throwError(() => err))
      );
  }

  requestPasswordReset(email: string): Observable<ApiResponse<{ message: string; reset_token?: string }>> {
    return this.http
      .post<ApiResponse<{ message: string; reset_token?: string }>>(`${this.apiUrl}/auth/forgot-password`, { email })
      .pipe(catchError((err) => throwError(() => err)));
  }

  resetPassword(token: string, newPassword: string, confirmPassword: string): Observable<ApiResponse<{ message: string }>> {
    return this.http
      .post<ApiResponse<{ message: string }>>(`${this.apiUrl}/auth/reset-password`, {
        token,
        new_password: newPassword,
        confirm_password: confirmPassword,
      })
      .pipe(catchError((err) => throwError(() => err)));
  }

  logout(): void {
    this.http.post(`${this.apiUrl}/auth/logout`, {}).subscribe();
    this._clearSession();
    this.notifications.clearHistory();
    this.notifications.show('You have been logged out.', 'info', 3000);
    this.router.navigate(['/dashboard']);
  }

  handleSessionExpired(): void {
    const hadSession = Boolean(this._user());
    if (!hadSession) return;

    this._clearSession();
    this.notifications.clearHistory();
    this.showSessionModal.set(true);

    this.router.navigate(['/dashboard']);
  }

  fetchProfile(): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.apiUrl}/auth/me`).pipe(
      tap((res) => {
        const user = res.data;
        if (user) {
          this._user.set(user);
        }
      }),
      catchError((err) => throwError(() => err))
    );
  }

  // ------------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------------

  private _clearSession(): void {
    this._user.set(null);
    localStorage.removeItem('bl_token');
  }
}
