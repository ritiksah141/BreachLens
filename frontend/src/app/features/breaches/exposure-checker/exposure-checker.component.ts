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
      <!-- Header Section -->
      <div class="glass-panel p-4 mb-5 shadow-lg text-center border-0">
        <h1 class="font-headline fw-extrabold text-on-surface tracking-tight mb-1" style="font-size: 2.5rem;">
          Verify Identity Exposure
        </h1>
        <p class="text-on-surface opacity-100 mb-0">Cross-reference target intelligence against known global breach vectors</p>
      </div>

      <!-- Unified Floating Pill Search -->
      <div class="max-width-800 mx-auto mb-5">
        <!-- Target Mode Toggle -->
        <div class="d-flex justify-content-center gap-2 mb-3 animate__animated animate__fadeIn">
          <button
            class="btn btn-sm text-xs-caps px-3 py-2 rounded-pill transition-all"
            [ngClass]="searchMode === 'email' ? 'glass-panel border-primary text-primary shadow-sm opacity-100' : 'glass-panel border-outline-variant text-on-surface opacity-50'"
            (click)="setSearchMode('email')">
            <span class="material-symbols-outlined fs-6 align-middle me-1">person</span>
            IDENTITY
          </button>
          <button
            class="btn btn-sm text-xs-caps px-3 py-2 rounded-pill transition-all"
            [ngClass]="searchMode === 'domain' ? 'glass-panel border-primary text-primary shadow-sm opacity-100' : 'glass-panel border-outline-variant text-on-surface opacity-50'"
            (click)="setSearchMode('domain')">
            <span class="material-symbols-outlined fs-6 align-middle me-1">corporate_fare</span>
            DOMAIN AUDIT
          </button>
        </div>

        <div class="d-flex gap-3 align-items-center animate__animated animate__fadeInDown">
          <div class="search-pill-outer flex-grow-1" [class.is-loading]="loading">
            <div class="d-flex align-items-center w-100 h-100">
              <span class="material-symbols-outlined text-primary ms-4 me-2 fs-4">
                {{ searchMode === 'email' ? 'search' : 'hub' }}
              </span>
              <input
                #searchInput
                type="text"
                [(ngModel)]="query"
                (keyup.enter)="performCheck()"
                class="pill-input flex-grow-1 text-on-surface"
                [placeholder]="searchMode === 'email' ? 'Enter email or username...' : 'Enter corporate domain (e.g. company.com)...'"
                autocomplete="off"
              >
            </div>
            <!-- Scanning Line Animation -->
            <div class="scanning-line" *ngIf="loading"></div>
          </div>

          <button
            class="btn btn-primary px-4 fw-bold text-xs-caps text-on-primary rounded-pill shadow-lg d-flex align-items-center justify-content-center"
            style="height: 64px; min-width: 180px;"
            [disabled]="loading"
            (click)="performCheck()">
            @if (!loading) {
              <span>CHECK EXPOSURE</span>
            } @else {
              <span class="spinner-border spinner-border-sm"></span>
            }
          </button>
        </div>

        <div class="text-center mt-4">
          <div class="d-inline-flex align-items-center glass-panel py-1 px-3 rounded-pill border border-outline-variant border-opacity-10 shadow-sm">
            <span class="p-1 bg-success rounded-circle me-2 animate-pulse" style="width: 8px; height: 8px;"></span>
            <span class="text-xs-caps text-success fw-bold" style="font-size: 8px; letter-spacing: 0.3em;">READY TO SCAN</span>
          </div>
        </div>
      </div>

      <!-- Initial State Info -->
      @if (!results && !errorMessage && !loading) {
        <div class="row g-4 animate__animated animate__fadeInUp">
          <div class="col-md-4" (click)="focusSearch()">
            <div class="glass-panel p-4 h-100 shadow-lg text-center card-interactive border-0">
              <span class="material-symbols-outlined fs-1 text-primary mb-3">shield_person</span>
              <h3 class="text-xs-caps text-on-surface fw-bold mb-3">Identity Intelligence</h3>
              <div class="fs-4 fw-bold font-headline text-on-surface mb-1">
                {{ (summary?.total_breaches || 0) | number }}
              </div>
              <p class="text-on-surface small mb-0 opacity-100">Verified breach events available for immediate cross-reference scanning.</p>
            </div>
          </div>
          <div class="col-md-4" (click)="focusSearch()">
            <div class="glass-panel p-4 h-100 shadow-lg text-center card-interactive border-0">
              <span class="material-symbols-outlined fs-1 text-secondary mb-3">travel_explore</span>
              <h3 class="text-xs-caps text-on-surface fw-bold mb-3">Dark Web Records</h3>
              <div class="fs-4 fw-bold font-headline text-on-surface mb-1">
                {{ (summary?.total_records_exposed || 0) | compactNumber }}
              </div>
              <p class="text-on-surface small mb-0 opacity-100">Harvested records indexed from high-priority leak sites and forums.</p>
            </div>
          </div>
          <div class="col-md-4" (click)="focusSearch()">
            <div class="glass-panel p-4 h-100 shadow-lg text-center card-interactive border-0">
              <span class="material-symbols-outlined fs-1 text-warning mb-3">biotech</span>
              <h3 class="text-xs-caps text-on-surface fw-bold mb-3">Critical Incursions</h3>
              <div class="fs-4 fw-bold font-headline text-error mb-1">
                {{ criticalCount | number }}
              </div>
              <p class="text-on-surface small mb-0 opacity-100">High-threat vectors requiring immediate authentication rotation protocols.</p>
            </div>
          </div>
        </div>
      }

      <!-- Error State -->
      @if (errorMessage) {
        <div class="max-width-800 mx-auto mb-5 animate__animated animate__shakeX">
          <div class="glass-panel p-4 border-error border-start border-4 shadow-lg text-center">
            <span class="material-symbols-outlined fs-2 text-error mb-2">warning</span>
            <div class="text-xs-caps fw-bold text-error mb-1">{{ errorMessage }}</div>
            <div class="small opacity-75 text-on-surface-variant">Verify input format and re-initiate scanning protocols.</div>
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
                <h2 class="text-xs-caps text-on-surface border-bottom border-outline-variant border-opacity-10 pb-2 mb-4">
                  {{ searchMode === 'email' ? 'IDENTITY THREAT STATUS' : 'DOMAIN RISK PROFILE' }}
                </h2>
                <div class="p-4 rounded-3 d-flex align-items-center gap-4 shadow-inner bg-surface-container-high border border-outline-variant border-opacity-10">
                  <div class="status-orb" [ngClass]="results.exposed ? 'bg-error animate-pulse' : 'bg-success'"></div>
                  <div>
                    <div class="fs-4 fw-bold font-headline" [ngClass]="results.exposed ? 'text-error' : 'text-success'">
                      {{ results.exposed ? 'EXPOSURE DETECTED' : 'CLEAR SIGNAL' }}
                    </div>
                    <div class="text-xs-caps text-on-surface opacity-100" style="font-size: 9px;">
                      {{ results.exposed ? results.breach_count + ' BREACHES FOUND' : 'NO KNOWN INTURSIONS' }}
                    </div>
                  </div>
                </div>
              </div>
              <div class="mt-4">
                <button class="btn btn-error w-100 py-3 text-xs-caps shadow-sm text-white fw-bold" *ngIf="results.exposed" style="background-color: var(--error)">
                  SECURE ACCOUNT
                </button>
                <div class="text-center text-xs-caps opacity-100 py-3 text-on-surface" *ngIf="!results.exposed" style="font-size: 8px;">
                  IDENTITY STATUS: NOMINAL
                </div>
              </div>
            </div>
          </div>

          <div class="col-lg-8">
            <div class="glass-panel p-4 shadow-lg h-100 overflow-hidden">
              <h2 class="text-xs-caps text-on-surface border-bottom border-outline-variant border-opacity-10 pb-2 mb-4">INFILTRATION LOGS</h2>
              <div class="table-responsive">
                <table class="table table-hover align-middle mb-0 text-on-surface">
                  <thead>
                    <tr class="text-xs-caps opacity-100 border-bottom border-outline-variant border-opacity-10">
                      <th class="py-3" style="font-size: 8px;">TIMESTAMP</th>
                      <th class="py-3" style="font-size: 8px;">AFFECTED SOURCE</th>
                      <th class="py-3" style="font-size: 8px;">SECTOR</th>
                      <th class="py-3 text-end" style="font-size: 8px;">SEVERITY</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (b of results.breaches; track b._id; let i = $index) {
                      <tr class="border-bottom border-outline-variant border-opacity-5 hover-bg-surface-container-high cursor-pointer" [routerLink]="['/breaches', b._id]">
                        <td class="font-mono small py-3 opacity-100">{{ b.created_at | date:'yyyy.MM.dd Z' }}</td>
                        <td class="fw-bold small py-3" [ngClass]="i % 2 === 0 ? 'text-primary' : 'text-secondary'">{{ getOrgName(b) | uppercase }}</td>
                        <td class="text-xs-caps opacity-100 py-3 text-on-surface" style="font-size: 8px;">{{ b.industry | uppercase }}</td>
                        <td class="text-end py-3">
                          <span class="badge py-1 px-2 border border-opacity-25 text-xs-caps"
                                [ngClass]="'border-' + getSevColor(b.severity) + ' text-' + getSevColor(b.severity)"
                                style="font-size: 7px;">
                            {{ b.severity | uppercase }}
                          </span>
                        </td>
                      </tr>
                    }
                    @if (!results.breaches || results.breaches.length === 0) {
                      <tr><td colspan="4" class="text-center py-5 opacity-50 text-xs-caps text-on-surface">NO DATA RECORDS AVAILABLE</td></tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="col-lg-6">
            <div class="glass-panel p-3 shadow-lg h-100">
              <h2 class="text-xs-caps text-on-surface px-2 mb-3">GLOBAL VECTOR MAP</h2>
              <div class="position-relative overflow-hidden" style="height: 300px; border-radius: 1rem;">
                <app-breach-map height="100%" />
              </div>
            </div>
          </div>

          <div class="col-lg-6">
            <div class="glass-panel p-4 shadow-lg h-100">
              <h2 class="text-xs-caps text-on-surface border-bottom border-outline-variant border-opacity-10 pb-2 mb-4">RECOMMENDED PROTOCOLS</h2>
              <ul class="list-unstyled d-flex flex-column gap-4">
                <li class="d-flex gap-3">
                  <span class="material-symbols-outlined text-primary">lock_reset</span>
                  <div>
                    <div class="text-xs-caps fw-bold text-primary mb-1">ROTATE CORE CREDENTIALS</div>
                    <div class="small opacity-100 text-on-surface">Immediate forced password reset across all linked domains recommended.</div>
                  </div>
                </li>
                <li class="d-flex gap-3">
                  <span class="material-symbols-outlined text-secondary">shield_locked</span>
                  <div>
                    <div class="text-xs-caps fw-bold text-secondary mb-1">ENABLE HARDWARE MFA</div>
                    <div class="small opacity-100 text-on-surface">Elevate authentication protocols to physical token requirements.</div>
                  </div>
                </li>
                <li class="d-flex gap-3">
                  <span class="material-symbols-outlined text-warning">security_update_good</span>
                  <div>
                    <div class="text-xs-caps fw-bold text-warning mb-1">AUDIT LINKED ACCOUNTS</div>
                    <div class="small opacity-100 text-on-surface">Review cross-domain authorization grants for unauthorized persistence.</div>
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

    /* Perfect Theme-Aware Pill Design */
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
      padding: 6px;
      transition: all 0.3s ease;
    }

    .search-pill-outer:focus-within {
      border-color: var(--primary);
      box-shadow: 0 0 15px color-mix(in srgb, var(--primary) 15%, transparent);
    }

    [data-theme='light'] .search-pill-outer {
      background: var(--surface) !important;
      border-color: var(--outline-variant);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    }

    .pill-input {
      background: transparent;
      border: none;
      outline: none;
      color: var(--on-surface) !important;
      font-size: 0.95rem;
      font-weight: 500;
      padding: 0 1rem;
      width: 100%;
    }

    .pill-input::placeholder {
      color: var(--on-surface-variant);
      opacity: 0.5;
    }

    .pill-button {
      border-radius: 999px;
      height: 52px;
      min-width: 200px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      transition: all 0.2s ease;
    }

    .card-interactive {
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .card-interactive:hover {
      transform: translateY(-8px);
      background: var(--surface-container-high);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25) !important;
    }

    [data-theme='light'] .card-interactive:hover {
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1) !important;
    }

    .status-orb { width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 0 15px currentColor; }

    .scanning-line {
      position: absolute; bottom: 0; left: 0; height: 2px;
      background: var(--primary); box-shadow: 0 0 10px var(--primary);
      animation: scan 2s linear infinite;
    }
    @keyframes scan { 0% { width: 0; left: 0; } 50% { width: 100%; left: 0; } 100% { width: 0; left: 100%; } }
    .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }

    /* Theme adaptive table */
    .table { color: var(--on-surface); }
    .table-hover tbody tr:hover { background-color: var(--surface-container-high) !important; }
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
    setTimeout(() => this.searchInput.nativeElement.focus(), 0);
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
