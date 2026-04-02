import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <!-- Top Navigation Bar -->
    <header class="glass-panel position-sticky top-0 z-3 px-4 py-2 d-flex justify-content-between align-items-center shadow-lg border-bottom border-outline-variant" style="height: 64px;">
      <div class="d-flex align-items-center gap-4">
        <span class="fs-5 fw-bold tracking-tighter text-primary font-headline text-uppercase">BreachLens</span>
        <nav class="d-none d-md-flex gap-4">
          <a class="text-decoration-none font-headline fw-semibold text-xs-caps"
             routerLink="/" routerLinkActive="text-primary border-bottom border-primary border-2 pb-1" [routerLinkActiveOptions]="{exact:true}"
             style="color: var(--on-surface-variant); cursor: pointer;">Threat Lens</a>
          <a class="text-decoration-none font-headline fw-semibold text-xs-caps"
             routerLink="/breaches" routerLinkActive="text-primary border-bottom border-primary border-2 pb-1"
             style="color: var(--on-surface-variant); cursor: pointer;">Breach Log</a>
          <a class="text-decoration-none font-headline fw-semibold text-xs-caps"
             routerLink="/map" routerLinkActive="text-primary border-bottom border-primary border-2 pb-1"
             style="color: var(--on-surface-variant); cursor: pointer;">Network Grid</a>
        </nav>
      </div>

      <div class="d-flex align-items-center gap-3">
        <div class="position-relative d-none d-lg-block">
          <span class="material-symbols-outlined position-absolute start-0 top-50 translate-middle-y ms-3 text-on-surface-variant fs-6">search</span>
          <input class="form-control bg-surface-container border-0 text-xs-caps ps-5 py-2 rounded-3 text-on-surface"
                 placeholder="CMD + K TO SEARCH" style="width: 250px; font-size: 10px;">
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
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuADKMzaKZY09YwYPfMFUY8RTjbUbKhMp7MBCPAAdt6_PLD-Zs2tmllKia_BOeYNv3l5Rgl4J2uKVUWrCesqw6ViNJdDnKXcfbee0hURmbY-2zelI_nAf4Td__ZubYOYzbSnJk-iICUO0udh3hdjNb25IsJyCmZwtKs0JAlROegTntArHDXaJS6pIwNuzGQwADSorcNH6VrUzO8RjrIxdblhr_Ice6f_YjUZangyOdRdc3-sl6M8lAWaR7vqtAmFkN-HHRuQW4rvxHzf"
                 alt="Operator Profile" class="rounded-circle border border-primary border-opacity-25 object-fit-cover" style="width: 32px; height: 32px;">
          </button>
          <ul class="dropdown-menu dropdown-menu-end dropdown-menu-dark glass-panel border-outline-variant shadow-lg">
            @if (auth.isAuthenticated()) {
              <li><a class="dropdown-item text-xs-caps text-on-surface" routerLink="/auth/profile">Profile</a></li>
              @if (auth.isAnalyst()) {
                <li><a class="dropdown-item text-xs-caps text-on-surface" routerLink="/admin">Admin Control</a></li>
              }
              <li><hr class="dropdown-divider border-outline-variant"></li>
              <li><button class="dropdown-item text-xs-caps text-tertiary" (click)="logout()">Terminate Session</button></li>
            } @else {
              <li><a class="dropdown-item text-xs-caps text-on-surface" routerLink="/auth/login">Authorize</a></li>
              <li><a class="dropdown-item text-xs-caps text-on-surface" routerLink="/auth/register">Deploy Operator</a></li>
            }
          </ul>
        </div>
      </div>
    </header>

    <div class="d-flex" style="height: calc(100vh - 104px);">
      <!-- Sidebar Navigation -->
      <aside class="bg-surface-container-low d-none d-lg-flex flex-column h-100 border-end border-outline-variant shadow-lg" style="width: 260px;">
        <div class="p-4 flex-grow-1">
          <div class="d-flex align-items-center gap-3 mb-4">
            <div class="p-2 bg-primary-container bg-opacity-10 border border-primary border-opacity-25 rounded-3">
              <span class="material-symbols-outlined text-primary fs-4" style="font-variation-settings: 'FILL' 1;">shield</span>
            </div>
            <div>
              <div class="font-headline fw-bold text-on-surface fs-5 sidebar-node-text">{{ auth.currentUser()?.username || 'SYSTEM_CORE' }}</div>
              <div class="text-xs-caps text-on-surface-variant">{{ auth.currentUser()?.role || 'OFFLINE' }}_LOG</div>
            </div>
          </div>

          <nav class="nav flex-column gap-1">
            <a class="nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-2 text-xs-caps"
               routerLink="/" routerLinkActive="bg-surface-container text-primary border-start border-primary border-4 rounded-0" [routerLinkActiveOptions]="{exact:true}"
               style="color: var(--on-surface-variant); transition: all 0.2s;">
              <span class="material-symbols-outlined fs-6">dashboard</span>
              Overview
            </a>
            <a class="nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-2 text-xs-caps"
               routerLink="/breaches" routerLinkActive="bg-surface-container text-primary border-start border-primary border-4 rounded-0"
               style="color: var(--on-surface-variant); transition: all 0.2s;">
              <span class="material-symbols-outlined fs-6">security</span>
              Intrusions
            </a>
            <a class="nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-2 text-xs-caps"
               routerLink="/map" routerLinkActive="bg-surface-container text-primary border-start border-primary border-4 rounded-0"
               style="color: var(--on-surface-variant); transition: all 0.2s;">
              <span class="material-symbols-outlined fs-6">language</span>
              Network
            </a>
            @if (auth.isAnalyst()) {
              <a class="nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-2 text-xs-caps"
                 routerLink="/admin" routerLinkActive="bg-surface-container text-primary border-start border-primary border-4 rounded-0"
                 style="color: var(--on-surface-variant); transition: all 0.2s;">
                <span class="material-symbols-outlined fs-6">admin_panel_settings</span>
                Terminal
              </a>
            }
          </nav>
        </div>

        <div class="p-4 mt-auto border-top border-outline-variant border-opacity-10">
          <button class="btn btn-primary w-100 text-xs-caps mb-3 py-2">DEPLOY PATCH</button>
          <div class="d-flex flex-column gap-2">
            <a href="#" class="text-decoration-none text-on-surface-variant text-xs-caps hover-text-on-surface d-flex align-items-center gap-2">
              <span class="material-symbols-outlined fs-6">help</span> Support
            </a>
            <a href="#" class="text-decoration-none text-on-surface-variant text-xs-caps hover-text-on-surface d-flex align-items-center gap-2">
              <span class="material-symbols-outlined fs-6">description</span> Docs
            </a>
          </div>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="flex-grow-1 overflow-auto p-4 bg-surface custom-scrollbar">
        <div class="container-fluid max-width-1600">
          <router-outlet />
        </div>
      </main>
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
        <a href="#" class="text-decoration-none text-on-surface-variant text-xs-caps hover-text-on-surface">Global Map</a>
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
  `]
})
export class AppComponent {
  auth = inject(AuthService);
  themeService = inject(ThemeService);

  logout() {
    this.auth.logout();
  }
}
