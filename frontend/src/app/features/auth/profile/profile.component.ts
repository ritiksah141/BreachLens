import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass, DatePipe, UpperCasePipe, CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, NgClass, DatePipe, UpperCasePipe, CommonModule, FormsModule, DecimalPipe],
  template: `
    <div class="profile-shell mt-2 animate__animated animate__fadeIn">
      <!-- Profile Header -->
      <div class="glass-panel p-4 mb-4 shadow-lg d-flex justify-content-between align-items-center border-0">
        <div>
          <h2 class="font-headline fw-extrabold text-on-surface tracking-tight page-title mb-1">User Profile</h2>
          <p class="text-xs-caps mb-0 text-on-surface-variant opacity-75" style="font-size: 7px; letter-spacing: 0.1em;">Identity and account settings for your active session.</p>
        </div>
        <button class="btn btn-error text-white text-xs-caps py-2 px-3 shadow-sm fw-bold" style="background-color: var(--error); font-size: 8px;" (click)="auth.logout()">
          <span class="material-symbols-outlined fs-6 me-1">power_settings_new</span>  LOGOUT
        </button>
      </div>

      <div class="row g-4 mb-4">
        <div class="col-md-4">
          <div class="glass-panel p-4 border-0 border-start border-primary border-4 shadow-lg h-100">
            <div class="text-xs-caps text-on-surface-variant mb-2" style="font-size: 7px;">Access Level</div>
            <div class="fs-2 fw-bold text-on-surface font-headline mb-1">{{ clearanceLabel }}</div>
            <div class="text-xs-caps fw-bold" [ngClass]="roleToneClass()" style="font-size: 6px;">{{ roleLabel }} ACCESS</div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="glass-panel p-4 border-0 border-start border-secondary border-4 shadow-lg h-100">
            <div class="text-xs-caps text-on-surface-variant mb-2" style="font-size: 7px;">Recent Activity</div>
            <div class="fs-4 fw-bold text-on-surface font-headline">{{ user?.last_login ? (user?.last_login | date:'MMM dd || HH:mm') : 'FIRST LOGIN' }}</div>
            <div class="text-xs-caps text-on-surface-variant mt-2 fw-bold" style="font-size: 6px;">STAYING PROTECTED</div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="glass-panel p-4 border-0 border-start border-success border-4 shadow-lg h-100">
            <div class="text-xs-caps text-on-surface-variant mb-2" style="font-size: 7px;">Connection Status</div>
            <div class="d-flex align-items-center gap-2 fs-4 fw-bold text-success font-headline">
              <span class="status-dot"></span>
              ONLINE
            </div>
            <div class="text-xs-caps text-on-surface-variant mt-2 fw-bold" style="font-size: 6px;">MEMBER SINCE {{ user?.created_at | date:'MMM yyyy' | uppercase }}</div>
          </div>
        </div>
      </div>

      <div class="row g-4">
        <!-- IDENTITY COLUMN -->
        <div class="col-lg-4">
          <div class="glass-panel border-0 shadow-lg profile-identity-card position-relative overflow-hidden h-100 d-flex flex-column">
            <div class="position-absolute inset-0 profile-grid-overlay"></div>
            <div class="card-body p-4 p-xl-5 text-center position-relative z-1">
              <div class="identity-orb mx-auto mb-4">
                <span class="material-symbols-outlined" style="font-size: 3.5rem; color: var(--primary); text-shadow: 0 0 15px color-mix(in srgb, var(--primary) 40%, transparent);">person</span>
              </div>
              <h2 class="font-headline fw-extrabold text-on-surface mb-4 fs-3">{{ user?.username || 'GUEST' }}</h2>
              <span class="badge py-2 px-4 glass-panel border border-outline-variant border-opacity-25 text-xs-caps mb-4 shadow-sm fw-bold" [ngClass]="roleToneClass()">
                {{ roleLabel }}
              </span>
              <div class="mt-2 text-xs-caps text-on-surface-variant fw-bold" style="font-size: 7px;">
                SECURE IDENTITY // VERIFIED
              </div>
            </div>
          </div>
        </div>

        <!-- PARAMETERS COLUMN (Boxy Glass Grid) -->
        <div class="col-lg-8">
          <div class="h-100 d-flex flex-column gap-4">
            <div class="row g-4 flex-grow-1">
               <div class="col-md-6">
                  <div class="glass-panel p-4 shadow-lg border-0 h-100 transition-all hover-glow">
                     <div class="text-xs-caps text-primary mb-3 fw-bold" style="font-size: 7px;">ACCOUNT ID</div>
                     <div class="text-on-surface font-mono small text-break fw-bold">{{ user?._id || 'N/A' }}</div>
                     <div class="mt-2 text-xs-caps opacity-50" style="font-size: 6px;">UNIQUE REFERENCE</div>
                  </div>
               </div>
               <div class="col-md-6">
                  <div class="glass-panel p-4 shadow-lg border-0 h-100 transition-all hover-glow">
                     <div class="text-xs-caps text-primary mb-3 fw-bold" style="font-size: 7px;">ACCESS LEVEL</div>
                     <div class="d-flex align-items-center gap-2 text-on-surface fw-bold">
                        <span class="material-symbols-outlined fs-5" [ngClass]="roleToneClass()">{{ user?.role === 'admin' ? 'admin_panel_settings' : 'verified_user' }}</span>
                        <span class="fs-6">{{ roleLabel }}</span>
                     </div>
                     <div class="mt-2 text-xs-caps opacity-50" style="font-size: 6px;">SYSTEM AUTHORIZATION</div>
                  </div>
               </div>
               <div class="col-md-6">
                  <div class="glass-panel p-4 shadow-lg border-0 h-100 transition-all hover-glow">
                     <div class="text-xs-caps text-primary mb-3 fw-bold" style="font-size: 7px;">EMAIL ADDRESS</div>
                     <div class="text-on-surface font-mono small fw-bold">{{ user?.email || 'N/A' }}</div>
                     <div class="mt-2 text-xs-caps opacity-50" style="font-size: 6px;">PRIMARY CONTACT</div>
                  </div>
               </div>
               <div class="col-md-6">
                  <div class="glass-panel p-4 shadow-lg border-0 h-100 transition-all hover-glow">
                     <div class="text-xs-caps text-primary mb-3 fw-bold" style="font-size: 7px;">JOIN DATE</div>
                     <div class="text-on-surface font-mono small fw-bold">{{ user?.created_at | date:'yyyy-MM-dd' }}</div>
                     <div class="mt-2 text-xs-caps opacity-50" style="font-size: 6px;">ACCOUNT CREATED</div>
                  </div>
               </div>
            </div>

            <div class="glass-panel p-4 shadow-lg border-0">
                <h4 class="text-xs-caps text-on-surface mb-3 d-flex align-items-center gap-2 fw-bold" style="font-size: 8px;">
                   <span class="material-symbols-outlined fs-5">navigation</span>
                   QUICK NAVIGATION
                </h4>
                <div class="row g-3">
                  <div class="col-sm-4">
                    <a routerLink="/breaches" class="btn btn-dark w-100 bg-surface-container-high border-0 text-xs-caps py-2 shadow-sm d-flex align-items-center justify-content-center gap-2 card-interactive fw-bold" style="font-size: 7px;">
                      <span class="material-symbols-outlined fs-6">history</span>
                      Breach Logs
                    </a>
                  </div>
                  <div class="col-sm-4">
                    <a routerLink="/" class="btn btn-dark w-100 bg-surface-container-high border-0 text-xs-caps py-2 shadow-sm d-flex align-items-center justify-content-center gap-2 card-interactive fw-bold" style="font-size: 7px;">
                      <span class="material-symbols-outlined fs-6">dashboard</span>
                      Dashboard
                    </a>
                  </div>
                  @if (auth.isAdmin()) {
                    <div class="col-sm-4">
                      <a routerLink="/admin" class="btn btn-dark w-100 bg-surface-container-high border-0 text-xs-caps py-2 shadow-sm d-flex align-items-center justify-content-center gap-2 card-interactive border-start border-primary border-2 fw-bold" style="font-size: 7px;">
                        <span class="material-symbols-outlined fs-6 text-primary">admin_panel_settings</span>
                        Admin Tools
                      </a>
                    </div>
                  }
                </div>
            </div>
          </div>
        </div>

        <!-- SECURITY PANEL -->
        <div class="col-lg-12">
          <div class="glass-panel shadow-lg border-0 position-relative overflow-hidden">
             <!-- Top accent line fix -->
             <div class="position-absolute top-0 start-0 w-100" style="height: 4px; background-color: var(--error); z-index: 10;"></div>

             <div class="p-3 border-bottom border-outline-variant border-opacity-10 d-flex align-items-center gap-2 bg-surface-container-low">
                <span class="material-symbols-outlined text-error fs-5">security</span>
                <span class="text-xs-caps text-error fw-bold" style="font-size: 8px;">SECURITY SETTINGS // CHANGE PASSWORD</span>
             </div>
             <div class="card-body p-4 p-xl-5">
               <form (ngSubmit)="updatePassword()" class="row g-4 align-items-end">
                  <div class="col-md-3">
                     <label class="text-xs-caps text-on-surface-variant mb-2 d-block fw-bold" style="font-size: 7px;">CURRENT PASSWORD</label>
                     <div class="input-group">
                       <input [type]="showCurrentPassword ? 'text' : 'password'" name="currentPassword" [(ngModel)]="currentPassword" class="form-control" style="font-size: 11px; height: 42px;" placeholder="Enter current password">
                       <button type="button" class="input-group-text bg-surface-container-high border-0 text-on-surface-variant pwd-toggle" (click)="showCurrentPassword = !showCurrentPassword">
                         <span class="material-symbols-outlined fs-6">{{ showCurrentPassword ? 'visibility_off' : 'visibility' }}</span>
                       </button>
                     </div>
                  </div>
                  <div class="col-md-3">
                     <label class="text-xs-caps text-on-surface-variant mb-2 d-block fw-bold" style="font-size: 7px;">NEW PASSWORD</label>
                     <div class="input-group">
                       <input [type]="showNewPassword ? 'text' : 'password'" name="newPassword" [(ngModel)]="newPassword" class="form-control" style="font-size: 11px; height: 42px;" placeholder="8+ chars, upper, digit">
                       <button type="button" class="input-group-text bg-surface-container-high border-0 text-on-surface-variant pwd-toggle" (click)="showNewPassword = !showNewPassword">
                         <span class="material-symbols-outlined fs-6">{{ showNewPassword ? 'visibility_off' : 'visibility' }}</span>
                       </button>
                     </div>
                  </div>
                  <div class="col-md-3">
                     <label class="text-xs-caps text-on-surface-variant mb-2 d-block fw-bold" style="font-size: 7px;">REPEAT PASSWORD</label>
                     <div class="input-group">
                       <input [type]="showConfirmPassword ? 'text' : 'password'" name="confirmPassword" [(ngModel)]="confirmPassword" class="form-control" style="font-size: 11px; height: 42px;" placeholder="Repeat new password">
                       <button type="button" class="input-group-text bg-surface-container-high border-0 text-on-surface-variant pwd-toggle" (click)="showConfirmPassword = !showConfirmPassword">
                         <span class="material-symbols-outlined fs-6">{{ showConfirmPassword ? 'visibility_off' : 'visibility' }}</span>
                       </button>
                     </div>
                  </div>
                  <div class="col-md-3">
                    <button type="submit" class="btn btn-error w-100 text-xs-caps fw-bold text-white shadow-sm" style="background-color: var(--error); height: 42px; font-size: 9px;" [disabled]="loading || !newPassword || !currentPassword">
                       UPDATE PASSWORD
                    </button>
                  </div>
               </form>
               <div class="mt-4 pt-3 border-top border-outline-variant border-opacity-5 d-flex align-items-center gap-2">
                  <span class="material-symbols-outlined fs-6 text-success animate-pulse">check_circle</span>
                  <span class="text-xs-caps text-on-surface-variant opacity-75 fw-bold" style="font-size: 7px;">YOUR SECURITY IS OUR PRIORITY. ALL CHANGES ARE MONITORED.</span>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
    <div class="pb-5"></div>
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

    .pwd-toggle { cursor: pointer; }
    .card-interactive:hover {
       background-color: var(--surface-container-highest) !important;
       transform: translateY(-2px);
    }

    .hover-glow:hover {
       background-color: var(--surface-container-high) !important;
       border: 1px solid var(--primary) !important;
       transform: scale(1.02);
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

  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

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
    return (this.user?.role ?? 'guest').toUpperCase().replace(/_/g, ' ');
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
      this.notifications.show('New password must be different.', 'warning');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.notifications.show('Passwords do not match.', 'error');
      return;
    }

    const reg = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!reg.test(this.newPassword)) {
      this.notifications.show('Password complexity requirements not met.', 'error');
      return;
    }

    this.loading = true;
    this.userService.updateUser(this.user!._id, {
      password: this.newPassword,
      current_password: this.currentPassword
    }).subscribe({
      next: () => {
        this.notifications.show('Password updated successfully.', 'success');
        this.newPassword = '';
        this.confirmPassword = '';
        this.currentPassword = '';
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        const msg = err?.error?.message ?? 'Update failed.';
        this.notifications.show(msg, 'error');
      }
    });
  }
}
