import { Component, OnInit, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BreachService } from '../../../core/services/breach.service';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { NotificationService } from '../../../core/services/notification.service';
import { BreachMapComponent } from '../breach-map/breach-map.component';
import { RouterLink } from '@angular/router';
import { Breach, AnalyticsSummary, SeverityBreakdown } from '../../../core/models/models';
import { CompactNumberPipe } from '../../../shared/pipes/compact-number.pipe';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-exposure-checker',
  standalone: true,
  imports: [CommonModule, FormsModule, BreachMapComponent, RouterLink, CompactNumberPipe],
  template: `
    <div class="exposure-checker-container animate__animated animate__fadeIn">
      <!-- Page Header -->
      <div class="glass-panel p-4 mb-5 shadow-lg border-0 d-flex justify-content-between align-items-center">
        <div>
          <h2 class="font-headline fw-extrabold text-on-surface tracking-tight page-title mb-1">Exposure Intelligence</h2>
          <p class="text-xs-caps mb-0 text-on-surface-variant opacity-75" style="font-size: 7px; letter-spacing: 0.1em;">Cross-reference identity and domain vectors against global breach repositories.</p>
        </div>
        <div class="d-flex align-items-center gap-3">
           <span class="badge py-2 px-3 glass-panel border border-primary border-opacity-25 text-primary text-xs-caps shadow-sm d-flex align-items-center gap-2"
                 style="font-size: 8px;">
              <span class="status-dot-xs" [ngClass]="(summary && !errorMessage) ? 'bg-success' : 'bg-error'"></span>
              <span class="material-symbols-outlined fs-6">manage_search</span>
              {{ errorMessage ? 'SCANNER ERROR' : 'READY TO SCAN' }}
           </span>
        </div>
      </div>

      <!-- Unified Floating Pill Search -->
      <div class="max-width-800 mx-auto mb-5">
        <!-- Target Mode Toggle -->
        <div class="d-flex justify-content-center gap-2 mb-4 animate__animated animate__fadeIn">
          <button
            class="btn btn-sm text-xs-caps px-4 py-2 rounded-pill transition-all fw-bold"
            style="font-size: 7px;"
            [ngClass]="searchMode === 'email' ? 'glass-panel border-primary text-primary shadow-sm opacity-100' : 'glass-panel border-outline-variant text-on-surface opacity-50'"
            (click)="setSearchMode('email')">
            <span class="material-symbols-outlined fs-6 align-middle me-2">person</span>
            IDENTITY SCAN
          </button>
          <button
            class="btn btn-sm text-xs-caps px-4 py-2 rounded-pill transition-all fw-bold"
            style="font-size: 7px;"
            [ngClass]="searchMode === 'domain' ? 'glass-panel border-primary text-primary shadow-sm opacity-100' : 'glass-panel border-outline-variant text-on-surface opacity-50'"
            (click)="setSearchMode('domain')">
            <span class="material-symbols-outlined fs-6 align-middle me-2">corporate_fare</span>
            DOMAIN AUDIT
          </button>
        </div>

        <div class="d-flex gap-3 align-items-center animate__animated animate__fadeInDown">
          <div class="search-pill-outer flex-grow-1 shadow-lg" [class.is-loading]="loading">
            <div class="d-flex align-items-center w-100 h-100 ps-4">
              <span class="material-symbols-outlined text-primary me-3 fs-4">
                {{ searchMode === 'email' ? 'fingerprint' : 'hub' }}
              </span>
              <input
                #searchInput
                type="text"
                [(ngModel)]="query"
                (keyup.enter)="performCheck()"
                class="pill-input flex-grow-1 text-on-surface fw-bold"
                [placeholder]="searchMode === 'email' ? 'Enter email address or operator username...' : 'Enter target domain (e.g. corporation.com)...'"
                autocomplete="off"
                style="font-size: 13px;"
              >
            </div>
            <!-- Scanning Line Animation -->
            <div class="scanning-line" *ngIf="loading"></div>
          </div>

          <button
            class="btn btn-primary px-4 fw-bold text-xs-caps text-on-primary rounded-pill shadow-lg d-flex align-items-center justify-content-center"
            style="height: 64px; min-width: 180px; font-size: 9px;"
            [disabled]="loading"
            (click)="performCheck()">
            @if (!loading) {
              <span>INITIATE SCAN</span>
            } @else {
              <span class="spinner-border spinner-border-sm"></span>
            }
          </button>
        </div>
      </div>

      <!-- Initial State Info -->
      @if (!results && !errorMessage && !loading) {
        <div class="row g-4 animate__animated animate__fadeInUp">
          <div class="col-md-4" (click)="focusSearch()">
            <div class="glass-panel p-4 h-100 shadow-lg text-center card-interactive border-0 d-flex flex-column align-items-center">
              <div class="identity-orb-sm mb-3">
                <span class="material-symbols-outlined fs-2 text-primary">shield_person</span>
              </div>
              <h3 class="text-xs-caps text-on-surface fw-bold mb-3" style="font-size: 8px;">Identity Intel</h3>
              <div class="fs-4 fw-bold font-headline text-on-surface mb-1">
                {{ (summary?.total_breaches || 0) | number }}
              </div>
              <p class="text-xs-caps text-on-surface-variant opacity-75 mb-0 fw-bold" style="font-size: 7px;">VERIFIED BREACH EVENTS</p>
            </div>
          </div>
          <div class="col-md-4" (click)="focusSearch()">
            <div class="glass-panel p-4 h-100 shadow-lg text-center card-interactive border-0 d-flex flex-column align-items-center">
              <div class="identity-orb-sm secondary mb-3">
                <span class="material-symbols-outlined fs-2 text-secondary">travel_explore</span>
              </div>
              <h3 class="text-xs-caps text-on-surface fw-bold mb-3" style="font-size: 8px;">Dark Web Records</h3>
              <div class="fs-4 fw-bold font-headline text-on-surface mb-1">
                {{ (summary?.total_records_exposed || 0) | compactNumber }}
              </div>
              <p class="text-xs-caps text-on-surface-variant opacity-75 mb-0 fw-bold" style="font-size: 7px;">DATA POINTS HARVESTED</p>
            </div>
          </div>
          <div class="col-md-4" (click)="focusSearch()">
            <div class="glass-panel p-4 h-100 shadow-lg text-center card-interactive border-0 d-flex flex-column align-items-center">
              <div class="identity-orb-sm error mb-3">
                <span class="material-symbols-outlined fs-2 text-error">biotech</span>
              </div>
              <h3 class="text-xs-caps text-on-surface fw-bold mb-3" style="font-size: 8px;">Critical Vectors</h3>
              <div class="fs-4 fw-bold font-headline text-error mb-1">
                {{ criticalCount | number }}
              </div>
              <p class="text-xs-caps text-on-surface-variant opacity-75 mb-0 fw-bold" style="font-size: 7px;">HIGH-THREAT INCURSIONS</p>
            </div>
          </div>
        </div>
      }

      <!-- Error State -->
      @if (errorMessage) {
        <div class="max-width-800 mx-auto mb-5 animate__animated animate__shakeX">
          <div class="glass-panel p-4 border-error border-start border-4 shadow-lg text-center">
            <span class="material-symbols-outlined fs-2 text-error mb-2">warning</span>
            <div class="text-xs-caps fw-bold text-error mb-1" style="font-size: 8px;">{{ errorMessage }}</div>
            <div class="text-xs-caps opacity-50 text-on-surface-variant fw-bold" style="font-size: 7px;">VERIFY INPUT FORMAT AND RE-INITIATE SCANNING PROTOCOLS</div>
          </div>
        </div>
      }

      <!-- Results Packet -->
      @if (results) {
        <div class="row g-4 mb-5 animate__animated animate__fadeIn">
          <div class="col-lg-4">
            <div class="glass-panel p-4 shadow-lg h-100 d-flex flex-column justify-content-between border-top border-4"
                 [ngClass]="results.exposed ? 'border-error' : 'border-success'">
              <div>
                <h2 class="text-xs-caps text-on-surface border-bottom border-outline-variant border-opacity-10 pb-2 mb-4" style="font-size: 8px;">
                  {{ searchMode === 'email' ? 'IDENTITY THREAT STATUS' : 'DOMAIN RISK PROFILE' }}
                </h2>
                <div class="p-4 rounded-3 d-flex align-items-center gap-4 bg-surface-container-high border border-outline-variant border-opacity-10 shadow-sm">
                  <div class="status-orb shadow-lg" [ngClass]="results.exposed ? 'bg-error animate-pulse' : 'bg-success'"></div>
                  <div>
                    <div class="fs-4 fw-bold font-headline" [ngClass]="results.exposed ? 'text-error' : 'text-success'">
                      {{ results.exposed ? 'EXPOSURE DETECTED' : 'CLEAR SIGNAL' }}
                    </div>
                    <div class="text-xs-caps text-on-surface opacity-100 fw-bold" style="font-size: 8px;">
                      {{ results.exposed ? results.breach_count + ' BREACHES FOUND' : 'NO KNOWN INCURSIONS' }}
                    </div>
                  </div>
                </div>
              </div>
              <div class="mt-4">
                <button class="btn btn-error w-100 py-3 text-xs-caps shadow-sm text-white fw-bold" *ngIf="results.exposed" style="background-color: var(--error); font-size: 9px;">
                  SECURE IDENTITY
                </button>
                <div class="text-center text-xs-caps opacity-100 py-3 text-on-surface fw-bold" *ngIf="!results.exposed" style="font-size: 7px;">
                  IDENTITY STATUS: NOMINAL
                </div>
              </div>
            </div>
          </div>

          <div class="col-lg-8">
            <div class="glass-panel p-4 shadow-lg h-100 overflow-hidden d-flex flex-column">
              <h2 class="text-xs-caps text-on-surface border-bottom border-outline-variant border-opacity-10 pb-2 mb-4" style="font-size: 8px;">INFILTRATION LOGS</h2>
              <div class="table-responsive custom-scrollbar-hidden flex-grow-1">
                <table class="table table-hover align-middle mb-0 text-on-surface">
                  <thead>
                    <tr class="bg-surface-container-low">
                      <th class="py-3 ps-3 text-xs-caps text-on-surface-variant border-0" style="font-size: 7px;">TIMESTAMP</th>
                      <th class="py-3 text-xs-caps text-on-surface-variant border-0" style="font-size: 7px;">SOURCE</th>
                      <th class="py-3 text-xs-caps text-on-surface-variant border-0" style="font-size: 7px;">SECTOR</th>
                      <th class="py-3 text-end pe-3 text-xs-caps text-on-surface-variant border-0" style="font-size: 7px;">SEVERITY</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (b of results.breaches; track b._id; let i = $index) {
                      <tr class="bg-transparent border-bottom border-outline-variant border-opacity-5 transition-all hover-bg-surface-container-high cursor-pointer" [routerLink]="['/breaches', b._id]">
                        <td class="font-mono small py-3 ps-3 opacity-100 fw-bold" style="font-size: 10px;">{{ b.created_at | date:'yyyy.MM.dd' }}</td>
                        <td class="fw-bold small py-3" style="font-size: 11px;">{{ getOrgName(b) | uppercase }}</td>
                        <td class="text-xs-caps opacity-75 py-3 fw-bold" style="font-size: 7px;">{{ b.industry | uppercase }}</td>
                        <td class="text-end py-3 pe-3">
                          <div class="d-flex align-items-center justify-content-end gap-2">
                             <span class="p-1 rounded-circle shadow-sm" [ngClass]="'bg-' + getSevColor(b.severity)" style="width: 5px; height: 5px;"></span>
                             <span class="text-xs-caps fw-bold" [ngClass]="'text-' + getSevColor(b.severity)" style="font-size: 7px;">{{ b.severity | uppercase }}</span>
                          </div>
                        </td>
                      </tr>
                    }
                    @if (!results.breaches || results.breaches.length === 0) {
                      <tr><td colspan="4" class="text-center py-5 opacity-50 text-xs-caps text-on-surface" style="font-size: 8px;">NO DATA RECORDS AVAILABLE</td></tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="col-lg-6">
            <div class="glass-panel p-3 shadow-lg h-100">
              <h2 class="text-xs-caps text-on-surface px-2 mb-3" style="font-size: 8px;">GLOBAL VECTOR MAP</h2>
              <div class="position-relative overflow-hidden" style="height: 300px; border-radius: 1rem;">
                <app-breach-map height="100%" />
              </div>
            </div>
          </div>

          <div class="col-lg-6">
            <div class="glass-panel p-4 shadow-lg h-100">
              <h2 class="text-xs-caps text-on-surface border-bottom border-outline-variant border-opacity-10 pb-2 mb-4" style="font-size: 8px;">RECOMMENDED PROTOCOLS</h2>
              <ul class="list-unstyled d-flex flex-column gap-4">
                <li class="d-flex gap-3">
                  <span class="material-symbols-outlined text-primary">lock_reset</span>
                  <div>
                    <div class="text-xs-caps fw-bold text-primary mb-1" style="font-size: 7px;">ROTATE CORE CREDENTIALS</div>
                    <div class="text-xs-caps text-on-surface opacity-75 fw-bold" style="font-size: 7px;">Immediate forced password reset across all linked domains.</div>
                  </div>
                </li>
                <li class="d-flex gap-3">
                  <span class="material-symbols-outlined text-secondary">shield_locked</span>
                  <div>
                    <div class="text-xs-caps fw-bold text-secondary mb-1" style="font-size: 7px;">ENABLE HARDWARE MFA</div>
                    <div class="text-xs-caps text-on-surface opacity-75 fw-bold" style="font-size: 7px;">Elevate authentication protocols to physical token requirements.</div>
                  </div>
                </li>
                <li class="d-flex gap-3">
                  <span class="material-symbols-outlined text-warning">security_update_good</span>
                  <div>
                    <div class="text-xs-caps fw-bold text-warning mb-1" style="font-size: 7px;">AUDIT LINKED ACCOUNTS</div>
                    <div class="text-xs-caps text-on-surface opacity-75 fw-bold" style="font-size: 7px;">Review cross-domain authorization grants for unauthorized persistence.</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .max-width-800 { max-width: 800px; }
    .text-xs-caps { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; }

    .search-pill-outer {
      height: 64px;
      background: var(--surface-container-low) !important;
      backdrop-filter: blur(12px);
      border: 1px solid var(--outline-variant);
      border-radius: 999px;
      display: flex;
      align-items: center;
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .search-pill-outer:focus-within {
      border-color: var(--primary);
      box-shadow: 0 0 15px color-mix(in srgb, var(--primary) 15%, transparent);
    }

    .pill-input {
      background: transparent;
      border: none;
      outline: none;
      color: var(--on-surface) !important;
      padding: 0 1rem;
      width: 100%;
    }

    .pill-input::placeholder {
      color: var(--on-surface-variant);
      opacity: 0.5;
    }

    .card-interactive {
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .card-interactive:hover {
      transform: translateY(-8px);
      background-color: var(--surface-container-high) !important;
      border: 1px solid var(--primary) !important;
    }

    .identity-orb-sm {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--primary) 15%, transparent), transparent);
      border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent);
      box-shadow: 0 0 20px color-mix(in srgb, var(--primary) 12%, transparent);
      transition: all 0.3s ease;
    }
    .identity-orb-sm.secondary {
      background: radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--secondary) 15%, transparent), transparent);
      border: 1px solid color-mix(in srgb, var(--secondary) 25%, transparent);
      box-shadow: 0 0 20px color-mix(in srgb, var(--secondary) 12%, transparent);
    }
    .identity-orb-sm.error {
      background: radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--error) 15%, transparent), transparent);
      border: 1px solid color-mix(in srgb, var(--error) 25%, transparent);
      box-shadow: 0 0 20px color-mix(in srgb, var(--error) 12%, transparent);
    }

    .status-orb { width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 0 15px currentColor; }

    .status-dot-xs {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      box-shadow: 0 0 8px currentColor;
    }

    .scanning-line {
      position: absolute; bottom: 0; left: 0; height: 2px;
      background: var(--primary); box-shadow: 0 0 10px var(--primary);
      animation: scan 2s linear infinite;
    }
    @keyframes scan { 0% { width: 0; left: 0; } 50% { width: 100%; left: 0; } 100% { width: 0; left: 100%; } }
    .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }

    .custom-scrollbar-hidden::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar-hidden::-webkit-scrollbar-thumb { background: transparent; border-radius: 10px; }
    .custom-scrollbar-hidden:hover::-webkit-scrollbar-thumb { background: var(--outline-variant); }

    .bg-severity-critical { background-color: var(--severity-critical) !important; }
    .bg-severity-high { background-color: var(--severity-high) !important; }
    .bg-severity-medium { background-color: var(--severity-medium) !important; }
    .bg-severity-low { background-color: var(--severity-low) !important; }
    .bg-severity-info { background-color: var(--severity-info) !important; }
    .text-severity-critical { color: var(--severity-critical) !important; }
    .text-severity-high { color: var(--severity-high) !important; }
    .text-severity-medium { color: var(--severity-medium) !important; }
    .text-severity-low { color: var(--severity-low) !important; }
    .text-severity-info { color: var(--severity-info) !important; }
  `]
})
export class ExposureCheckerComponent implements OnInit {
  @ViewChild('searchInput') searchInput!: ElementRef;

