import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NotificationService } from './notification.service';
import {
  ApiResponse,
  AuthToken,
  LoginCredentials,
  RegisterPayload,
  User,
} from '../models/models';

const TOKEN_KEY = 'bl_token';
const USER_KEY = 'bl_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = environment.apiUrl;
  private _lastSessionExpiryNoticeAt = 0;

  // Reactive state — signals
  private _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private _user = signal<User | null>(this._loadUser());

  readonly isAuthenticated = computed(() => !!this._getValidToken(this._token()));
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
    this._purgeExpiredSession();
  }

  // ------------------------------------------------------------------
  // Token helpers (used by AuthInterceptor)
  // ------------------------------------------------------------------

  getToken(): string | null {
    const token = this._getValidToken(this._token());
    if (!token && this._token()) {
      this._clearSession();
    }
    return token;
  }

  // ------------------------------------------------------------------
  // Auth operations
  // ------------------------------------------------------------------

  login(credentials: LoginCredentials): Observable<ApiResponse<AuthToken>> {
    return this.http
      .post<ApiResponse<AuthToken>>(`${this.apiUrl}/auth/login`, credentials)
      .pipe(
        tap((res) => {
          const token = res.data?.token;
          if (token) {
            localStorage.setItem(TOKEN_KEY, token);
            this._token.set(token);
            this._lastSessionExpiryNoticeAt = 0;
            // Fetch user profile after login
            this.fetchProfile().subscribe();
          }
        }),
        catchError((err) => throwError(() => err))
      );
  }

  register(payload: RegisterPayload): Observable<ApiResponse<User>> {
    return this.http
      .post<ApiResponse<User>>(`${this.apiUrl}/auth/register`, payload)
      .pipe(catchError((err) => throwError(() => err)));
  }

  logout(): void {
    const token = this._token();
    if (token) {
      // Blacklist the token on the server
      this.http.post(`${this.apiUrl}/auth/logout`, {}).subscribe();
    }
    this._clearSession();
    this.router.navigate(['/']);
  }

  handleSessionExpired(): void {
    const hadSession = Boolean(this._token() || this._user());
    this._clearSession();

    if (!hadSession) return;

    const now = Date.now();
    if (now - this._lastSessionExpiryNoticeAt > 3000) {
      this._lastSessionExpiryNoticeAt = now;
      this.notifications.show('Your session has expired. Please log in again.', 'warning', 5000);
    }

    this.router.navigate(['/auth/login'], { queryParams: { reason: 'expired' } });
  }

  fetchProfile(): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.apiUrl}/auth/me`).pipe(
      tap((res) => {
        const user = res.data;
        if (user) {
          localStorage.setItem(USER_KEY, JSON.stringify(user));
          this._user.set(user);
        }
      }),
      catchError((err) => throwError(() => err))
    );
  }

  // ------------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------------

  private _loadUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }

  private _getValidToken(token: string | null): string | null {
    if (!token || this._isTokenExpired(token)) return null;
    return token;
  }

  private _isTokenExpired(token: string): boolean {
    try {
      const payload = token.split('.')[1];
      if (!payload) return true;

      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
      const decoded = atob(padded);
      const parsed = JSON.parse(decoded);

      const exp = Number(parsed?.exp);
      if (!Number.isFinite(exp)) return false;
      return exp <= Math.floor(Date.now() / 1000);
    } catch {
      return true;
    }
  }

  private _purgeExpiredSession(): void {
    const token = this._token();
    if (token && this._isTokenExpired(token)) {
      this._clearSession();
    }
  }

  private _clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._token.set(null);
    this._user.set(null);
  }
}
