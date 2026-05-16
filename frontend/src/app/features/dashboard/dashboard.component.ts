import {
  Component, OnInit, OnDestroy, inject,
  ElementRef, ViewChild, AfterViewInit, effect, signal
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgClass, DecimalPipe, PercentPipe, CommonModule, DatePipe } from '@angular/common';
import { AnalyticsService } from '../../core/services/analytics.service';
import { BreachService } from '../../core/services/breach.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { ThemeService } from '../../core/services/theme.service';
import { HealthService } from '../../core/services/health.service';
import { AnalyticsSummary, SeverityBreakdown, MonthlyTrend, Breach, AttackSurfaceProfile } from '../../core/models/models';
import { RiskLevelPipe } from '../../shared/pipes/risk-level.pipe';
import { CompactNumberPipe } from '../../shared/pipes/compact-number.pipe';
import { BreachMapComponent } from '../breaches/breach-map/breach-map.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, NgClass, DecimalPipe, PercentPipe, CommonModule, RiskLevelPipe, CompactNumberPipe, BreachMapComponent, DatePipe, FormsModule],
  template: `
    <div class="dashboard-grid">
      <!-- Top Left Tactical Identifier -->
      <div class="position-absolute top-0 start-0 p-4 z-index-2000 pointer-events-none" style="margin-top: 100px; margin-left: 10px;">
        <div class="title-wrapper">
          <h2 class="page-title mb-1" style="font-size: 1rem; opacity: 0.8;">
            <span class="material-symbols-outlined text-primary opacity-50 me-2" style="font-size: 20px;">home</span>
            Strategic Dashboard
          </h2>
          <p class="text-xs-caps mb-0 text-on-surface-variant opacity-50" style="font-size: 6px; letter-spacing: 0.1em;">Global threat projection and aggregate intelligence node.</p>
        </div>
      </div>

      <!-- Background Map -->
      <div class="map-container-panel overflow-hidden" style="border-radius: 1rem;">
        <app-breach-map height="100%" />

        <!-- Hero Container (Guest & Personal) -->
        <div class="guest-hero-container">
          @if (!auth.isAuthenticated()) {
            <div class="guest-hero-card glass-panel px-3 py-2 shadow-lg animate__animated animate__fadeInUp d-flex flex-column justify-content-between">
               <div class="brand-section">
                  <div class="d-flex align-items-center gap-2 mb-1">
                    <span class="brand-logo" aria-hidden="true">
                      <span class="brand-chip brand-chip-a">
                        <span class="material-symbols-outlined brand-chip-icon">security</span>
                      </span>
                      <span class="brand-chip brand-chip-b">
                        <span class="material-symbols-outlined brand-chip-icon">visibility</span>
                      </span>
                    </span>
                    <span class="brand-wordmark fs-5 fw-bold text-primary font-headline">BreachLens</span>
                  </div>
                  <div class="text-xs-caps text-on-surface-variant" style="font-size: 5px; opacity: 0.7; letter-spacing: 0.12em;">Enterprise-Grade OSINT Engine</div>
               </div>

               <div class="row g-2 py-1">
                  <div class="col-4">
                    <div class="glass-panel p-1 pt-2 border-0 shadow-sm h-100 d-flex flex-column align-items-center text-center">
                       <span class="material-symbols-outlined text-primary mb-1" style="font-size: 14px;">filter_alt</span>
                       <div class="text-xs-caps text-on-surface fw-bold mb-1" style="font-size: 5px;">BLOOM FILTER</div>
                       <p class="text-on-surface-variant m-0 lh-sm" style="font-size: 0.5rem; opacity: 0.8;">Millions of records verified in ms.</p>
                    </div>
                  </div>
                  <div class="col-4">
                    <div class="glass-panel p-1 pt-2 border-0 shadow-sm h-100 d-flex flex-column align-items-center text-center">
                       <span class="material-symbols-outlined text-success mb-1" style="font-size: 14px;">shield_person</span>
                       <div class="text-xs-caps text-on-surface fw-bold mb-1" style="font-size: 5px;">K-ANONYMITY</div>
                       <p class="text-on-surface-variant m-0 lh-sm" style="font-size: 0.5rem; opacity: 0.8;">Secure password audits via hashing.</p>
                    </div>
                  </div>
                  <div class="col-4">
                    <div class="glass-panel p-1 pt-2 border-0 shadow-sm h-100 d-flex flex-column align-items-center text-center">
                       <span class="material-symbols-outlined text-warning mb-1" style="font-size: 14px;">map</span>
                       <div class="text-xs-caps text-on-surface fw-bold mb-1" style="font-size: 5px;">GLOBAL INTEL</div>
                       <p class="text-on-surface-variant m-0 lh-sm" style="font-size: 0.5rem; opacity: 0.8;">Real-time geospatial breach tracking.</p>
                    </div>
                  </div>
               </div>

               <div class="d-flex justify-content-center gap-3 pb-1">
                  <a routerLink="/auth/login" class="btn btn-primary btn-sm rounded-pill px-4" style="font-size: 9px; height: 32px; display: flex; align-items: center;">SIGN IN</a>
                  <a routerLink="/auth/register" class="btn btn-dark btn-sm rounded-pill px-4 fw-bold" style="font-size: 9px; height: 32px; border: 1px solid var(--outline-variant); display: flex; align-items: center;">REGISTER</a>
               </div>
            </div>
          }
        </div>
      </div>

      <!-- Floating KPI Row -->
      <div class="floating-kpi-container">
        <div class="floating-kpi-card border-start border-primary border-4">
          <div class="text-xs-caps text-on-surface-variant mb-1" style="font-size: 7px;">Total Breaches</div>
          <div class="fs-4 fw-bold text-primary font-headline">{{ summary?.total_breaches | number }}</div>
          <div class="text-xs-caps mt-1 d-flex align-items-center gap-1" style="font-size: 6px;" [class.animate-pulse]="health.isBackendReady()">
            <span class="rounded-circle" [ngClass]="health.isBackendReady() ? 'bg-success' : 'bg-error'" style="width: 4px; height: 4px; display: block;"></span>
            <span [ngClass]="health.isBackendReady() ? 'text-success' : 'text-error'" class="fw-bold">{{ health.isBackendReady() ? 'LIVE FEED' : 'OFFLINE' }}</span>
          </div>
        </div>

        <div class="floating-kpi-card border-start border-error border-4 cursor-pointer card-interactive" (click)="toggleAlerts()">
          <div class="text-xs-caps text-on-surface-variant mb-1" style="font-size: 7px;">Open Alerts</div>
          <div class="fs-4 fw-bold text-error font-headline">{{ summary?.open_alerts ?? 0 }}</div>
          <div class="text-xs-caps text-error mt-1 fw-bold" style="font-size: 6px;">ACTION REQUIRED</div>
        </div>

        <div class="floating-kpi-card border-start border-warning border-4">
          <div class="text-xs-caps text-on-surface-variant mb-1" style="font-size: 7px;">Avg Risk</div>
          <div class="fs-4 fw-bold font-headline" [ngClass]="summary?.avg_risk_score | riskLevel:'class'">
            {{ summary?.avg_risk_score | number:'1.1-1' }}
          </div>
          <div class="text-xs-caps mt-1" style="font-size: 6px;">{{ summary?.avg_risk_score | riskLevel }}</div>
        </div>

        <div class="floating-kpi-card border-start border-4 d-none d-xl-block" [ngClass]="health.isBackendReady() ? 'border-success' : 'border-error'">
          <div class="text-xs-caps text-on-surface-variant mb-1" style="font-size: 7px;">Systems</div>
          <div class="fs-4 fw-bold font-headline" [ngClass]="health.isBackendReady() ? 'text-success' : 'text-error'">
            {{ health.isBackendReady() ? 'NOMINAL' : 'DOWN' }}
          </div>
          <div class="text-xs-caps mt-1 opacity-50" style="font-size: 6px;">HEALTH: {{ health.isBackendReady() ? '99.8%' : '0.0%' }}</div>
        </div>
      </div>

      <!-- Right Analytics Stack -->
      <div class="floating-analytics-panel">
        <!-- Severity -->
        <div class="glass-panel p-4 shadow-lg d-flex flex-column" style="height: 220px;">
          <h5 class="text-xs-caps mb-3 d-flex justify-content-between align-items-center text-on-surface" style="font-size: 8px;">
            <span>Severity Breakdown</span>
            @if (auth.isAuthenticated() && personalExposure?.exposed) {
              <span class="badge rounded-pill bg-error bg-opacity-10 text-error border border-error border-opacity-10 px-2 py-1 animate__animated animate__pulse animate__infinite"
                    style="font-size: 6px; letter-spacing: 0.05em;">
                MAGNITUDE: {{ personalExposure.aggregated_risk_score | number:'1.1-1' }}
              </span>
            }
          </h5>
          <div class="d-flex align-items-center gap-3 flex-grow-1">
             <div style="width: 100px; height: 100px; flex-shrink: 0;">
                <canvas #severityChart></canvas>
             </div>
             <div class="flex-grow-1 d-flex flex-column gap-1">
                @for (item of severityData; track item.severity) {
                   <div class="d-flex justify-content-between align-items-center cursor-pointer hover-bg-surface-container-highest rounded px-1" (click)="filterBySeverity(item.severity)">
                      <div class="d-flex align-items-center gap-2">
                         <span class="p-1 rounded-circle shadow-sm" [ngClass]="'bg-' + getSevColor(item.severity)" style="width: 6px; height: 6px;"></span>
                         <span class="text-xs-caps text-on-surface opacity-75" style="font-size: 7px;">{{ item.severity | uppercase }}</span>
                         @if (auth.isAuthenticated() && personalSeverityMap[item.severity.toLowerCase()]) {
                           <span class="p-1 rounded-circle bg-error animate-pulse shadow-lg" style="width: 4px; height: 4px;" title="Personal Exposure Detected"></span>
                         }
                      </div>
                      <span class="text-on-surface font-mono fw-bold" style="font-size: 9px;">{{ item.breach_count | number }}</span>
                   </div>
                }
             </div>
          </div>
        </div>

        <!-- Dynamic Panel (Attack Surface / Recent) -->
        <div class="glass-panel p-4 shadow-lg flex-grow-1 overflow-hidden d-flex flex-column">
          <h5 class="text-xs-caps mb-3 d-flex justify-content-between flex-shrink-0 text-on-surface" style="font-size: 8px;">
            <span>{{ auth.isAnalyst() ? 'Attack Surface' : 'Live Incursions' }}</span>
            <span class="p-1 rounded-circle" [ngClass]="health.isBackendReady() ? 'bg-success animate-pulse' : 'bg-error'" style="width: 6px; height: 6px;"></span>
          </h5>

          <div class="flex-grow-1 overflow-auto custom-scrollbar-hidden pe-1">
            <!-- Analyst View -->
            @if (auth.isAnalyst() && attackSurface) {
              <div class="d-flex flex-column gap-2">
                @for (dt of attackSurface.top_data_types | slice:0:4; track dt.data_type; let i = $index) {
                   <div class="p-2 rounded bg-surface-container-high border border-outline-variant border-opacity-10 shadow-sm transition-all hover-glow cursor-pointer"
                        (click)="filterByDataType(dt.data_type)">
                      <div class="d-flex justify-content-between mb-1">
                         <span class="text-xs-caps text-on-surface opacity-75" style="font-size: 7px;">{{ dt.data_type.split('_').join(' ') | uppercase }}</span>
                         <span class="text-xs-caps fw-bold" [ngClass]="getVaryingColorClass(i)" style="font-size: 7px;">{{ dt.count | compactNumber }}</span>
                      </div>
                      <div class="progress bg-white bg-opacity-5" style="height: 2px;">
                         <div class="progress-bar" [ngClass]="getVaryingBgClass(i)" [style.width.%]="(dt.count / attackSurface.overview.total_records_exposed) * 100"></div>
                      </div>
                   </div>
                }
                <div class="mt-1 p-3 border border-warning border-opacity-50 bg-warning bg-opacity-10 rounded text-center shadow-sm cursor-pointer card-interactive"
                     (click)="navigateToAlerts()">
                   <div class="text-xs-caps text-warning mb-1 fw-extrabold" style="font-size: 8px; letter-spacing: 0.15em;">UNACKNOWLEDGED ALERTS</div>
                   <div class="fs-4 fw-bold text-warning font-headline" style="text-shadow: 0 0 10px color-mix(in srgb, var(--warning) 30%, transparent);">{{ attackSurface.alert_pressure.unacknowledged_alerts }}</div>
                </div>
              </div>
            } @else {
              <div class="d-flex flex-column gap-2">
                @for (b of recentBreaches; track b._id; let i = $index) {
                  <div class="p-2 rounded bg-surface-container-high border border-outline-variant border-opacity-10 shadow-sm transition-all hover-glow cursor-pointer" [routerLink]="['/breaches', b._id]">
                     <div class="d-flex justify-content-between align-items-start mb-1">
                        <div class="fw-bold text-on-surface text-truncate pe-2" style="font-size: 9px;">{{ b.title }}</div>
                        <span class="text-xs-caps fw-bold" [ngClass]="'text-' + getSevColor(b.severity)" style="font-size: 6px;">{{ b.severity | uppercase }}</span>
                     </div>
                     <div class="text-xs-caps text-on-surface opacity-50" style="font-size: 6px;">REF: {{ getOrgName(b) | uppercase }}</div>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <!-- Mini Trend (Simplified for Floating) -->
        <div class="glass-panel p-4 shadow-lg d-flex flex-column" [style.height]="selectedMonth !== null ? 'auto' : '180px'" style="transition: height 0.3s ease;">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h5 class="text-xs-caps m-0 text-on-surface" style="font-size: 8px;">Propagation </h5>
            <div class="d-flex gap-2 align-items-center">
               <span class="text-xs-caps text-on-surface opacity-50" style="font-size: 6px;">YEAR</span>
               <select class="bg-transparent border-0 text-xs-caps text-primary p-0 fw-bold" style="font-size: 8px; cursor: pointer;" [(ngModel)]="selectedYear" (change)="onYearChange()">
                  @for (y of availableYears; track y) { <option [value]="y">{{ y }}</option> }
               </select>
            </div>
          </div>
          <div [style.height]="selectedMonth !== null ? '120px' : '100px'">
            <canvas #trendChart></canvas>
          </div>

          <!-- Integrated Monthly Details -->
          @if (selectedMonth !== null) {
            <div class="mt-3 pt-3 border-top border-outline-variant border-opacity-10 animate__animated animate__fadeIn">
               <div class="d-flex justify-content-between align-items-center mb-2">
                  <span class="text-xs-caps text-primary fw-bold" style="font-size: 8px;">{{ monthNames[selectedMonth] }} INTEL</span>
                  <button class="btn-close-tactical" (click)="selectedMonth = null">
                    <span class="material-symbols-outlined">close</span>
                  </button>
               </div>

               <div class="overflow-auto custom-scrollbar" style="max-height: 200px;">
                  @if (monthLoading) {
                    <div class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary"></div></div>
                  } @else {
                    <div class="list-group list-group-flush">
                      @for (b of monthBreaches; track b._id) {
                        <div class="list-group-item bg-transparent border-0 px-0 py-2" [routerLink]="['/breaches', b._id]" style="cursor: pointer;">
                          <div class="fw-bold text-on-surface small" style="font-size: 9px; line-height: 1.2;">{{ b.title }}</div>
                          <div class="text-xs-caps text-on-surface opacity-50" style="font-size: 6px;">{{ getOrgName(b) | uppercase }}</div>
                        </div>
                      }
                      @if (monthBreaches.length === 0) {
                        <div class="text-center py-3 text-on-surface opacity-25 text-xs-caps" style="font-size: 7px;">NO DATA</div>
                      }
                    </div>
                  }
               </div>
            </div>
          }
        </div>
      </div>

      <!-- Alerts Overlay Panel -->
      <div class="alerts-overlay-backdrop" [class.active]="showAlerts()" (click)="showAlerts.set(false)"></div>
      <aside class="alerts-overlay-panel glass-panel shadow-lg" [class.active]="showAlerts()">
        <div class="p-4 border-bottom border-outline-variant border-opacity-10 d-flex justify-content-between align-items-center" style="height: 80px;">
          <div class="d-flex flex-column justify-content-center">
            <h3 class="text-xs-caps text-error mb-1" style="font-size: 8px; line-height: 1;">OPEN ALERTS</h3>
            <div class="text-on-surface-variant" style="font-size: 7px; line-height: 1;">UNACKNOWLEDGED EVENTS</div>
          </div>
          <button class="btn-close-tactical" (click)="showAlerts.set(false)">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="feed-content custom-scrollbar p-3">
          @if (loadingAlerts) {
            <div class="text-center py-5">
              <div class="spinner-border spinner-border-sm text-primary"></div>
            </div>
          } @else if (openAlerts.length === 0) {
            <div class="text-center py-5 opacity-50">
              <span class="material-symbols-outlined fs-1 mb-2">check_circle</span>
              <p class="text-xs-caps" style="font-size: 7px;">ALL EVENTS RESOLVED</p>
            </div>
          } @else {
            @for (b of openAlerts; track b._id) {
              <div class="glass-panel p-3 mb-3 border-0 border-start border-4 border-error shadow-sm card-interactive" (click)="navigateToBreach(b._id)">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <span class="text-xs-caps fw-bold text-error" style="font-size: 7px;">CRITICAL EVENT</span>
                  <span class="text-xs-caps opacity-50" style="font-size: 6px;">{{ b.breach_date | date:'MMM dd' }}</span>
                </div>
                <div class="text-on-surface fw-bold mb-1" style="font-size: 10px;">{{ b.title }}</div>
                <div class="text-xs-caps text-on-surface-variant opacity-75" style="font-size: 6px;">{{ b.industry.split('_').join(' ') | uppercase }} SECTOR</div>
                <div class="mt-3 d-flex justify-content-center">
                   <button class="btn btn-primary w-100 py-0 d-flex align-items-center justify-content-center text-xs-caps fw-bold" style="font-size: 7px; height: 24px;">VIEW DETAILS</button>
                </div>
              </div>
            }
          }
        </div>
      </aside>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .alerts-overlay-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(4px);
      z-index: 2000;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }
    .alerts-overlay-backdrop.active { opacity: 1; pointer-events: auto; }

    .alerts-overlay-panel {
      position: fixed;
      top: 1rem;
      right: 1rem;
      bottom: 1rem;
      width: 320px;
      z-index: 2100;
      display: flex;
      flex-direction: column;
      transform: translateX(calc(100% + 2rem));
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      border: 1px solid var(--outline-variant) !important;
      border-radius: 1rem;
      overflow: hidden;
      background: var(--surface-container-low) !important;
    }
    .alerts-overlay-panel.active { transform: translateX(0); }

    .feed-content { flex-grow: 1; overflow-y: auto; }
    .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }

    .custom-scrollbar-hidden::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar-hidden::-webkit-scrollbar-thumb { background: transparent; border-radius: 10px; }
    .custom-scrollbar-hidden:hover::-webkit-scrollbar-thumb { background: var(--outline-variant); }


    .hover-glow:hover {
       background-color: var(--surface-container-highest) !important;
       border-color: var(--primary) !important;
       border-opacity: 0.3 !important;
       transform: translateX(4px);
    }

    .personal-risk-card {
       pointer-events: auto;
       height: 174px; /* Matches guest-hero-card */
       display: flex;
       flex-direction: column;
       justify-content: space-between;
       overflow: hidden;
       border: 1px solid color-mix(in srgb, var(--error) 25%, var(--outline-variant)) !important;
       background: var(--surface-container) !important;
       backdrop-filter: blur(24px) saturate(180%) !important;
       box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3) !important;
       border-radius: 1.25rem !important;
    }

    .card-interactive:hover {
       transform: translateY(-4px);
       border-color: var(--warning) !important;
    }
  `]
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('severityChart')  severityChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('trendChart')     trendChartRef!: ElementRef<HTMLCanvasElement>;

  private analytics = inject(AnalyticsService);
  private breachService = inject(BreachService);
  private notifications = inject(NotificationService);
  private themeService = inject(ThemeService);
  private router = inject(Router);
  public health = inject(HealthService);
  auth = inject(AuthService);

  summary: AnalyticsSummary | null = null;
  severityData: SeverityBreakdown[] = [];
  trendData: MonthlyTrend[] = [];
  recentBreaches: Breach[] = [];
  attackSurface: AttackSurfaceProfile | null = null;
  personalExposure: any = null;
  personalSeverityMap: Record<string, boolean> = {};
  loadingPersonal = false;
  showAlerts = signal(false);
  openAlerts: any[] = [];
  loadingAlerts = false;

  displayYear = new Date().getFullYear();
  selectedYear = new Date().getFullYear();
  availableYears: number[] = [];

  selectedMonth: number | null = null;
  monthBreaches: Breach[] = [];
  monthLoading = false;
  monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

  private charts: any[] = [];
  private viewReady = false;

  private _authWatcher = effect(() => {
    // React to role changes from AuthService signals
    this.auth.isAnalyst();
    this.loadData();
  });

  private _themeWatcher = effect(() => {
    this.themeService.theme();
    if (this.viewReady) this.renderAllCharts();
  });

  ngOnInit(): void {
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 5; i++) {
      this.availableYears.push(currentYear - i);
    }
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.renderAllCharts();
  }

  ngOnDestroy(): void {
    this.charts.forEach((c) => c?.destroy());
  }

  private loadData(): void {
    this.analytics.getSummary().subscribe({
      next: (res) => this.summary = res.data,
      error: () => this.notifications.show('FAILED TO LOAD METRICS', 'error')
    });

    this.analytics.getSeverityBreakdown().subscribe(res => {
      this.severityData = res.data;
      if (this.viewReady) this.renderSeverity();
    });

    this.loadMonthlyTrend(this.selectedYear, true);

    if (this.auth.isAuthenticated()) {
      this.loadPersonalExposure();
    }

    if (this.auth.isAnalyst()) {
       this.analytics.getAttackSurfaceProfile().subscribe({
         next: (res) => {
           this.attackSurface = res.data;
           if (!this.attackSurface || !this.attackSurface.top_data_types.length) {
             this.loadRecentBreaches();
           }
         },
         error: () => this.loadRecentBreaches()
       });
    } else {
       this.loadRecentBreaches();
    }
  }

  private loadRecentBreaches(): void {
    this.breachService.getBreaches({ limit: 10 }).subscribe(res => {
       this.recentBreaches = res.data;
    });
  }

  private loadPersonalExposure(): void {
    const user = this.auth.currentUser();
    if (!user?.email) return;

    this.loadingPersonal = true;
    this.breachService.checkExposure(user.email).subscribe({
      next: (res) => {
        this.personalExposure = res.data;
        this.loadingPersonal = false;
        this.calculatePersonalSeverityMap();
      },
      error: () => {
        this.loadingPersonal = false;
      }
    });
  }

  private calculatePersonalSeverityMap(): void {
    this.personalSeverityMap = {};
    if (!this.personalExposure?.breaches) return;

    this.personalExposure.breaches.forEach((b: any) => {
      const sev = b.severity?.toLowerCase();
      if (sev) this.personalSeverityMap[sev] = true;
    });
  }

  navigateToBreach(id: string): void {
    this.showAlerts.set(false);
    this.router.navigate(['/breaches', id]);
  }

  toggleAlerts(): void {
    const nextState = !this.showAlerts();
    this.showAlerts.set(nextState);
    if (nextState) {
      this.loadOpenAlerts();
    }
  }

  private loadOpenAlerts(): void {
    this.loadingAlerts = true;
    this.breachService.querySubdocuments({ alert_acknowledged: false, limit: 50 }).subscribe({
      next: (res) => {
        this.openAlerts = res.data;
        this.loadingAlerts = false;
      },
      error: () => {
        this.loadingAlerts = false;
        this.notifications.show('FAILED TO RETRIEVE ALERTS', 'error');
      }
    });
  }

  private loadMonthlyTrend(year: number, autoFallback = false): void {
    this.analytics.getMonthlyTrend(year).subscribe(res => {
      const data = Array.isArray(res.data) ? res.data : [];
      if (data.length > 0) {
        this.trendData = data;
        this.displayYear = year;
        this.selectedYear = year;
        if (this.viewReady) this.renderTrend();
      } else if (autoFallback) {
        const prevYear = year - 1;
        this.analytics.getMonthlyTrend(prevYear).subscribe(prevRes => {
          this.trendData = Array.isArray(prevRes.data) ? prevRes.data : [];
          this.displayYear = prevYear;
          this.selectedYear = prevYear;
          if (this.viewReady) this.renderTrend();
        });
      } else {
        this.trendData = [];
        this.displayYear = year;
        if (this.viewReady) this.renderTrend();
      }
    });
  }

  onYearChange(): void {
    this.selectedMonth = null;
    this.loadMonthlyTrend(Number(this.selectedYear));
  }

  filterByDataType(type: string): void {
    this.router.navigate(['/breaches'], { queryParams: { data_type: type } });
    this.notifications.show(`FILTERING BY: ${type.split('_').join(' ').toUpperCase()}`, 'info', 2000);
  }

  filterBySeverity(sev: string): void {
    this.router.navigate(['/breaches'], { queryParams: { severity: sev } });
    this.notifications.show(`FILTERING BY SEVERITY: ${sev.toUpperCase()}`, 'info', 2000);
  }

  navigateToAlerts(): void {
    if (this.auth.isAdmin()) {
      this.router.navigate(['/admin'], { queryParams: { tab: 'manage', status: 'active' } });
    } else {
      this.router.navigate(['/breaches'], { queryParams: { status: 'active' } });
    }
  }

  private fetchMonthDetails(monthIndex: number): void {
    this.selectedMonth = monthIndex;
    this.monthLoading = true;
    this.monthBreaches = [];

    const fromDate = `${this.displayYear}-${String(monthIndex + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(this.displayYear, monthIndex + 1, 0).getDate();
    const toDate = `${this.displayYear}-${String(monthIndex + 1).padStart(2, '0')}-${lastDay}`;

    this.breachService.getAdvancedSearch({
      from_date: fromDate,
      to_date: toDate,
      limit: 20,
      sort_by: 'risk_score',
      order: 'desc'
    }).subscribe({
      next: (res) => {
        this.monthBreaches = res.data;
        this.monthLoading = false;
      },
      error: () => {
        this.monthLoading = false;
        this.notifications.show('FAILED TO RETRIEVE MONTHLY INTEL', 'error');
      }
    });
  }

  private renderAllCharts(): void {
    if (this.severityData.length) this.renderSeverity();
    if (this.trendData.length) this.renderTrend();
  }

  private async getChart() {
    const mod = await import('chart.js/auto');
    return mod.default;
  }

  private async renderSeverity() {
    if (!this.severityChartRef) return;
    const Chart = await this.getChart();
    const style = getComputedStyle(document.documentElement);
    this.charts[0]?.destroy();
    this.charts[0] = new Chart(this.severityChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: this.severityData.map(d => d.severity),
        datasets: [{
          data: this.severityData.map(d => d.breach_count),
          backgroundColor: this.severityData.map(d => {
            const s = d.severity?.toLowerCase();
            if (s === 'critical') return style.getPropertyValue('--severity-critical').trim();
            if (s === 'high') return style.getPropertyValue('--severity-high').trim();
            if (s === 'medium') return style.getPropertyValue('--severity-medium').trim();
            if (s === 'low') return style.getPropertyValue('--severity-low').trim();
            return style.getPropertyValue('--severity-info').trim();
          }),
          borderWidth: 0
        }]
      },
      options: {
        cutout: '80%',
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }

  private async renderTrend() {
    if (!this.trendChartRef) return;
    const Chart = await this.getChart();
    const style = getComputedStyle(document.documentElement);
    this.charts[1]?.destroy();

    const monthsData = new Array(12).fill(0);
    this.trendData.forEach(d => {
      if (d.month >= 1 && d.month <= 12) {
        monthsData[d.month - 1] = d.count;
      }
    });

    const maxCount = Math.max(...monthsData, 1);

    // Map values to tactical "heat" colors
    const backgroundColors = monthsData.map(val => {
      const ratio = val / maxCount;
      if (ratio > 0.8) return style.getPropertyValue('--severity-critical').trim(); // Severe spike
      if (ratio > 0.5) return style.getPropertyValue('--warning').trim();           // High activity
      if (ratio > 0.2) return style.getPropertyValue('--primary').trim();           // Normal flow
      return style.getPropertyValue('--success').trim();                            // Low/Nominal
    });

    this.charts[1] = new Chart(this.trendChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
        datasets: [{
          data: monthsData,
          backgroundColor: backgroundColors,
          borderWidth: 0,
          borderRadius: 4,
          hoverBackgroundColor: style.getPropertyValue('--secondary').trim()
        }]
      },
      options: {
        onClick: (evt, elements) => {
          if (elements.length > 0) {
            const monthIndex = elements[0].index;
            this.fetchMonthDetails(monthIndex);
          }
        },
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.9)',
            titleFont: { family: 'JetBrains Mono', size: 10 },
            bodyFont: { family: 'Inter', size: 11 },
            displayColors: false
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: style.getPropertyValue('--on-surface-variant'), font: { size: 9, family: 'Inter' } }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: style.getPropertyValue('--on-surface-variant'), font: { size: 9 } }
          }
        }
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

  getVaryingColorClass(i: number): string {
    const classes = ['text-primary', 'text-secondary', 'text-warning'];
    return classes[i % classes.length];
  }

  getVaryingBgClass(i: number): string {
    const classes = ['bg-primary', 'bg-secondary', 'bg-warning'];
    return classes[i % classes.length];
  }
}
