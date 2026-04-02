import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass, DatePipe, UpperCasePipe, CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, NgClass, DatePipe, UpperCasePipe, CommonModule],
  template: `
    <div class="row g-4 mt-2">
      <!-- Profile Header Bento -->
      <div class="col-12">
        <div class="row g-4">
          <!-- Clearance Level Card -->
          <div class="col-md-4">
            <div class="card p-4 border-0 border-start border-primary border-3 h-100 glow-primary position-relative overflow-hidden">
              <div class="position-absolute top-0 end-0 p-2 opacity-10">
                <span class="material-symbols-outlined fs-1">verified_user</span>
              </div>
              <div class="text-xs-caps text-on-surface-variant mb-2">Clearance_Verification</div>
              <div class="fs-2 fw-bold text-on-surface font-headline">
                {{ user?.role === 'admin' ? 'LEVEL_5' : (user?.role === 'analyst' ? 'LEVEL_3' : 'LEVEL_1') }}
              </div>
              <div class="text-xs-caps text-primary fw-bold mt-2">
                {{ user?.role | uppercase }}_ACCESS_GRANTED
              </div>
            </div>
          </div>

          <!-- Status Card -->
          <div class="col-md-4">
            <div class="card p-4 border-0 border-start border-success border-3 h-100">
              <div class="text-xs-caps text-on-surface-variant mb-2">Connectivity_Status</div>
              <div class="fs-2 fw-bold text-success font-headline d-flex align-items-center gap-2">
                ONLINE
                <span class="p-1 bg-success rounded-circle animate-pulse"></span>
              </div>
              <div class="text-xs-caps text-on-surface-variant mt-2">ACTIVE_SESSION_STABLE</div>
            </div>
          </div>

          <!-- Deployment Card -->
          <div class="col-md-4">
            <div class="card p-4 border-0 border-start border-secondary border-3 h-100">
              <div class="text-xs-caps text-on-surface-variant mb-2">Deployment_Timeline</div>
              <div class="fs-3 fw-bold text-on-surface font-headline">{{ user?.created_at | date:'MMM dd, yyyy' }}</div>
              <div class="text-xs-caps text-on-surface-variant mt-2 uppercase">Member_Since_Deployment</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Identity & Security Grid -->
      <div class="col-lg-4">
        <div class="card border-0 bg-surface-container-low h-100 shadow-lg position-relative overflow-hidden">
          <div class="position-absolute top-0 start-0 w-100 h-100 opacity-5 pointer-events-none"
               style="background-image: radial-gradient(var(--primary) 1px, transparent 1px); background-size: 20px 20px;"></div>

          <div class="card-body p-4 p-xl-5 text-center position-relative z-1">
            <div class="mb-4 d-inline-block position-relative">
              <div class="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center text-primary fw-bold glow-primary border border-primary border-opacity-25 mx-auto"
                   style="width:120px; height:120px; font-size:3rem; font-family: var(--font-headline);">
                {{ initials }}
              </div>
              <div class="position-absolute bottom-0 end-0 p-2 bg-success rounded-circle border border-4 border-dark animate-pulse"></div>
            </div>

            <h3 class="font-headline fw-bold text-on-surface mb-1 fs-4">{{ user?.username }}</h3>
            <p class="text-xs-caps text-primary opacity-75 mb-4">{{ user?.email }}</p>

            <div class="badge py-2 px-4 glass-panel border border-outline-variant border-opacity-25 text-xs-caps mb-5"
                 [ngClass]="roleColorClass()">
              {{ user?.role }}
            </div>

            <div class="d-grid gap-2">
              <button class="btn btn-primary text-xs-caps py-2" (click)="auth.logout()">
                <span class="material-symbols-outlined fs-6 me-2">power_settings_new</span> Terminate_Session
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-8">
        <div class="card border-0 bg-surface-container-low h-100 shadow-lg overflow-hidden">
          <div class="p-3 border-bottom border-outline-variant border-opacity-10 d-flex justify-content-between align-items-center bg-surface-container">
            <span class="text-xs-caps text-on-surface fw-bold">Operator_Telemetry_Data</span>
            <span class="text-xs-caps text-on-surface-variant" style="font-size: 8px;">NODE_ID: {{ (user?._id ?? '0x000').slice(-8) | uppercase }}</span>
          </div>

          <div class="card-body p-4 p-xl-5">
            <div class="row g-4">
              <!-- Data Fields -->
              <div class="col-md-6">
                <div class="p-3 glass-panel rounded-3 border border-outline-variant border-opacity-10">
                  <label class="text-xs-caps text-on-surface-variant mb-2 d-block">Operator_Identifier</label>
                  <div class="text-on-surface font-mono small">{{ user?._id }}</div>
                </div>
              </div>
              <div class="col-md-6">
                <div class="p-3 glass-panel rounded-3 border border-outline-variant border-opacity-10">
                  <label class="text-xs-caps text-on-surface-variant mb-2 d-block">Assigned_Email</label>
                  <div class="text-on-surface font-mono small">{{ user?.email }}</div>
                </div>
              </div>
              <div class="col-md-6">
                <div class="p-3 glass-panel rounded-3 border border-outline-variant border-opacity-10">
                  <label class="text-xs-caps text-on-surface-variant mb-2 d-block">Last_Sync_Signal</label>
                  <div class="text-on-surface font-mono small">{{ user?.last_login | date:'yyyy-MM-dd || HH:mm:ss' }}</div>
                </div>
              </div>
              <div class="col-md-6">
                <div class="p-3 glass-panel rounded-3 border border-outline-variant border-opacity-10">
                  <label class="text-xs-caps text-on-surface-variant mb-2 d-block">Registration_Timestamp</label>
                  <div class="text-on-surface font-mono small">{{ user?.created_at | date:'yyyy-MM-dd || HH:mm:ss' }}</div>
                </div>
              </div>
              <div class="col-12 mt-5">
                <h4 class="text-xs-caps text-on-surface mb-4">Account_Security_Operations</h4>
                <div class="d-flex flex-wrap gap-3">
                  <a routerLink="/breaches" class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-2 px-4 shadow-sm flex-grow-1">
                    <span class="material-symbols-outlined fs-6 me-2">history</span> Investigation_Logs
                  </a>
                  @if (auth.isAnalyst()) {
                    <a routerLink="/admin" class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-2 px-4 shadow-sm flex-grow-1">
                      <span class="material-symbols-outlined fs-6 me-2">admin_panel_settings</span> Command_Terminal
                    </a>
                  }
                </div>
              </div>
            </div>
          </div>

          <div class="bg-surface-container px-4 py-3 border-top border-outline-variant border-opacity-10 mt-auto">
            <div class="d-flex justify-content-between align-items-center opacity-50">
              <span class="text-xs-caps" style="font-size: 8px;">SECURITY_PROTOCOL: AES-256-GCM</span>
              <span class="text-xs-caps" style="font-size: 8px;">ENCRYPTION_STATUS: NOMINAL</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .text-xs-caps { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; }
    .glow-primary { box-shadow: 0 0 20px rgba(0, 167, 224, 0.15); }
    .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }

    .text-admin { color: var(--tertiary-container) !important; border-color: var(--tertiary-container) !important; }
    .text-analyst { color: var(--primary) !important; border-color: var(--primary) !important; }
    .text-guest { color: var(--on-surface-variant) !important; border-color: var(--on-surface-variant) !important; }
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

  roleColorClass(): string {
    if (this.user?.role === 'admin') return 'text-admin';
    if (this.user?.role === 'analyst') return 'text-analyst';
    return 'text-guest';
  }
}
