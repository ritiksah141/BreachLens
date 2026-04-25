import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';
import { NotificationService } from './core/services/notification.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, FormsModule],
  template: `
    <div class="app-container bg-surface">
      @if (showAppChrome()) {
        <!-- Floating Sidebar -->
        <aside class="sidebar glass-panel shadow-lg" [class.collapsed]="isCollapsed()">
          <div class="sidebar-toggle" (click)="toggleSidebar()">
            <span class="material-symbols-outlined">
              {{ isCollapsed() ? 'chevron_right' : 'chevron_left' }}
            </span>
          </div>

          <div class="sidebar-header p-4 d-flex align-items-center gap-3 overflow-hidden">
            <a class="brand-lockup text-decoration-none" routerLink="/" aria-label="BreachLens home">
              <span class="brand-logo" aria-hidden="true">
                <span class="brand-chip brand-chip-a">
                  <span class="material-symbols-outlined brand-chip-icon">security</span>
                </span>
                <span class="brand-chip brand-chip-b">
                  <span class="material-symbols-outlined brand-chip-icon">visibility</span>
                </span>
              </span>
              <span class="brand-wordmark fs-5 fw-bold text-primary font-headline nav-label" *ngIf="!isCollapsed()">BreachLens</span>
            </a>
          </div>

          <nav class="flex-grow-1 mt-2">
            <a class="nav-item" routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">
              <span class="material-symbols-outlined">dashboard</span>
              <span class="nav-label">Dashboard</span>
            </a>
            <a class="nav-item" routerLink="/breaches" routerLinkActive="active">
              <span class="material-symbols-outlined">database</span>
              <span class="nav-label">Breach Log</span>
            </a>
            <a class="nav-item" routerLink="/map" routerLinkActive="active">
              <span class="material-symbols-outlined">query_stats</span>
              <span class="nav-label">Exposure Intel</span>
            </a>
            @if (auth.isAdmin()) {
              <a class="nav-item" routerLink="/admin" routerLinkActive="active">
                <span class="material-symbols-outlined">admin_panel_settings</span>
                <span class="nav-label">Admin Terminal</span>
              </a>
            }
          </nav>

          <div class="sidebar-footer p-3 border-top border-outline-variant border-opacity-10">
            <div class="nav-item" (click)="themeService.toggleTheme()">
              <span class="material-symbols-outlined">
                {{ themeService.theme() === 'dark' ? 'light_mode' : 'dark_mode' }}
              </span>
              <span class="nav-label">Theme</span>
            </div>

            <div class="dropdown">
              <div class="nav-item" data-bs-toggle="dropdown">
                <span class="material-symbols-outlined">person</span>
                <span class="nav-label">{{ auth.isAuthenticated() ? 'Profile' : 'Account' }}</span>
              </div>
              <ul class="dropdown-menu glass-panel border-outline-variant shadow-lg">
                @if (auth.isAuthenticated()) {
                  <li><a class="dropdown-item text-xs-caps text-on-surface" routerLink="/auth/profile">Profile</a></li>
                  <li><hr class="dropdown-divider"></li>
                  <li><button class="dropdown-item text-xs-caps text-error" (click)="logout()">Logout</button></li>
                } @else {
                  <li><a class="dropdown-item text-xs-caps text-on-surface" routerLink="/auth/login">Login</a></li>
                  <li><a class="dropdown-item text-xs-caps text-on-surface" routerLink="/auth/register">Sign Up</a></li>
                }
              </ul>

            </div>
          </div>
        </aside>
      }

      <!-- Main Content Area -->
      <main class="main-content custom-scrollbar">
        <div class="content-inner">
          <router-outlet />
        </div>
      </main>
    </div>

    <!-- Notifications Stack -->
    <div class="toast-stack" aria-live="polite" aria-atomic="true">
      @for (n of notifications.notifications(); track n.id) {
        <div class="app-toast" [ngClass]="'app-toast-' + n.level">
          <div class="d-flex align-items-center justify-content-between gap-3">
            <div class="d-flex align-items-center gap-3">
              <span class="text-xs-caps toast-message">{{ n.message }}</span>
              @if (n.action) {
                <button class="btn btn-primary py-1 px-2 text-xs-caps fw-bold" style="font-size: 7px;" (click)="n.action.callback(); dismissToast(n.id)">
                  {{ n.action.label }}
                </button>
              }
            </div>
            <button class="btn-close-tactical" (click)="dismissToast(n.id)" aria-label="Dismiss notification">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .brand-lockup {
      display: inline-flex;
      align-items: center;
      gap: 0.8rem;
      cursor: pointer;
    }
    .brand-logo {
      width: 34px;
      height: 34px;
      border-radius: 0.75rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(145deg, var(--surface-container-high), var(--surface-container-low));
      box-shadow: 0 0 12px color-mix(in srgb, var(--primary) 14%, transparent);
      border: 1px solid var(--outline-variant);
      position: relative;
      overflow: hidden;
      gap: 2px;
      padding: 3px;
    }
    .brand-logo::before {
      content: '';
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        -35deg,
        transparent 0,
        transparent 5px,
        rgba(136, 146, 155, 0.16) 5px,
        rgba(136, 146, 155, 0.16) 6px
      );
      opacity: 0.55;
      pointer-events: none;
    }
    .brand-chip {
      position: relative;
      z-index: 1;
      width: 13px;
      height: 22px;
      border-radius: 0.45rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      font-family: var(--font-headline);
      font-weight: 800;
      letter-spacing: 0.04em;
      background: var(--surface-container-lowest);
      color: var(--primary);
      border: 1px solid var(--outline-variant);
    }
    .brand-chip-icon {
      font-size: 9px;
      font-variation-settings: 'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 20;
      line-height: 1;
    }
    .brand-chip-a { transform: rotate(-6deg) translateY(-1px); }
    .brand-chip-b { transform: rotate(7deg) translateY(1px); }
    .brand-wordmark {
      position: relative;
      text-shadow: 0 0 10px color-mix(in srgb, var(--primary) 20%, transparent);
      letter-spacing: -0.02em;
    }
    :host-context([data-theme='light']) .brand-wordmark {
      text-shadow: none;
    }
  `]
})
export class AppComponent implements OnInit {
  auth = inject(AuthService);
  themeService = inject(ThemeService);
  notifications = inject(NotificationService);
  private router = inject(Router);

  isCollapsed = signal(false);
  searchTerm = '';

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.auth.fetchProfile().subscribe({ error: () => {} });
    }
  }

  toggleSidebar() {
    this.isCollapsed.set(!this.isCollapsed());
  }

  logout() {
    this.auth.logout();
  }

  dismissToast(id: number): void {
    this.notifications.dismiss(id);
  }

  showAppChrome(): boolean {
    const route = this.router.url.split('?')[0];
    const hiddenRoutes = ['/auth/login', '/auth/register', '/auth/reset-password'];
    return !hiddenRoutes.some(r => route.startsWith(r));
  }
}
