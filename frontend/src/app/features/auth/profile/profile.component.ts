import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass, DatePipe, UpperCasePipe, CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, NgClass, DatePipe, UpperCasePipe, CommonModule],
  template: `
    <div class="profile-shell mt-2">
      <div class="row g-4 mb-4">
        <div class="col-md-4">
          <div class="card p-4 border-0 border-start border-primary border-3 h-100 glow-primary">
            <div class="text-xs-caps text-on-surface-variant mb-2">Clearance</div>
            <div class="fs-2 fw-bold text-on-surface font-headline mb-1">{{ clearanceLabel }}</div>
            <div class="text-xs-caps" [ngClass]="roleToneClass()">{{ roleLabel }} access granted</div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card p-4 border-0 border-start border-secondary border-3 h-100">
            <div class="text-xs-caps text-on-surface-variant mb-2">Last activity</div>
            <div class="fs-5 fw-bold text-on-surface font-headline">{{ user?.last_login ? (user?.last_login | date:'MMM dd, yyyy HH:mm') : 'No login recorded' }}</div>
            <div class="text-xs-caps text-on-surface-variant mt-2">Session telemetry</div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card p-4 border-0 border-start border-tertiary border-3 h-100 glow-error">
            <div class="text-xs-caps text-on-surface-variant mb-2">Status</div>
            <div class="d-flex align-items-center gap-2 fs-6 fw-bold text-success">
              <span class="status-dot"></span>
              Online
            </div>
            <div class="text-xs-caps text-on-surface-variant mt-2">Member since {{ user?.created_at | date:'MMM yyyy' }}</div>
          </div>
        </div>
      </div>

      <div class="row g-4">
        <div class="col-lg-4">
          <div class="card border-0 shadow-lg profile-identity-card position-relative overflow-hidden">
            <div class="position-absolute inset-0 profile-grid-overlay"></div>
            <div class="card-body p-4 p-xl-5 text-center position-relative z-1">
              <div class="identity-orb mx-auto mb-4">
                <span class="identity-initial">{{ initials }}</span>
              </div>

              <h2 class="font-headline fw-extrabold text-on-surface mb-1 fs-3">{{ user?.username || 'Unknown User' }}</h2>
              <p class="text-on-surface-variant mb-4 small">{{ user?.email || 'No email available' }}</p>

              <span class="badge py-2 px-4 glass-panel border border-outline-variant border-opacity-25 text-xs-caps mb-4" [ngClass]="roleToneClass()">
                {{ roleLabel }}
              </span>

              <div class="d-grid gap-2">
                <button class="btn btn-primary text-xs-caps py-2" (click)="auth.logout()">
                  <span class="material-symbols-outlined fs-6 me-2">power_settings_new</span>
                  Terminate session
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-8">
          <div class="card border-0 bg-surface-container-low shadow-lg overflow-hidden h-100">
            <div class="p-3 border-bottom border-outline-variant border-opacity-10 d-flex justify-content-between align-items-center bg-surface-container">
              <span class="text-xs-caps text-on-surface fw-bold">Operator telemetry data</span>
              <span class="text-xs-caps text-on-surface-variant" style="font-size: 8px;">Node ID: {{ (user?._id ?? '0x000').slice(-8) | uppercase }}</span>
            </div>

            <div class="card-body p-4 p-xl-5">
              <div class="row g-3">
                <div class="col-md-6">
                  <div class="glass-panel rounded-3 border border-outline-variant border-opacity-10 p-3 h-100">
                    <div class="text-xs-caps text-on-surface-variant mb-2">User ID</div>
                    <div class="text-on-surface font-mono small profile-value">{{ user?._id || 'N/A' }}</div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="glass-panel rounded-3 border border-outline-variant border-opacity-10 p-3 h-100">
                    <div class="text-xs-caps text-on-surface-variant mb-2">Role</div>
                    <div class="text-on-surface fw-bold text-capitalize">{{ user?.role || 'guest' }}</div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="glass-panel rounded-3 border border-outline-variant border-opacity-10 p-3 h-100">
                    <div class="text-xs-caps text-on-surface-variant mb-2">Email</div>
                    <div class="text-on-surface font-mono small profile-value">{{ user?.email || 'N/A' }}</div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="glass-panel rounded-3 border border-outline-variant border-opacity-10 p-3 h-100">
                    <div class="text-xs-caps text-on-surface-variant mb-2">Created</div>
                    <div class="text-on-surface font-mono small">{{ user?.created_at | date:'yyyy-MM-dd HH:mm:ss' }}</div>
                  </div>
                </div>
              </div>

              <div class="mt-5">
                <h4 class="text-xs-caps text-on-surface mb-3">Navigation shortcuts</h4>
                <div class="d-flex flex-wrap gap-3">
                  <a routerLink="/breaches" class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-2 px-4 shadow-sm flex-grow-1">
                    <span class="material-symbols-outlined fs-6 me-2">history</span>
                    Investigation logs
                  </a>
                  <a routerLink="/map" class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-2 px-4 shadow-sm flex-grow-1">
                    <span class="material-symbols-outlined fs-6 me-2">travel_explore</span>
                    Global map
                  </a>
                  @if (auth.isAdmin()) {
                    <a routerLink="/admin" class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-2 px-4 shadow-sm flex-grow-1">
                      <span class="material-symbols-outlined fs-6 me-2">admin_panel_settings</span>
                      Command terminal
                    </a>
                  }
                </div>
              </div>
            </div>

            <div class="bg-surface-container px-4 py-3 border-top border-outline-variant border-opacity-10">
              <div class="d-flex justify-content-between align-items-center opacity-75 flex-wrap gap-2">
                <span class="text-xs-caps" style="font-size: 8px;">Security protocol: AES-256-GCM</span>
                <span class="text-xs-caps" style="font-size: 8px;">Encryption status: nominal</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .text-xs-caps { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; }
    .profile-shell { padding-bottom: 5rem; }
    .glow-primary { box-shadow: 0 0 20px color-mix(in srgb, var(--primary) 15%, transparent); }
    .glow-error { box-shadow: 0 0 20px color-mix(in srgb, var(--error) 15%, transparent); }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--success);
      box-shadow: 0 0 12px color-mix(in srgb, var(--success) 65%, transparent);
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    .profile-identity-card { min-height: 100%; }
    .profile-grid-overlay {
      opacity: 0.06;
      background-image: linear-gradient(var(--on-surface) 1px, transparent 1px), linear-gradient(90deg, var(--on-surface) 1px, transparent 1px);
      background-size: 24px 24px;
      pointer-events: none;
    }

    .identity-orb {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      border: 1px solid color-mix(in srgb, var(--primary) 35%, transparent);
      background: radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--primary) 25%, transparent), color-mix(in srgb, var(--primary) 8%, transparent));
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 30px color-mix(in srgb, var(--primary) 18%, transparent);
    }

    .identity-initial {
      font-family: var(--font-headline);
      font-size: 3rem;
      font-weight: 800;
      color: var(--primary);
      text-transform: uppercase;
      line-height: 1;
    }

    .profile-value {
      word-break: break-word;
    }

    .role-admin { color: var(--error) !important; border-color: var(--error) !important; }
    .role-analyst { color: var(--primary) !important; border-color: var(--primary) !important; }
    .role-guest { color: var(--on-surface-variant) !important; border-color: var(--on-surface-variant) !important; }

    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
  `]
})
export class ProfileComponent implements OnInit {
  auth = inject(AuthService);

  get user() {
    return this.auth.currentUser();
  }

  get initials(): string {
    return (this.user?.username ?? '?').charAt(0).toUpperCase();
  }

  ngOnInit(): void {
    this.auth.fetchProfile().subscribe();
  }

  get roleLabel(): string {
    return (this.user?.role ?? 'guest').toUpperCase();
  }

  get clearanceLabel(): string {
    if (this.user?.role === 'admin') return 'Level 5';
    if (this.user?.role === 'analyst') return 'Level 3';
    return 'Level 1';
  }

  roleToneClass(): string {
    if (this.user?.role === 'admin') return 'role-admin';
    if (this.user?.role === 'analyst') return 'role-analyst';
    return 'role-guest';
  }
}
