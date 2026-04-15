import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { of, throwError, Observable } from 'rxjs';
import { signal, WritableSignal } from '@angular/core';
import { authGuard, adminGuard, analystGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

describe('Auth Guards', () => {
  let mockRouter: jasmine.SpyObj<Router>;
  let mockNotifications: jasmine.SpyObj<NotificationService>;
  let loginUrlTree: UrlTree;
  let homeUrlTree: UrlTree;

  // Signal-based mocks for computed properties
  let isAuthenticatedSignal: WritableSignal<boolean>;
  let isAdminSignal: WritableSignal<boolean>;
  let isAnalystSignal: WritableSignal<boolean>;
  let fetchProfileSpy: jasmine.Spy;

  beforeEach(() => {
    loginUrlTree = new (class extends UrlTree {})();
    homeUrlTree = new (class extends UrlTree {})();

    mockRouter = jasmine.createSpyObj('Router', ['createUrlTree']);
    mockRouter.createUrlTree.and.callFake((commands: string[]) => {
      if (commands[0] === '/auth/login') return loginUrlTree;
      if (commands[0] === '/') return homeUrlTree;
      return new (class extends UrlTree {})();
    });

    mockNotifications = jasmine.createSpyObj('NotificationService', ['show']);

    // Create writable signals to mock computed() properties
    isAuthenticatedSignal = signal(false);
    isAdminSignal = signal(false);
    isAnalystSignal = signal(false);
    fetchProfileSpy = jasmine.createSpy('fetchProfile');

    const mockAuthService = {
      isAuthenticated: isAuthenticatedSignal,
      isAdmin: isAdminSignal,
      isAnalyst: isAnalystSignal,
      fetchProfile: fetchProfileSpy,
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: NotificationService, useValue: mockNotifications },
      ],
    });
  });

  // ---------------------------------------------------------------
  // authGuard
  // ---------------------------------------------------------------
  describe('authGuard', () => {
    it('should return true when user is authenticated', () => {
      isAuthenticatedSignal.set(true);
      const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
      expect(result).toBeTrue();
    });

    it('should redirect to /auth/login when user is not authenticated', () => {
      isAuthenticatedSignal.set(false);
      const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
      expect(result).toBe(loginUrlTree);
    });

    it('should show a warning notification when user is not authenticated', () => {
      isAuthenticatedSignal.set(false);
      TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
      expect(mockNotifications.show).toHaveBeenCalledWith(
        'Please log in to continue.',
        'warning',
        3500
      );
    });
  });

  // ---------------------------------------------------------------
  // adminGuard
  // ---------------------------------------------------------------
  describe('adminGuard', () => {
    it('should redirect to /auth/login when user is not authenticated', () => {
      isAuthenticatedSignal.set(false);
      const result = TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any));
      expect(result).toBe(loginUrlTree);
      expect(mockNotifications.show).toHaveBeenCalledWith(
        'Please log in to access admin features.',
        'warning',
        3500
      );
    });

    it('should return true immediately when user is authenticated and already admin', () => {
      isAuthenticatedSignal.set(true);
      isAdminSignal.set(true);
      const result = TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any));
      expect(result).toBeTrue();
    });

    it('should re-fetch profile and return true when server confirms admin role', (done) => {
      isAuthenticatedSignal.set(true);
      isAdminSignal.set(false);
      // After fetchProfile completes, flip the admin signal to true
      fetchProfileSpy.and.returnValue(of({} as any).pipe(
        // Simulate the profile fetch updating the signal
      ));
      // We need fetchProfile to trigger isAdmin becoming true
      // In real code, fetchProfile updates the _user signal which updates isAdmin computed.
      // Here we simulate that by setting isAdminSignal to true after fetchProfile is called.
      fetchProfileSpy.and.callFake(() => {
        isAdminSignal.set(true);
        return of({} as any);
      });

      const result$ = TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any)) as Observable<boolean | UrlTree>;
      result$.subscribe((val) => {
        expect(val).toBeTrue();
        expect(fetchProfileSpy).toHaveBeenCalled();
        done();
      });
    });

    it('should redirect to / when server confirms user is not admin', (done) => {
      isAuthenticatedSignal.set(true);
      isAdminSignal.set(false);
      fetchProfileSpy.and.returnValue(of({} as any));

      const result$ = TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any)) as Observable<boolean | UrlTree>;
      result$.subscribe((val) => {
        expect(val).toBe(homeUrlTree);
        expect(mockNotifications.show).toHaveBeenCalledWith(
          'Access denied: admin privileges are required.',
          'error',
          4500
        );
        done();
      });
    });

    it('should redirect to / when fetchProfile errors out', (done) => {
      isAuthenticatedSignal.set(true);
      isAdminSignal.set(false);
      fetchProfileSpy.and.returnValue(throwError(() => new Error('Network error')));

      const result$ = TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any)) as Observable<boolean | UrlTree>;
      result$.subscribe((val) => {
        expect(val).toBe(homeUrlTree);
        expect(mockNotifications.show).toHaveBeenCalledWith(
          'Access denied: admin privileges are required.',
          'error',
          4500
        );
        done();
      });
    });
  });

  // ---------------------------------------------------------------
  // analystGuard
  // ---------------------------------------------------------------
  describe('analystGuard', () => {
    it('should return true when user has analyst access', () => {
      isAnalystSignal.set(true);
      const result = TestBed.runInInjectionContext(() => analystGuard({} as any, {} as any));
      expect(result).toBeTrue();
    });

    it('should redirect to /auth/login when user lacks analyst access', () => {
      isAnalystSignal.set(false);
      const result = TestBed.runInInjectionContext(() => analystGuard({} as any, {} as any));
      expect(result).toBe(loginUrlTree);
    });

    it('should show a warning notification when user lacks analyst access', () => {
      isAnalystSignal.set(false);
      TestBed.runInInjectionContext(() => analystGuard({} as any, {} as any));
      expect(mockNotifications.show).toHaveBeenCalledWith(
        'Analyst access is required for this section.',
        'warning',
        3500
      );
    });
  });
});
