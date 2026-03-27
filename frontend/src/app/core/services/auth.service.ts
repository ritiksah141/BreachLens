import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
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

  // Reactive state — signals
  private _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private _user = signal<User | null>(this._loadUser());

  readonly isAuthenticated = computed(() => !!this._token());
  readonly currentUser = computed(() => this._user());
  readonly isAdmin = computed(() => this._user()?.role === 'admin');
  readonly isAnalyst = computed(
    () =>
      this._user()?.role === 'analyst' || this._user()?.role === 'admin'
  );

  constructor(private http: HttpClient, private router: Router) {}

  // ------------------------------------------------------------------
  // Token helpers (used by AuthInterceptor)
  // ------------------------------------------------------------------

  getToken(): string | null {
    return this._token();
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
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._token.set(null);
    this._user.set(null);
    this.router.navigate(['/']);
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
}
