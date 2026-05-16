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
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AuthService);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    // Initial fetch from constructor
    const req = http.expectOne(`${environment.apiUrl}/auth/me`);
    req.flush({ status: 'error', message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    expect(service).toBeTruthy();
  });

  it('should start unauthenticated', () => {
    // Initial fetch from constructor
    const req = http.expectOne(`${environment.apiUrl}/auth/me`);
    req.flush({ status: 'error', message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(service.isAuthenticated()).toBeFalse();
  });

  it('should store token on successful login', () => {
    // Handle initial fetch from constructor
    const initialReq = http.expectOne(`${environment.apiUrl}/auth/me`);
    initialReq.flush({ status: 'error' }, { status: 401, statusText: 'Unauthorized' });

    service.login({ email: 'test@test.com', password: 'Test1234' }).subscribe(); // pragma: allowlist secret

    const req = http.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'test@test.com', password: 'Test1234' }); // pragma: allowlist secret

    const token = 'mock-jwt-token';
    req.flush({ status: 'ok', data: { token } });

    // Profile fetch triggered after login success
    const profileReq = http.expectOne(`${environment.apiUrl}/auth/me`);
    profileReq.flush({
      status: 'ok',
      data: { _id: '1', username: 'testuser', email: 'test@test.com', role: 'analyst', admin: false, is_active: true },
    });

    expect(service.isAuthenticated()).toBeTrue();
  });

  it('should clear token on logout', () => {
    // Initial fetch from constructor
    const initialReq = http.expectOne(`${environment.apiUrl}/auth/me`);
    initialReq.flush({
      status: 'ok',
      data: { _id: '1', username: 'testuser', email: 'test@test.com', role: 'analyst', admin: false, is_active: true },
    });

    service.logout();

    const req = http.expectOne(`${environment.apiUrl}/auth/logout`);
    req.flush({});

    expect(service.isAuthenticated()).toBeFalse();
  });

  it('should return analyst role from currentUser', () => {
    // Initial fetch from constructor
    const initialReq = http.expectOne(`${environment.apiUrl}/auth/me`);
    initialReq.flush({
      status: 'ok',
      data: { _id: '1', username: 'analyst1', email: 'a@b.com', role: 'analyst', admin: false, is_active: true },
    });

    expect(service.isAnalyst()).toBeTrue();
    expect(service.isAdmin()).toBeFalse();
  });
});
