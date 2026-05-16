import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { signal, computed } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { ProfileComponent } from './profile.component';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { HealthService } from '../../../core/services/health.service';
import { NotificationService } from '../../../core/services/notification.service';
import { User } from '../../../core/models/models';

// ---------------------------------------------------------------------------
// Mock factory — mirrors the signal-based AuthService API
// ---------------------------------------------------------------------------
function createMockAuthService(user: User | null = null) {
  const _user = signal(user);
  const _isAuthenticated = computed(() => !!_user());
  const _isAdmin = computed(() => _user()?.role === 'admin');
  const _isAnalyst = computed(
    () => _user()?.role === 'analyst' || _user()?.role === 'admin'
  );

  return {
    currentUser: signal(user),
    isAuthenticated: _isAuthenticated,
    isAdmin: _isAdmin,
    isAnalyst: _isAnalyst,
    fetchProfile: jasmine.createSpy('fetchProfile').and.returnValue(of({ data: user })),
    logout: jasmine.createSpy('logout'),
  };
}

const MOCK_ADMIN_USER: User = {
  _id: '6612a1b2c3d4e5f600112233',
  username: 'admin_user',
  email: 'admin@breachlens.io',
  role: 'admin',
  admin: true,
  is_active: true,
  created_at: '2024-03-15T10:30:00Z',
  last_login: '2025-06-01T14:22:00Z',
};

const MOCK_ANALYST_USER: User = {
  _id: '6612a1b2c3d4e5f600445566',
  username: 'analyst_user',
  email: 'analyst@breachlens.io',
  role: 'analyst',
  admin: false,
  is_active: true,
  created_at: '2024-06-20T08:00:00Z',
  last_login: '2025-05-28T09:15:00Z',
};

const MOCK_GUEST_USER: User = {
  _id: '6612a1b2c3d4e5f600778899',
  username: 'guest_user',
  email: 'guest@breachlens.io',
  role: 'guest',
  admin: false,
  is_active: true,
  created_at: '2025-01-10T12:00:00Z',
};

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let mockAuth: any;
  let mockUserService: jasmine.SpyObj<UserService>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;

  async function configureTestBed(user: User | null) {
    mockAuth = createMockAuthService(user);
    mockUserService = jasmine.createSpyObj('UserService', ['updateUser']);
    mockNotificationService = jasmine.createSpyObj('NotificationService', ['show']);

    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideRouter([
          { path: '', component: class {} as any },
          { path: 'breaches', component: class {} as any },
          { path: 'admin', component: class {} as any }
        ]),
        { provide: AuthService, useValue: mockAuth },
        { provide: UserService, useValue: mockUserService },
        { provide: NotificationService, useValue: mockNotificationService },
        {
          provide: HealthService,
          useValue: {
            isBackendReady: signal(true),
            isOnline: signal(true),
            isSecureChannelActive: true
          }
        },
      ],
    }).compileComponents();
  }

  describe('with an admin user', () => {
    beforeEach(async () => {
      await configureTestBed(MOCK_ADMIN_USER);
      fixture = TestBed.createComponent(ProfileComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should call fetchProfile on init', () => {
      expect(mockAuth.fetchProfile).toHaveBeenCalled();
    });

    it('should display the username', () => {
      const el = fixture.debugElement.query(By.css('h2.fs-3'));
      expect(el.nativeElement.textContent).toContain('admin_user');
    });

    it('should display the email', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('admin@breachlens.io');
    });

    it('should compute initials from the username', () => {
      expect(component.initials).toBe('A');
    });

    it('should return clearance "Level 5" for admin role', () => {
      expect(component.clearanceLabel).toBe('Level 5');
    });

    it('should return roleLabel "ADMIN"', () => {
      expect(component.roleLabel).toBe('ADMIN');
    });

    it('should return roleToneClass "role-admin"', () => {
      expect(component.roleToneClass()).toBe('role-admin');
    });

    it('should render the role badge with role-admin class', () => {
      const badge = fixture.debugElement.query(By.css('span.badge'));
      expect(badge.nativeElement.classList).toContain('role-admin');
      expect(badge.nativeElement.textContent.trim()).toBe('ADMIN');
    });

    it('should show the admin "Admin Tools" navigation link', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Admin Tools');
    });

    it('should display last login date', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Jun 01');
    });

    it('should call logout when Terminate session button is clicked', () => {
      const btn = fixture.debugElement.query(
        By.css('button.btn-error')
      );
      btn.nativeElement.click();
      expect(mockAuth.logout).toHaveBeenCalled();
    });
  });

  describe('with an analyst user', () => {
    beforeEach(async () => {
      await configureTestBed(MOCK_ANALYST_USER);
      fixture = TestBed.createComponent(ProfileComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should return clearance "Level 3" for analyst role', () => {
      expect(component.clearanceLabel).toBe('Level 3');
    });

    it('should return roleToneClass "role-analyst"', () => {
      expect(component.roleToneClass()).toBe('role-analyst');
    });

    it('should render the role badge with role-analyst class', () => {
      const badge = fixture.debugElement.query(By.css('span.badge'));
      expect(badge.nativeElement.classList).toContain('role-analyst');
    });

    it('should NOT show the admin "Admin Tools" link', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).not.toContain('Admin Tools');
    });
  });

  describe('with a guest user', () => {
    beforeEach(async () => {
      await configureTestBed(MOCK_GUEST_USER);
      fixture = TestBed.createComponent(ProfileComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should return clearance "Level 1" for guest role', () => {
      expect(component.clearanceLabel).toBe('Level 1');
    });

    it('should return roleToneClass "role-guest"', () => {
      expect(component.roleToneClass()).toBe('role-guest');
    });

    it('should display "FIRST LOGIN" when last_login is not set', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('FIRST LOGIN');
    });
  });

  describe('with a null user (unauthenticated)', () => {
    beforeEach(async () => {
      await configureTestBed(null);
      fixture = TestBed.createComponent(ProfileComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should handle null user gracefully — display "GUEST"', () => {
      const el = fixture.debugElement.query(By.css('h2.fs-3'));
      expect(el.nativeElement.textContent).toContain('GUEST');
    });

    it('should display "N/A" when user email is null', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('N/A');
    });

    it('should return "?" initial when user is null', () => {
      expect(component.initials).toBe('?');
    });

    it('should default roleLabel to "GUEST" when user is null', () => {
      expect(component.roleLabel).toBe('GUEST');
    });

    it('should default clearanceLabel to "Level 1" when user is null', () => {
      expect(component.clearanceLabel).toBe('Level 1');
    });

    it('should return roleToneClass "role-guest" when user is null', () => {
      expect(component.roleToneClass()).toBe('role-guest');
    });
  });
});