  private breachService = inject(BreachService);
  private analyticsService = inject(AnalyticsService);
  private notifications = inject(NotificationService);

  query = '';
  loading = false;
  results: any = null;
  errorMessage = '';
  summary: AnalyticsSummary | null = null;
  criticalCount = 0;
  searchMode: 'email' | 'domain' = 'email';

  ngOnInit(): void {
    this.loadData();
  }

  setSearchMode(mode: 'email' | 'domain'): void {
    this.searchMode = mode;
    this.results = null;
    this.errorMessage = '';
    this.focusSearch();
  }

  loadData(): void {
    forkJoin({
      summary: this.analyticsService.getSummary(),
      severity: this.analyticsService.getSeverityBreakdown()
    }).subscribe({
      next: (res: any) => {
        this.summary = res.summary.data;
        const severityData: SeverityBreakdown[] = res.severity.data || [];
        const crit = severityData.find(s => s.severity?.toLowerCase() === 'critical')?.breach_count || 0;
        const high = severityData.find(s => s.severity?.toLowerCase() === 'high')?.breach_count || 0;
        this.criticalCount = crit + high;
      },
      error: () => {}
    });
  }

  focusSearch(): void {
    if (this.searchInput) {
      setTimeout(() => this.searchInput.nativeElement.focus(), 0);
    }
  }

