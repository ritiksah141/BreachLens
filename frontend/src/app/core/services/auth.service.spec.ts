import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  const makeJwt = (expOffsetSeconds = 3600): string => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expOffsetSeconds }));
    return `${header}.${payload}.signature`;
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start unauthenticated', () => {
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.getToken()).toBeNull();
  });

  it('should store token on successful login', () => {
    service.login({ email: 'test@test.com', password: 'Test1234' }).subscribe(); // pragma: allowlist secret

    const req = http.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'test@test.com', password: 'Test1234' }); // pragma: allowlist secret

    const token = makeJwt();
    req.flush({ status: 'ok', data: { token } });

    // Profile fetch triggered after login
    const profileReq = http.expectOne(`${environment.apiUrl}/auth/me`);
    profileReq.flush({
      status: 'ok',
      data: { _id: '1', username: 'testuser', email: 'test@test.com', role: 'analyst', admin: false, is_active: true },
    });

    expect(service.isAuthenticated()).toBeTrue();
    expect(service.getToken()).toBe(token);
    expect(localStorage.getItem('bl_token')).toBe(token);
  });

  it('should clear token on logout', () => {
    const token = makeJwt();
    localStorage.setItem('bl_token', token);
    (service as any)._token.set(token);

    service.logout();

    const req = http.expectOne(`${environment.apiUrl}/auth/logout`);
    req.flush({});

    expect(localStorage.getItem('bl_token')).toBeNull();
  });

  it('should return analyst role from currentUser', () => {
    const mockUser = {
      _id: '1', username: 'analyst1', email: 'a@b.com',
      role: 'analyst' as const, admin: false, is_active: true,
    };
    (service as any)._user.set(mockUser);

    expect(service.isAnalyst()).toBeTrue();
    expect(service.isAdmin()).toBeFalse();
  });
});
