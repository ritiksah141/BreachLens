import { Component, OnInit, inject } from '@angular/core';
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
    <header class="glass-panel position-sticky top-0 z-3 px-4 py-2 d-flex justify-content-between align-items-center shadow-lg border-bottom border-outline-variant" style="height: 64px;">
      <div class="d-flex align-items-center gap-4">
        <span class="fs-5 fw-bold tracking-tighter text-primary font-headline text-uppercase" style="cursor: pointer;" routerLink="/">BreachLens</span>
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
        <button class="btn btn-link p-2 text-on-surface-variant rounded-circle hover-bg-surface position-relative">
          <span class="material-symbols-outlined">notifications</span>
          <span class="position-absolute top-0 start-100 translate-middle p-1 bg-tertiary-container border border-outline-variant rounded-circle animate-pulse" style="margin-top: 10px; margin-left: -10px;"></span>
        </button>
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

    <div class="d-flex" style="height: calc(100vh - 104px);">
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

    <!-- Footer Ticker -->
    <footer class="bg-surface-container-lowest position-fixed bottom-0 start-0 w-100 z-3 border-top border-primary border-opacity-10 shadow-lg d-flex align-items-center px-4 overflow-hidden" style="height: 40px;">
      <div class="ticker-animation text-xs-caps text-tertiary-container fw-medium">
        <span>LIVE_THREAT_TICKER: 12.04.99.1 ACTIVE_EXPLOIT_DETECTED_IN_SECTOR_4</span>
        <span class="mx-4 text-primary opacity-50">||</span>
        <span>192.168.1.104_LATERAL_MOVEMENT_PREVENTED</span>
        <span class="mx-4 text-primary opacity-50">||</span>
        <span class="text-primary">SYSTEM_HEALTH_99.8%</span>
        <span class="mx-4 text-primary opacity-50">||</span>
        <span>ENCRYPTION_LAYER_REINFORCED</span>
        <span class="mx-4 text-primary opacity-50">||</span>
        <span>DDoS_ATTACK_MITIGATED_IN_ASIA_NORTH</span>
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
  `,
  styles: [`
    .tracking-tighter { letter-spacing: -0.05em; }
    .text-xs-caps { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; }
    .hover-bg-surface:hover { background-color: var(--surface-container-high); }
    .hover-text-on-surface:hover { color: var(--on-surface) !important; }
    .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
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
}