  performCheck(): void {
    if (!this.query.trim()) {
      this.notifications.show('ENTER VALID TARGET QUERY', 'warning');
      this.errorMessage = 'TARGET QUERY REQUIRED';
      this.results = null;
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const payload = {
      email: this.searchMode === 'email' ? this.query : undefined,
      domain: this.searchMode === 'domain' ? this.query : undefined
    };

    this.breachService.checkExposure(payload.email, payload.domain).subscribe({
      next: (res) => {
        this.results = res.data;
        this.loading = false;
        if (this.results.exposed) {
          const type = this.searchMode === 'email' ? 'IDENTITY' : 'DOMAIN';
          this.notifications.show(`${type} EXPOSURE CONFIRMED: ${this.results.breach_count} BREACHES`, 'error');
        } else {
          this.notifications.show('QUERY RETURNED CLEAR SIGNAL', 'success');
        }
      },
      error: (err) => {
        this.loading = false;
        this.results = null;
        this.errorMessage = err?.error?.message || 'DATA INGESTION ERROR';
        this.notifications.show(this.errorMessage, 'error');
      }
    });
  }

  getSevColor(sev: string): string {
    const s = sev?.toLowerCase() || 'info';
    if (s === 'informational' || s === 'info') return 'severity-info';
    return `severity-${s}`;
  }

  getOrgName(b: Breach): string {
    if (!b.organisation) return 'UNKNOWN';
    if (typeof b.organisation === 'string') return b.organisation;
    return b.organisation.name || 'UNKNOWN';
  }
}
