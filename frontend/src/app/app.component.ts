import { Component, HostListener, OnInit, inject, signal, effect } from '@angular/core';
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
        <aside class="sidebar glass-panel shadow-lg">
          <div class="sidebar-header p-4 d-md-flex d-none align-items-center justify-content-center" style="position: relative;">
            <a class="brand-lockup text-decoration-none nav-item" routerLink="/" aria-label="BreachLens home" style="width: auto; height: auto; margin: 0;">
              <span class="brand-logo" aria-hidden="true">
                <span class="brand-chip brand-chip-a">
                  <span class="material-symbols-outlined brand-chip-icon">security</span>
                </span>
                <span class="brand-chip brand-chip-b">
                  <span class="material-symbols-outlined brand-chip-icon">visibility</span>
                </span>
              </span>
              <span class="brand-wordmark fs-5 fw-bold text-primary font-headline">BreachLens</span>
              <span class="nav-tooltip" style="left: 65px; top: 50%; transform: translateY(-50%) translateX(-10px);">BreachLens</span>
            </a>
          </div>

          <nav class="flex-grow-1 mt-md-2 d-flex flex-md-column align-items-center" style="overflow: visible;">
            <a class="nav-item" routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
              <span class="material-symbols-outlined">home</span>
              <span class="nav-tooltip">DASHBOARD</span>
            </a>
            <a class="nav-item" routerLink="/breaches" routerLinkActive="active">
              <span class="material-symbols-outlined">description</span>
              <span class="nav-tooltip">BREACHES</span>
            </a>
            <a class="nav-item" routerLink="/map" routerLinkActive="active">
              <span class="material-symbols-outlined">manage_search</span>
              <span class="nav-tooltip">PWNED CHECK</span>
            </a>
            @if (auth.isAnalyst()) {
              <a class="nav-item" routerLink="/analytics" routerLinkActive="active">
                <span class="material-symbols-outlined">monitoring</span>
                <span class="nav-tooltip">ANALYTICS</span>
              </a>
            }
            @if (auth.isAdmin()) {
              <a class="nav-item" routerLink="/admin" routerLinkActive="active">
                <span class="material-symbols-outlined">terminal</span>
                <span class="nav-tooltip">ADMIN PANEL</span>
              </a>
            }
          </nav>

          <div class="sidebar-footer p-3 border-top border-outline-variant border-opacity-10 d-md-flex d-none flex-column align-items-center" style="overflow: visible;">
            <div class="nav-item position-relative" (click)="toggleHistory()">
              <span class="material-symbols-outlined" [class.text-primary]="showHistory()">notifications</span>
              @if (notifications.unreadCount() > 0) {
                <span class="position-absolute top-0 start-100 translate-middle-x badge rounded-pill bg-primary" style="font-size: 6px; padding: 2px 4px;">
                  {{ notifications.unreadCount() }}
                </span>
              }
              <span class="nav-tooltip">SECURITY FEED</span>
            </div>

            <div class="nav-item" (click)="themeService.toggleTheme()">
              <span class="material-symbols-outlined">
                {{ themeService.theme() === 'dark' ? 'light_mode' : 'dark_mode' }}
              </span>
              <span class="nav-tooltip">THEME</span>
            </div>

            <div class="dropdown">
              <div class="nav-item" data-bs-toggle="dropdown">
                <span class="material-symbols-outlined">person</span>
                <span class="nav-tooltip">{{ auth.isAuthenticated() ? 'PROFILE' : 'ACCOUNT' }}</span>
              </div>
              <ul class="dropdown-menu glass-panel border-outline-variant shadow-lg" style="z-index: 4000;">
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

      <!-- SECURITY FEED SIDE PANEL -->
      <div class="security-feed-overlay" [class.active]="showHistory()" (click)="closeHistory()"></div>
      <aside class="security-feed-panel glass-panel shadow-lg" [class.active]="showHistory()">
        <div class="p-4 border-bottom border-outline-variant border-opacity-10 d-flex justify-content-between align-items-center" style="height: 80px;">
          <div class="d-flex flex-column justify-content-center">
            <h3 class="text-xs-caps text-primary mb-1" style="font-size: 8px; line-height: 1;">SECURITY FEED</h3>
            <div class="text-on-surface-variant" style="font-size: 7px; line-height: 1;">SESSION LOGS</div>
          </div>
          <div class="d-flex gap-3 align-items-center">
            <button class="btn btn-ghost p-1 text-on-surface-variant d-flex align-items-center justify-content-center" (click)="notifications.clearHistory()" title="Clear Logs">
              <span class="material-symbols-outlined" style="font-size: 18px;">delete_sweep</span>
            </button>
            <button class="btn-close-tactical" (click)="closeHistory()">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <div class="feed-content custom-scrollbar p-3">
          @if (notifications.history().length === 0) {
            <div class="text-center py-5 opacity-50">
              <span class="material-symbols-outlined fs-1 mb-2">history</span>
              <p class="text-xs-caps" style="font-size: 7px;">No recent activity</p>
            </div>
          } @else {
            @for (log of notifications.history(); track log.id) {
              <div class="feed-item mb-2" [ngClass]="'app-toast-' + log.level">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <span class="toast-message" style="font-size: 7px; color: inherit;">
                    {{ log.level | uppercase }}
                  </span>
                  <span class="opacity-50" style="font-size: 6px;">{{ log.timestamp | date:'HH:mm:ss' }}</span>
                </div>
                <p class="mb-0 opacity-90" style="font-size: 8px; line-height: 1.4; color: inherit;">{{ log.message }}</p>
              </div>
            }
          }
        </div>

        <div class="p-3 border-top border-outline-variant border-opacity-10 bg-surface-container-low">
          <div class="d-flex align-items-center justify-content-between opacity-50">
            <span class="text-xs-caps" style="font-size: 6px;">SYSTEM STATUS</span>
            <span class="text-xs-caps text-success" style="font-size: 6px;">ENCRYPTED</span>
          </div>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="main-content custom-scrollbar">
        <div class="content-inner">
          <router-outlet />
        </div>
      </main>

      <!-- GLOBAL SESSION EXPIRY MODAL -->
      @if (auth.showSessionModal()) {
        <div class="session-modal-backdrop animate__animated animate__fadeIn">
          <div class="glass-panel p-5 shadow-lg session-modal-card border-0 border-top border-warning border-4 animate__animated animate__zoomIn">
             <div class="identity-orb-lg mx-auto mb-4">
                <span class="material-symbols-outlined text-warning" style="font-size: 3rem;">history</span>
             </div>
             <h2 class="font-headline fw-extrabold text-on-surface mb-3 fs-3">SESSION ENDED</h2>
             <p class="text-on-surface-variant mb-5 mx-auto" style="max-width: 320px; line-height: 1.6;">
               Your login session has ended. To keep your account safe, we've logged you out. Please sign in again to continue.
             </p>

             <div class="mb-4 text-xs-caps text-on-surface-variant opacity-75 fw-bold" style="font-size: 7px;">
               SENDING TO LOGIN PAGE IN {{ modalCountdown() }} SECONDS
             </div>

             <div class="d-flex flex-column gap-2">
                <a routerLink="/auth/login" (click)="auth.showSessionModal.set(false)" class="btn btn-primary w-100 py-3 text-xs-caps fw-bold shadow-sm" style="font-size: 9px;">
                   LOGIN AGAIN
                </a>
                <button (click)="auth.showSessionModal.set(false)" class="btn btn-dark w-100 border-0 text-xs-caps py-2 opacity-50 fw-bold" style="font-size: 8px;">
                   DISMISS
                </button>
             </div>
          </div>
        </div>
      }
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

    .session-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .session-modal-card {
      max-width: 440px;
      width: 100%;
      position: relative;
      overflow: hidden;
    }

    .identity-orb-lg {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--warning) 15%, transparent), transparent);
      border: 1px solid color-mix(in srgb, var(--warning) 20%, transparent);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 30px color-mix(in srgb, var(--warning) 10%, transparent);
    }

    .security-feed-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(4px);
      z-index: 3500;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }
    .security-feed-overlay.active {
      opacity: 1;
      pointer-events: auto;
    }

    .security-feed-panel {
      position: fixed;
      top: 1rem;
      right: 1rem;
      bottom: 1rem;
      width: 320px;
      z-index: 4000;
      display: flex;
      flex-direction: column;
      transform: translateX(calc(100% + 2rem));
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      border: 1px solid var(--outline-variant) !important;
      border-radius: 1rem;
      overflow: hidden;
    }
    .security-feed-panel.active {
      transform: translateX(0);
    }

    .feed-content {
      flex-grow: 1;
      overflow-y: auto;
    }
    .feed-item {
      border: 1px solid transparent;
      border-radius: 50px;
      padding: 0.75rem 1.25rem !important;
      transition: transform 0.2s, opacity 0.2s;
    }
    .feed-item:hover {
      transform: translateX(-4px);
    }

    /* Notifications Stack */
    .toast-stack {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      pointer-events: none;
    }
    .app-toast {
      pointer-events: auto;
      min-width: 300px;
      padding: 0.75rem 1.5rem;
      border-radius: 50px;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      animation: toastIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      transition: all 0.3s ease;
    }

    .app-toast-success {
      background: color-mix(in srgb, #22c55e 15%, var(--surface));
      border-color: color-mix(in srgb, #22c55e 30%, transparent);
      color: color-mix(in srgb, #22c55e 85%, var(--on-surface));
    }
    .app-toast-error {
      background: color-mix(in srgb, #ef4444 15%, var(--surface));
      border-color: color-mix(in srgb, #ef4444 30%, transparent);
      color: color-mix(in srgb, #ef4444 85%, var(--on-surface));
    }
    .app-toast-warning {
      background: color-mix(in srgb, #f59e0b 15%, var(--surface));
      border-color: color-mix(in srgb, #f59e0b 30%, transparent);
      color: color-mix(in srgb, #f59e0b 85%, var(--on-surface));
    }
    .app-toast-info {
      background: color-mix(in srgb, var(--primary) 15%, var(--surface));
      border-color: color-mix(in srgb, var(--primary) 30%, transparent);
      color: color-mix(in srgb, var(--primary) 85%, var(--on-surface));
    }

    .toast-message {
      font-weight: 700;
      letter-spacing: 0.03em;
      font-size: 8px;
      color: inherit;
    }

    @keyframes toastIn {
      from { transform: translateX(100%) scale(0.9); opacity: 0; }
      to { transform: translateX(0) scale(1); opacity: 1; }
    }
  `]
})
export class AppComponent implements OnInit {
  auth = inject(AuthService);
  themeService = inject(ThemeService);
  notifications = inject(NotificationService);
  private router = inject(Router);

  searchTerm = '';
  modalCountdown = signal(60);
  showHistory = signal(false);
  private countdownInterval: any;

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.auth.fetchProfile().subscribe({ error: () => {} });
    }

    // Effect to start countdown when modal shows
    effect(() => {
      if (this.auth.showSessionModal()) {
        this.startModalCountdown();
      } else {
        this.stopModalCountdown();
      }
    });
  }

  toggleHistory(): void {
    const newState = !this.showHistory();
    this.showHistory.set(newState);
    this.notifications.isReading.set(newState);
    if (newState) {
      this.notifications.markHistoryAsRead();
    }
  }

  closeHistory(): void {
    this.showHistory.set(false);
    this.notifications.isReading.set(false);
  }

  private startModalCountdown() {
    this.modalCountdown.set(60);
    this.countdownInterval = setInterval(() => {
      this.modalCountdown.update(v => v - 1);
      if (this.modalCountdown() <= 0) {
        this.auth.showSessionModal.set(false);
        this.router.navigate(['/auth/login']);
        this.stopModalCountdown();
      }
    }, 1000);
  }

  private stopModalCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
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
