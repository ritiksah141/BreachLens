import { Component, signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RequireRoleDirective } from './require-role.directive';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/models';

// ── Minimal mock for AuthService ────────────────────────────────────

class MockAuthService {
  private _currentUser: WritableSignal<User | null> = signal(null);

  /** Expose as a readonly signal (matches computed signature). */
  currentUser = this._currentUser.asReadonly();

  setUser(user: User | null): void {
    this._currentUser.set(user);
  }
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    _id: '1',
    username: 'tester',
    email: 'test@example.com',
    role: 'guest',
    admin: false,
    is_active: true,
    ...overrides,
  };
}

// ── Test host component ────────────────────────────────────────────

@Component({
  standalone: true,
  imports: [RequireRoleDirective],
  template: `
    <div id="admin-only" *appRequireRole="'admin'">ADMIN CONTENT</div>
    <div id="analyst-only" *appRequireRole="'analyst'">ANALYST CONTENT</div>
    <div id="multi-role" *appRequireRole="['admin', 'analyst']">MULTI CONTENT</div>
  `,
})
class TestHostComponent {}

describe('RequireRoleDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let mockAuth: MockAuthService;

  beforeEach(async () => {
    mockAuth = new MockAuthService();

    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [{ provide: AuthService, useValue: mockAuth }],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  function queryText(id: string): string | null {
    const el = fixture.nativeElement.querySelector(`#${id}`);
    return el ? el.textContent.trim() : null;
  }

  // ── no user (initial state) ──────────────────────────────────────

  it('should hide admin content when no user is logged in', () => {
    expect(queryText('admin-only')).toBeNull();
  });

  it('should hide analyst content when no user is logged in', () => {
    expect(queryText('analyst-only')).toBeNull();
  });

  it('should hide multi-role content when no user is logged in', () => {
    expect(queryText('multi-role')).toBeNull();
  });

  // ── guest user ───────────────────────────────────────────────────

  it('should hide admin content for a guest user', () => {
    mockAuth.setUser(makeUser({ role: 'guest', admin: false }));
    fixture.detectChanges();
    expect(queryText('admin-only')).toBeNull();
  });

  it('should hide analyst content for a guest user', () => {
    mockAuth.setUser(makeUser({ role: 'guest', admin: false }));
    fixture.detectChanges();
    expect(queryText('analyst-only')).toBeNull();
  });

  // ── admin user ───────────────────────────────────────────────────

  it('should show admin content for an admin user (role match)', () => {
    mockAuth.setUser(makeUser({ role: 'admin', admin: true }));
    fixture.detectChanges();
    expect(queryText('admin-only')).toBe('ADMIN CONTENT');
  });

  it('should show admin content when admin flag is true even if role is different', () => {
    // The directive checks: r === 'admin' && isAdmin
    mockAuth.setUser(makeUser({ role: 'analyst', admin: true }));
    fixture.detectChanges();
    expect(queryText('admin-only')).toBe('ADMIN CONTENT');
  });

  // ── analyst user ─────────────────────────────────────────────────

  it('should show analyst content for an analyst user', () => {
    mockAuth.setUser(makeUser({ role: 'analyst', admin: false }));
    fixture.detectChanges();
    expect(queryText('analyst-only')).toBe('ANALYST CONTENT');
  });

  it('should hide admin content for an analyst without admin flag', () => {
    mockAuth.setUser(makeUser({ role: 'analyst', admin: false }));
    fixture.detectChanges();
    expect(queryText('admin-only')).toBeNull();
  });

  // ── multi-role binding ────────────────────────────────────────────

  it('should show multi-role content for admin', () => {
    mockAuth.setUser(makeUser({ role: 'admin', admin: true }));
    fixture.detectChanges();
    expect(queryText('multi-role')).toBe('MULTI CONTENT');
  });

  it('should show multi-role content for analyst', () => {
    mockAuth.setUser(makeUser({ role: 'analyst', admin: false }));
    fixture.detectChanges();
    expect(queryText('multi-role')).toBe('MULTI CONTENT');
  });

  it('should hide multi-role content for guest', () => {
    mockAuth.setUser(makeUser({ role: 'guest', admin: false }));
    fixture.detectChanges();
    expect(queryText('multi-role')).toBeNull();
  });

  // ── dynamic role change ──────────────────────────────────────────

  it('should show then hide content when user logs out', () => {
    mockAuth.setUser(makeUser({ role: 'admin', admin: true }));
    fixture.detectChanges();
    expect(queryText('admin-only')).toBe('ADMIN CONTENT');

    mockAuth.setUser(null);
    fixture.detectChanges();
    expect(queryText('admin-only')).toBeNull();
  });

  it('should hide then show content when user role changes', () => {
    mockAuth.setUser(makeUser({ role: 'guest', admin: false }));
    fixture.detectChanges();
    expect(queryText('analyst-only')).toBeNull();

    mockAuth.setUser(makeUser({ role: 'analyst', admin: false }));
    fixture.detectChanges();
    expect(queryText('analyst-only')).toBe('ANALYST CONTENT');
  });

  // ── does not duplicate views ──────────────────────────────────────

  it('should not duplicate the view on repeated matching updates', () => {
    mockAuth.setUser(makeUser({ role: 'admin', admin: true }));
    fixture.detectChanges();
    mockAuth.setUser(makeUser({ role: 'admin', admin: true }));
    fixture.detectChanges();

    const elements = fixture.nativeElement.querySelectorAll('#admin-only');
    expect(elements.length).toBe(1);
  });
});
