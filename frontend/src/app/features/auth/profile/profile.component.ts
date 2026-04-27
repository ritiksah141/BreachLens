import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass, DatePipe, UpperCasePipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, NgClass, DatePipe, UpperCasePipe, CommonModule, FormsModule],
  template: `
    <div class="profile-shell mt-2">
      <!-- Profile Header -->
      <div class="glass-panel p-4 mb-4 shadow-lg d-flex justify-content-between align-items-center border-0">
        <div>
          <h2 class="font-headline fw-extrabold text-on-surface tracking-tight page-title mb-1">Operator Profile</h2>
          <p class="page-subtitle mb-0 opacity-75">Identity and Clearance Parameters</p>
        </div>
        <button class="btn btn-error text-white text-xs-caps py-2 px-3 shadow-sm fw-bold" style="background-color: var(--error);" (click)="auth.logout()">
          <span class="material-symbols-outlined fs-6 me-1">power_settings_new</span>  Logout
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
          <div class="glass-panel border-0 shadow-lg profile-identity-card position-relative overflow-hidden h-100 d-flex flex-column">
            <div class="position-absolute inset-0 profile-grid-overlay"></div>

            <!-- User Identity Info -->
            <div class="card-body p-4 p-xl-5 text-center position-relative z-1 flex-grow-0">
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

            <!-- Integrated SECURITY SETTINGS -->
            <div class="mt-auto p-4 bg-surface-container-low border-top border-error border-4 position-relative z-1">
               <div class="d-flex align-items-center gap-2 mb-4">
                  <span class="material-symbols-outlined text-error fs-5">security</span>
                  <h5 class="text-xs-caps text-error fw-bold mb-0">SECURITY PROTOCOLS</h5>
               </div>
               <form (ngSubmit)="updatePassword()">
                  <div class="mb-3">
                     <label class="text-xs-caps text-on-surface-variant mb-2 d-block" style="font-size: 7px;">CURRENT PASSWORD</label>
                     <input type="password" name="currentPassword" [(ngModel)]="currentPassword" class="form-control bg-surface-container-high border-0 text-on-surface text-xs-caps" style="font-size: 10px;" placeholder="VERIFY IDENTITY">
                  </div>
                  <div class="mb-3">
                     <label class="text-xs-caps text-on-surface-variant mb-2 d-block" style="font-size: 7px;">NEW OPERATOR PASSWORD</label>
                     <input type="password" name="newPassword" [(ngModel)]="newPassword" class="form-control bg-surface-container-high border-0 text-on-surface text-xs-caps" style="font-size: 10px;" placeholder="8+ CHARS, UPPER, DIGIT">
                  </div>
                  <div class="mb-4">
                     <label class="text-xs-caps text-on-surface-variant mb-2 d-block" style="font-size: 7px;">CONFIRM NEW PASSWORD</label>
                     <input type="password" name="confirmPassword" [(ngModel)]="confirmPassword" class="form-control bg-surface-container-high border-0 text-on-surface text-xs-caps" style="font-size: 10px;" placeholder="REPEAT PASSWORD">
                  </div>
                  <button type="submit" class="btn btn-error w-100 py-2 text-xs-caps fw-bold text-white shadow-sm" style="background-color: var(--error);" [disabled]="loading || !newPassword || !currentPassword">
                     ROTATE CREDENTIALS
                  </button>
               </form>
            </div>
          </div>
        </div>

        <div class="col-lg-8">
          <div class="glass-panel shadow-lg h-100 d-flex flex-column border-0">
            <div class="p-3 border-bottom border-outline-variant border-opacity-10 d-flex justify-content-between align-items-center bg-surface-container-low">
              <div class="d-flex align-items-center gap-2">
                 <span class="material-symbols-outlined text-primary fs-5">fingerprint</span>
                 <span class="text-xs-caps text-on-surface fw-bold">OPERATIONAL PARAMETERS</span>
              </div>
              <span class="text-xs-caps text-on-surface-variant font-mono" style="font-size: 8px;">REF: {{ (user?._id ?? '0x000').slice(-12) | uppercase }}</span>
            </div>

            <div class="card-body p-4 p-xl-5">
              <div class="row g-4">
                <!-- Identifier -->
                <div class="col-md-6">
                  <div class="tactical-info-card p-3 rounded-3 border border-outline-variant border-opacity-10 bg-surface-container-high h-100">
                    <div class="text-xs-caps text-primary mb-2" style="font-size: 8px;">UNIQUE IDENTIFIER</div>
                    <div class="text-on-surface font-mono small text-break">{{ user?._id || 'N/A' }}</div>
                    <div class="mt-2 pt-2 border-top border-outline-variant border-opacity-5 text-xs-caps opacity-50" style="font-size: 7px;">SYSTEM_GUID_VERIFIED</div>
                  </div>
                </div>
                <!-- Role -->
                <div class="col-md-6">
                  <div class="tactical-info-card p-3 rounded-3 border border-outline-variant border-opacity-10 bg-surface-container-high h-100">
                    <div class="text-xs-caps text-primary mb-2" style="font-size: 8px;">SECURITY CLEARANCE</div>
                    <div class="d-flex align-items-center gap-2">
                       <span class="material-symbols-outlined fs-5" [ngClass]="roleToneClass()">{{ user?.role === 'admin' ? 'admin_panel_settings' : 'verified_user' }}</span>
                       <div class="text-on-surface fw-bold font-headline fs-5">{{ user?.role?.toUpperCase() || 'GUEST' }}</div>
                    </div>
                    <div class="mt-2 pt-2 border-top border-outline-variant border-opacity-5 text-xs-caps opacity-50" style="font-size: 7px;">AUTHORIZATION_LEVEL: {{ clearanceLabel }}</div>
                  </div>
                </div>
                <!-- Email -->
                <div class="col-md-6">
                  <div class="tactical-info-card p-3 rounded-3 border border-outline-variant border-opacity-10 bg-surface-container-high h-100">
                    <div class="text-xs-caps text-primary mb-2" style="font-size: 8px;">COMMUNICATION CHANNEL</div>
                    <div class="text-on-surface font-mono small d-flex align-items-center gap-2">
                       <span class="material-symbols-outlined fs-6 opacity-50">alternate_email</span>
                       {{ user?.email || 'N/A' }}
                    </div>
                    <div class="mt-2 pt-2 border-top border-outline-variant border-opacity-5 text-xs-caps opacity-50" style="font-size: 7px;">ENCRYPTED_SMTP_ACTIVE</div>
                  </div>
                </div>
                <!-- Init Date -->
                <div class="col-md-6">
                  <div class="tactical-info-card p-3 rounded-3 border border-outline-variant border-opacity-10 bg-surface-container-high h-100">
                    <div class="text-xs-caps text-primary mb-2" style="font-size: 8px;">INITIALIZATION DATE</div>
                    <div class="text-on-surface font-mono small">{{ user?.created_at | date:'yyyy-MM-dd HH:mm:ss' }}</div>
                    <div class="mt-2 pt-2 border-top border-outline-variant border-opacity-5 text-xs-caps opacity-50" style="font-size: 7px;">EPOCH_LOG_REGISTERED</div>
                  </div>
                </div>
              </div>

              <div class="mt-5">
                <h4 class="text-xs-caps text-on-surface mb-3 d-flex align-items-center gap-2">
                   <span class="material-symbols-outlined fs-5">shortcut</span>
                   SYSTEM ACCESS NODES
                </h4>
                <div class="row g-3">
                  <div class="col-sm-4">
                    <a routerLink="/breaches" class="btn btn-dark w-100 bg-surface-container-highest border-0 text-xs-caps py-3 shadow-sm d-flex flex-column align-items-center gap-2 card-interactive">
                      <span class="material-symbols-outlined fs-4">history</span>
                      <span>Investigation Logs</span>
                    </a>
                  </div>
                  <div class="col-sm-4">
                    <a routerLink="/" class="btn btn-dark w-100 bg-surface-container-highest border-0 text-xs-caps py-3 shadow-sm d-flex flex-column align-items-center gap-2 card-interactive">
                      <span class="material-symbols-outlined fs-4">dashboard</span>
                      <span>Analytics Dashboard</span>
                    </a>
                  </div>
                  @if (auth.isAdmin()) {
                    <div class="col-sm-4">
                      <a routerLink="/admin" class="btn btn-dark w-100 bg-surface-container-highest border-0 text-xs-caps py-3 shadow-sm d-flex flex-column align-items-center gap-2 card-interactive border-start border-primary border-2">
                        <span class="material-symbols-outlined fs-4 text-primary">admin_panel_settings</span>
                        <span>Command Center</span>
                      </a>
                    </div>
                  }
                </div>
              </div>
            </div>

            <div class="bg-surface-container-low px-4 py-3 border-top border-outline-variant border-opacity-10 mt-auto">
              <div class="d-flex justify-content-between align-items-center opacity-75 flex-wrap gap-2">
                <div class="d-flex align-items-center gap-2">
                   <span class="material-symbols-outlined fs-6 text-success animate-pulse">check_circle</span>
                   <span class="text-xs-caps text-success" style="font-size: 8px;">ENCRYPTION STATUS: AES-256-GCM ACTIVE</span>
                </div>
                <span class="text-xs-caps font-mono" style="font-size: 8px;">INTEGRITY HASH: {{ (user?._id ?? 'SHA').slice(0, 16) | uppercase }}</span>
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
  private userService = inject(UserService);
  private notifications = inject(NotificationService);

  newPassword = '';
  confirmPassword = '';
  currentPassword = '';
  loading = false;

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

  updatePassword(): void {
    if (!this.newPassword || !this.currentPassword) return;
    if (this.newPassword === this.currentPassword) {
      this.notifications.show('NEW PASSWORD MUST BE DIFFERENT', 'warning');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.notifications.show('PASSWORDS DO NOT MATCH', 'error');
      return;
    }

    const reg = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!reg.test(this.newPassword)) {
      this.notifications.show('PASSWORD COMPLEXITY REQUIREMENTS NOT MET', 'error');
      return;
    }

    this.loading = true;
    this.userService.updateUser(this.user!._id, {
      password: this.newPassword,
      current_password: this.currentPassword
    }).subscribe({
      next: () => {
        this.notifications.show('OPERATOR CREDENTIALS ROTATED SUCCESSFULLY', 'success');
        this.newPassword = '';
        this.confirmPassword = '';
        this.currentPassword = '';
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        const msg = err?.error?.message ?? 'SECURITY UPDATE FAILED';
        this.notifications.show(msg, 'error');
      }
    });
  }
}
