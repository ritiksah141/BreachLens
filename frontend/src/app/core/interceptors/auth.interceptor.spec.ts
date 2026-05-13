import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpTesting: HttpTestingController;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockNotifications: jasmine.SpyObj<NotificationService>;

  beforeEach(() => {
    mockAuthService = jasmine.createSpyObj('AuthService', [
      'getToken',
      'handleSessionExpired',
      'fetchProfile',
    ]);
    mockNotifications = jasmine.createSpyObj('NotificationService', ['show']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuthService },
        { provide: NotificationService, useValue: mockNotifications },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  // ---------------------------------------------------------------
  // Token attachment
  // ---------------------------------------------------------------
  it('should attach Authorization: Bearer header when token is available', () => {
    mockAuthService.getToken.and.returnValue('my-jwt-token');

    httpClient.get('/api/data').subscribe();

    const req = httpTesting.expectOne('/api/data');
    expect(req.request.headers.get('Authorization')).toBe('Bearer my-jwt-token');
    req.flush({});
  });

  it('should not attach Authorization header when token is null', () => {
    mockAuthService.getToken.and.returnValue(null);

    httpClient.get('/api/data').subscribe();

    const req = httpTesting.expectOne('/api/data');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  // ---------------------------------------------------------------
  // 401 handling
  // ---------------------------------------------------------------
  it('should call handleSessionExpired on 401 for non-auth endpoints', () => {
    mockAuthService.getToken.and.returnValue('token');

    httpClient.get('/api/breaches').subscribe({ error: () => {} });

    const req = httpTesting.expectOne('/api/breaches');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(mockAuthService.handleSessionExpired).toHaveBeenCalled();
  });

  it('should NOT call handleSessionExpired on 401 for /auth/login endpoint', () => {
    mockAuthService.getToken.and.returnValue(null);

    httpClient.post('/api/auth/login', {}).subscribe({ error: () => {} });

    const req = httpTesting.expectOne('/api/auth/login');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(mockAuthService.handleSessionExpired).not.toHaveBeenCalled();
  });

  it('should NOT call handleSessionExpired on 401 for /auth/register endpoint', () => {
    mockAuthService.getToken.and.returnValue(null);

    httpClient.post('/api/auth/register', {}).subscribe({ error: () => {} });

    const req = httpTesting.expectOne('/api/auth/register');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(mockAuthService.handleSessionExpired).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------
  // 403 handling
  // ---------------------------------------------------------------
  it('should show a notification on 403 responses', () => {
    mockAuthService.getToken.and.returnValue('token');
    mockAuthService.fetchProfile.and.returnValue({
      subscribe: (opts: any) => {},
    } as any);

    httpClient.get('/api/admin/stats').subscribe({ error: () => {} });

    const req = httpTesting.expectOne('/api/admin/stats');
    req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });

    expect(mockNotifications.show).toHaveBeenCalledWith(
      'Action blocked by server authorization policy.',
      'error',
      4500
    );
  });

  it('should call fetchProfile on 403 to re-sync role', () => {
    mockAuthService.getToken.and.returnValue('token');
    mockAuthService.fetchProfile.and.returnValue({
      subscribe: (opts: any) => {},
    } as any);

    httpClient.delete('/api/breaches/123').subscribe({ error: () => {} });

    const req = httpTesting.expectOne('/api/breaches/123');
    req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });

    expect(mockAuthService.fetchProfile).toHaveBeenCalled();
  });

  // ---------------------------------------------------------------
  // Error re-throwing
  // ---------------------------------------------------------------
  it('should re-throw the error so downstream subscribers receive it', (done) => {
    mockAuthService.getToken.and.returnValue('token');

    httpClient.get('/api/data').subscribe({
      error: (err: HttpErrorResponse) => {
        expect(err.status).toBe(500);
        done();
      },
    });

    const req = httpTesting.expectOne('/api/data');
    req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
  });

  it('should not call handleSessionExpired or show notification for non-401/403 errors', () => {
    mockAuthService.getToken.and.returnValue('token');

    httpClient.get('/api/data').subscribe({ error: () => {} });

    const req = httpTesting.expectOne('/api/data');
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });

    expect(mockAuthService.handleSessionExpired).not.toHaveBeenCalled();
    expect(mockNotifications.show).not.toHaveBeenCalled();
  });
});
