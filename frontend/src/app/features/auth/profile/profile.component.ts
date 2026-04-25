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
      <!-- Profile Header -->
      <div class="glass-panel p-4 mb-4 shadow-lg d-flex justify-content-between align-items-center border-0">
        <div>
          <h2 class="font-headline fw-extrabold text-on-surface tracking-tight page-title mb-1">Operator Profile</h2>
          <p class="page-subtitle mb-0 opacity-75">Identity and Clearance Parameters</p>
        </div>
        <button class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-2 px-3 shadow-sm" (click)="auth.logout()">
          <span class="material-symbols-outlined fs-6 me-1">power_settings_new</span> Terminate Session
        </button>
      </div>

      <div class="row g-4 mb-4">
        <div class="col-md-4">
          <div class="glass-panel p-4 border-0 border-start border-primary border-4 shadow-lg h-100">
            <div class="text-xs-caps text-on-surface-variant mb-2" style="font-size: 8px;">Clearance Level</div>
            <div class="fs-2 fw-bold text-on-surface font-headline mb-1">{{ clearanceLabel }}</div>
            <div class="text-xs-caps" [ngClass]="roleToneClass()">{{ roleLabel }} ACCESS GRANTED</div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="glass-panel p-4 border-0 border-start border-secondary border-4 shadow-lg h-100">
            <div class="text-xs-caps text-on-surface-variant mb-2" style="font-size: 8px;">Last Active</div>
            <div class="fs-4 fw-bold text-on-surface font-headline">{{ user?.last_login ? (user?.last_login | date:'MMM dd, yyyy HH:mm') : 'NO LOGIN RECORDED' }}</div>
            <div class="text-xs-caps text-on-surface-variant mt-2">SESSION TELEMETRY ACTIVE</div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="glass-panel p-4 border-0 border-start border-success border-4 shadow-lg h-100">
            <div class="text-xs-caps text-on-surface-variant mb-2" style="font-size: 8px;">Operational Status</div>
            <div class="d-flex align-items-center gap-2 fs-4 fw-bold text-success font-headline">
              <span class="status-dot"></span>
              ONLINE
            </div>
            <div class="text-xs-caps text-on-surface-variant mt-2">MEMBER SINCE {{ user?.created_at | date:'MMM yyyy' | uppercase }}</div>
          </div>
        </div>
      </div>

      <div class="row g-4">
        <div class="col-lg-4">
          <div class="glass-panel border-0 shadow-lg profile-identity-card position-relative overflow-hidden h-100">
            <div class="position-absolute inset-0 profile-grid-overlay"></div>
            <div class="card-body p-4 p-xl-5 text-center position-relative z-1">
              <div class="identity-orb mx-auto mb-4">
                <span class="identity-initial">{{ initials }}</span>
              </div>

              <h2 class="font-headline fw-extrabold text-on-surface mb-1 fs-3">{{ user?.username || 'UNKNOWN USER' }}</h2>
              <p class="text-on-surface-variant mb-4 small opacity-75">{{ user?.email || 'NO EMAIL AVAILABLE' }}</p>

              <span class="badge py-2 px-4 glass-panel border border-outline-variant border-opacity-25 text-xs-caps mb-4 shadow-sm" [ngClass]="roleToneClass()">
                {{ roleLabel }}
              </span>

              <div class="mt-2 text-xs-caps text-on-surface-variant" style="font-size: 8px;">
                IDENTITY VERIFIED // AES-256 ENCRYPTED
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-8">
          <div class="glass-panel shadow-lg overflow-hidden h-100">
            <div class="p-3 border-bottom border-outline-variant border-opacity-10 d-flex justify-content-between align-items-center bg-surface-container-low">
              <span class="text-xs-caps text-on-surface fw-bold">Operator Information</span>
              <span class="text-xs-caps text-on-surface-variant" style="font-size: 8px;">USER ID: {{ (user?._id ?? '0x000').slice(-8) | uppercase }}</span>
            </div>

            <div class="card-body p-4 p-xl-5">
              <div class="row g-4">
                <div class="col-md-6">
                  <div class="p-3 border-start border-primary border-opacity-25 bg-surface-container-high rounded-end shadow-sm">
                    <div class="text-xs-caps text-on-surface-variant mb-1" style="font-size: 8px;">Unique Identifier</div>
                    <div class="text-on-surface font-mono small profile-value">{{ user?._id || 'N/A' }}</div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="p-3 border-start border-primary border-opacity-25 bg-surface-container-high rounded-end shadow-sm">
                    <div class="text-xs-caps text-on-surface-variant mb-1" style="font-size: 8px;">System Role</div>
                    <div class="text-on-surface fw-bold text-uppercase">{{ user?.role || 'guest' }}</div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="p-3 border-start border-primary border-opacity-25 bg-surface-container-high rounded-end shadow-sm">
                    <div class="text-xs-caps text-on-surface-variant mb-1" style="font-size: 8px;">Email Address</div>
                    <div class="text-on-surface font-mono small profile-value">{{ user?.email || 'N/A' }}</div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="p-3 border-start border-primary border-opacity-25 bg-surface-container-high rounded-end shadow-sm">
                    <div class="text-xs-caps text-on-surface-variant mb-1" style="font-size: 8px;">Initialization Date</div>
                    <div class="text-on-surface font-mono small">{{ user?.created_at | date:'yyyy-MM-dd HH:mm:ss' }}</div>
                  </div>
                </div>
              </div>

              <div class="mt-5">
                <h4 class="text-xs-caps text-on-surface mb-3">System Access Points</h4>
                <div class="d-flex flex-wrap gap-3">
                  <a routerLink="/breaches" class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-2 px-4 shadow-sm flex-grow-1">
                    <span class="material-symbols-outlined fs-6 me-2">history</span>
                    Investigation Logs
                  </a>
                  <a routerLink="/" class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-2 px-4 shadow-sm flex-grow-1">
                    <span class="material-symbols-outlined fs-6 me-2">dashboard</span>
                    Dashboard
                  </a>
                  @if (auth.isAdmin()) {
                    <a routerLink="/admin" class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-2 px-4 shadow-sm flex-grow-1">
                      <span class="material-symbols-outlined fs-6 me-2">admin_panel_settings</span>
                      Command Center
                    </a>
                  }
                </div>
              </div>
            </div>

            <div class="bg-surface-container-low px-4 py-3 border-top border-outline-variant border-opacity-10 mt-auto">
              <div class="d-flex justify-content-between align-items-center opacity-75 flex-wrap gap-2">
                <span class="text-xs-caps" style="font-size: 8px;">PROTOCOL: AES-256-GCM</span>
                <span class="text-xs-caps text-success" style="font-size: 8px;">SECURE CONNECTION ESTABLISHED</span>
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

    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--success);
      box-shadow: 0 0 12px color-mix(in srgb, var(--success) 65%, transparent);
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    .profile-identity-card { min-height: 100%; }
    .profile-grid-overlay {
      opacity: 0.04;
      background-image: linear-gradient(var(--on-surface) 1px, transparent 1px), linear-gradient(90deg, var(--on-surface) 1px, transparent 1px);
      background-size: 32px 32px;
      pointer-events: none;
    }

    .identity-orb {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      border: 2px solid color-mix(in srgb, var(--primary) 25%, transparent);
      background: radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--primary) 15%, transparent), transparent);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 40px color-mix(in srgb, var(--primary) 10%, transparent);
      position: relative;
    }

    .identity-initial {
      font-family: var(--font-headline);
      font-size: 3.5rem;
      font-weight: 800;
      color: var(--primary);
      text-transform: uppercase;
      line-height: 1;
      text-shadow: 0 0 15px color-mix(in srgb, var(--primary) 40%, transparent);
    }

    .profile-value {
      word-break: break-word;
    }

    .role-admin { color: var(--error) !important; border-color: var(--error) !important; }
    .role-analyst { color: var(--primary) !important; border-color: var(--primary) !important; }
    .role-guest { color: var(--on-surface-variant) !important; border-color: var(--on-surface-variant) !important; }

    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
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
