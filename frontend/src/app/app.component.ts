import { Component, HostListener, OnInit, inject } from '@angular/core';
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
    @if (showAppChrome()) {
    <header class="glass-panel position-sticky top-0 z-3 px-4 py-2 d-flex justify-content-between align-items-center shadow-lg border-bottom border-outline-variant" style="height: 64px;">
      <div class="d-flex align-items-center gap-4">
        <a class="brand-lockup text-decoration-none" routerLink="/" aria-label="BreachLens home">
          <span class="brand-logo" aria-hidden="true">
            <span class="brand-chip brand-chip-a">
              <span class="material-symbols-outlined brand-chip-icon">security</span>
            </span>
            <span class="brand-chip brand-chip-b">
              <span class="material-symbols-outlined brand-chip-icon">visibility</span>
            </span>
          </span>
          <span class="brand-wordmark fs-5 fw-bold tracking-tighter text-primary font-headline ">BreachLens</span>
        </a>
        <nav class="d-none d-md-flex gap-4">
          <a class="text-decoration-none font-headline fw-semibold text-xs-caps"
             routerLink="/" routerLinkActive="text-primary border-bottom border-primary border-2 pb-1" [routerLinkActiveOptions]="{exact:true}"
             style="color: var(--on-surface-variant); cursor: pointer;">Dashboard</a>
          <a class="text-decoration-none font-headline fw-semibold text-xs-caps"
             routerLink="/breaches" routerLinkActive="text-primary border-bottom border-primary border-2 pb-1"
             style="color: var(--on-surface-variant); cursor: pointer;">Breach Log</a>
          <a class="text-decoration-none font-headline fw-semibold text-xs-caps"
             routerLink="/map" routerLinkActive="text-primary border-bottom border-primary border-2 pb-1"
             style="color: var(--on-surface-variant); cursor: pointer;">Network Grid</a>
          @if (auth.isAdmin()) {
            <a class="text-decoration-none font-headline fw-semibold text-xs-caps"
               routerLink="/admin" routerLinkActive="text-primary border-bottom border-primary border-2 pb-1"
               style="color: var(--on-surface-variant); cursor: pointer;">Admin Terminal</a>
          }
        </nav>
      </div>

      <div class="d-flex align-items-center gap-3">
        <div class="position-relative d-none d-lg-block">
          <span class="material-symbols-outlined position-absolute start-0 top-50 translate-middle-y ms-3 text-on-surface-variant fs-6">search</span>
          <input class="form-control bg-surface-container border-0 text-xs-caps ps-5 py-2 rounded-3 text-on-surface"
                 placeholder="CMD + K TO SEARCH" style="width: 250px; font-size: 10px;"
                 [(ngModel)]="searchTerm" (keyup.enter)="onSearch()">
        </div>
        <button class="btn btn-link p-2 text-on-surface-variant rounded-circle hover-bg-surface" (click)="themeService.toggleTheme()">
          <span class="material-symbols-outlined">{{ themeService.theme() === 'dark' ? 'light_mode' : 'dark_mode' }}</span>
        </button>
        <div class="position-relative">
          <button
            class="btn btn-link p-2 text-on-surface-variant rounded-circle hover-bg-surface position-relative"
            (click)="toggleNotifications($event)"
            [attr.aria-expanded]="notificationsOpen"
            aria-label="Open notifications"
          >
            <span class="material-symbols-outlined">notifications</span>
            @if (notifications.notifications().length > 0) {
              <span class="notification-count-badge position-absolute top-0 start-100 translate-middle">
                {{ notifications.notifications().length > 9 ? '9+' : notifications.notifications().length }}
              </span>
            }
          </button>

          @if (notificationsOpen) {
            <section class="notification-panel glass-panel border-outline-variant shadow-lg" (click)="onNotificationPanelClick($event)">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="m-0 text-xs-caps text-on-surface">Notifications</h6>
                <button
                  class="clear-notifications-btn text-xs-caps"
                  (click)="clearNotifications()"
                  [disabled]="notifications.notifications().length === 0"
                >
                  Clear all
                </button>
              </div>

              @if (notifications.notifications().length === 0) {
                <p class="m-0 text-on-surface-variant small">No new notifications.</p>
              } @else {
                <div class="d-flex flex-column gap-2">
                  @for (n of notifications.notifications(); track n.id) {
                    <article class="notification-item" [ngClass]="'notification-item-' + n.level">
                      <div class="d-flex align-items-start justify-content-between gap-2">
                        <p class="m-0 small text-on-surface">{{ n.message }}</p>
                        <button class="btn btn-link p-0 text-on-surface-variant border-0" (click)="dismissToast(n.id)" aria-label="Dismiss notification">
                          <span class="material-symbols-outlined fs-6">close</span>
                        </button>
                      </div>
                    </article>
                  }
                </div>
              }
            </section>
          }
        </div>
        <div class="dropdown">
          <button class="btn btn-link p-0 border-0" data-bs-toggle="dropdown">
            <div class="rounded-circle bg-surface-container-highest d-flex align-items-center justify-content-center text-on-surface-variant"
                 style="width: 32px; height: 32px;">
              <span class="material-symbols-outlined fs-5">person</span>
            </div>
          </button>
          <ul class="dropdown-menu dropdown-menu-end glass-panel border-outline-variant shadow-lg">
            @if (auth.isAuthenticated()) {
              <li><a class="dropdown-item text-xs-caps text-on-surface" routerLink="/auth/profile">Profile</a></li>
              @if (auth.isAdmin()) {
                <li><a class="dropdown-item text-xs-caps text-on-surface" routerLink="/admin">Admin Control</a></li>
              }
              <li><hr class="dropdown-divider border-outline-variant"></li>
              <li><button class="dropdown-item text-xs-caps text-danger" (click)="logout()">Terminate Session</button></li>
            } @else {
              <li><a class="dropdown-item text-xs-caps text-on-surface" routerLink="/auth/login">Authorize</a></li>
              <li><a class="dropdown-item text-xs-caps text-on-surface" routerLink="/auth/register">Deploy Operator</a></li>
            }
          </ul>
        </div>
      </div>
    </header>
    }

    <div class="d-flex" [style.height]="showAppChrome() ? 'calc(100vh - 104px)' : '100vh'">
      <!-- Main Content Area -->
      <main class="flex-grow-1 overflow-auto p-4 bg-surface custom-scrollbar">
        <div class="container-fluid max-width-1600">
          <router-outlet />
        </div>
      </main>
    </div>

    <div class="toast-stack" aria-live="polite" aria-atomic="true">
      @for (n of notifications.notifications(); track n.id) {
        <div class="app-toast" [ngClass]="'app-toast-' + n.level">
          <div class="d-flex align-items-center justify-content-between gap-3">
            <span class="text-xs-caps toast-message">{{ n.message }}</span>
            <button class="btn btn-link p-0 text-on-surface-variant border-0" (click)="dismissToast(n.id)" aria-label="Dismiss notification">
              <span class="material-symbols-outlined fs-6">close</span>
            </button>
          </div>
        </div>
      }
    </div>

    @if (showAppChrome()) {
    <!-- Footer Ticker -->
    <footer class="bg-surface-container-lowest position-fixed bottom-0 start-0 w-100 z-3 border-top border-primary border-opacity-10 shadow-lg d-flex align-items-center px-4 overflow-hidden" style="height: 40px;">
      <div class="ticker-animation text-xs-caps text-tertiary-container fw-medium">
        <span>Live Threat Ticker: 12.04.99.1 active exploit detected in sector 4</span>
        <span class="mx-4 text-primary opacity-50">||</span>
        <span>192.168.1.104 lateral movement prevented</span>
        <span class="mx-4 text-primary opacity-50">||</span>
        <span class="text-primary">System health 99.8%</span>
        <span class="mx-4 text-primary opacity-50">||</span>
        <span>Encryption layer reinforced</span>
        <span class="mx-4 text-primary opacity-50">||</span>
        <span>DDoS attack mitigated in Asia North</span>
      </div>
      <div class="ms-auto ps-4 bg-surface-container-lowest d-flex align-items-center gap-4 z-2">
        <a routerLink="/map" class="text-decoration-none text-on-surface-variant text-xs-caps hover-text-on-surface">Global Map</a>
        <div class="text-primary text-xs-caps">Latency: 24ms</div>
        <div class="d-flex align-items-center gap-2 text-xs-caps text-on-surface-variant">
          <span class="p-1 bg-success rounded-circle animate-pulse"></span>
          API Status
        </div>
      </div>
    </footer>
    }
  `,
  styles: [`
    .tracking-tighter { letter-spacing: -0.05em; }
    .text-xs-caps { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; }
    .brand-lockup {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
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
      box-shadow: 0 0 12px rgba(123, 208, 255, 0.14);
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
      text-shadow: 0 0 10px rgba(123, 208, 255, 0.2);
      letter-spacing: -0.02em;
    }
    .brand-wordmark::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: -4px;
      height: 1px;
      background: linear-gradient(90deg, var(--primary), transparent);
      opacity: 0.65;
    }
    :host-context([data-theme='light']) .brand-logo {
      box-shadow: 0 0 10px rgba(14, 165, 233, 0.12);
    }
    :host-context([data-theme='light']) .brand-logo::before {
      opacity: 0.35;
    }
    :host-context([data-theme='light']) .brand-wordmark {
      text-shadow: none;
    }
    .hover-bg-surface:hover { background-color: var(--surface-container-high); }
    .hover-text-on-surface:hover { color: var(--on-surface) !important; }
    .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    .notification-count-badge {
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      margin-top: 10px;
      margin-left: -10px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.58rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      color: var(--on-tertiary-container);
      background: var(--tertiary-container);
      border: 1px solid var(--outline-variant);
      box-shadow: 0 0 0 2px var(--surface-container-lowest);
      line-height: 1;
    }
    .notification-panel {
      position: absolute;
      right: 0;
      top: calc(100% + 10px);
      width: min(88vw, 360px);
      max-height: 360px;
      overflow: auto;
      padding: 0.85rem;
      border-radius: 0.9rem;
      z-index: 1200;
    }
    .clear-notifications-btn {
      background: var(--surface-container-high);
      color: var(--primary);
      border: 1px solid var(--outline-variant);
      border-radius: 999px;
      padding: 0.22rem 0.55rem;
      letter-spacing: 0.1em;
      line-height: 1.2;
      transition: background-color 140ms ease, color 140ms ease, border-color 140ms ease;
    }
    .clear-notifications-btn:hover:not(:disabled) {
      background: var(--surface-container-highest);
      border-color: var(--primary);
      color: var(--on-surface);
    }
    .clear-notifications-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .notification-item {
      border: 1px solid var(--outline-variant);
      border-left-width: 3px;
      border-radius: 0.65rem;
      padding: 0.5rem 0.55rem;
      background: var(--surface-container-high);
    }
    .notification-item-info { border-left-color: #38bdf8; }
    .notification-item-success { border-left-color: #4ade80; }
    .notification-item-warning { border-left-color: #f59e0b; }
    .notification-item-error { border-left-color: #f87171; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
    .max-width-1600 { max-width: 1600px; margin: 0 auto; }
    .toast-stack {
      position: fixed;
      top: 76px;
      right: 16px;
      z-index: 1100;
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: min(92vw, 420px);
    }
    .app-toast {
      padding: 0.75rem 0.875rem;
      border-radius: 0.75rem;
      border: 1px solid var(--outline-variant);
      background: var(--surface-container-high);
      color: var(--on-surface);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
      animation: toast-in 180ms ease-out;
    }
    .app-toast-info { border-left: 3px solid #38bdf8; }
    .app-toast-success { border-left: 3px solid #4ade80; }
    .app-toast-warning { border-left: 3px solid #f59e0b; }
    .app-toast-error { border-left: 3px solid #f87171; }
    .toast-message { letter-spacing: 0.08em; }
    @keyframes toast-in {
      from { transform: translateY(-4px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `]
})
export class AppComponent implements OnInit {
  auth = inject(AuthService);
  themeService = inject(ThemeService);
  notifications = inject(NotificationService);
  private router = inject(Router);

  searchTerm = '';
  notificationsOpen = false;

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.auth.fetchProfile().subscribe({ error: () => {} });
    }
  }

  logout() {
    this.auth.logout();
  }

  dismissToast(id: number): void {
    this.notifications.dismiss(id);
  }

  toggleNotifications(event: MouseEvent): void {
    event.stopPropagation();
    this.notificationsOpen = !this.notificationsOpen;
  }

  clearNotifications(): void {
    this.notifications.clear();
    this.notificationsOpen = false;
  }

  onNotificationPanelClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  @HostListener('document:click')
  closeNotificationsOnOutsideClick(): void {
    this.notificationsOpen = false;
  }

  onSearch() {
    if (!this.searchTerm.trim()) return;

    const SESSION_KEY = 'bl_breach_filters';
    const saved = sessionStorage.getItem(SESSION_KEY);
    let filters = {
      page: 1,
      limit: 12,
      search: this.searchTerm,
      severity: '',
      status: '',
      industry: '',
      sort_by: 'created_at',
      order: 'desc',
    };

    if (saved) {
      try {
        filters = { ...JSON.parse(saved), search: this.searchTerm, page: 1 };
      } catch (e) {}
    }

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(filters));

    const term = this.searchTerm;
    this.searchTerm = '';

    this.router.navigate(['/breaches'], { queryParams: { q: term, t: Date.now() } });
  }

  showAppChrome(): boolean {
    const route = this.router.url.split('?')[0];
    return !route.startsWith('/auth/login') && !route.startsWith('/auth/register') && !route.startsWith('/auth/reset-password');
  }
}
