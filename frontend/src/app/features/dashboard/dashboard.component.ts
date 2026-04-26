import {
  Component, OnInit, OnDestroy, inject,
  ElementRef, ViewChild, AfterViewInit, effect
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass, DecimalPipe, PercentPipe, CommonModule, DatePipe } from '@angular/common';
import { AnalyticsService } from '../../core/services/analytics.service';
import { BreachService } from '../../core/services/breach.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { ThemeService } from '../../core/services/theme.service';
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
    <div class="row g-4 mb-4 mt-2">
      <!-- KPI Row -->
      <div class="col-md-3">
        <div class="glass-panel p-4 shadow-lg h-100 border-start border-primary border-4">
          <div class="text-xs-caps text-on-surface-variant mb-1">Total Breaches</div>
          <div class="fs-2 fw-bold text-primary font-headline">{{ summary?.total_breaches | number }}</div>
          <div class="text-xs-caps mt-2 animate-pulse" style="font-size: 8px;">
            <span class="p-1 bg-success rounded-circle me-1" style="width: 6px; height: 6px; display: inline-block;"></span>
            <span class="text-success fw-bold">LIVE FEED ACTIVE</span>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="glass-panel p-4 shadow-lg h-100 border-start border-error border-4">
          <div class="text-xs-caps text-on-surface-variant mb-1">Open Alerts</div>
          <div class="fs-2 fw-bold text-error font-headline">{{ summary?.open_alerts ?? 0 }}</div>
          <div class="text-xs-caps text-error mt-2 fw-bold" style="font-size: 8px;">IMMEDIATE ACTION REQUIRED</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="glass-panel p-4 shadow-lg h-100 border-start border-warning border-4">
          <div class="text-xs-caps text-on-surface-variant mb-1">Avg Risk Index</div>
          <div class="fs-2 fw-bold font-headline" [ngClass]="summary?.avg_risk_score | riskLevel:'class'">
            {{ summary?.avg_risk_score | number:'1.1-1' }}
          </div>
          <div class="text-xs-caps mt-2" style="font-size: 8px;">{{ summary?.avg_risk_score | riskLevel }}</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="glass-panel p-4 shadow-lg h-100 border-start border-success border-4">
          <div class="text-xs-caps text-on-surface-variant mb-1">Operational Health</div>
          <div class="fs-2 fw-bold text-success font-headline">99.8%</div>
          <div class="text-xs-caps mt-2 opacity-50" style="font-size: 8px;">ENCRYPTION NOMINAL</div>
        </div>
      </div>

      <!-- Main Map Panel -->
      <div class="col-lg-8">
        <div class="glass-panel p-3 shadow-lg d-flex flex-column" style="height: 480px;">
          <div class="d-flex justify-content-between align-items-center mb-3 px-2 flex-shrink-0">
            <h5 class="text-xs-caps m-0">Global Incursion Telemetry</h5>
            <span class="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 py-1 px-2 text-xs-caps" style="font-size: 8px;">2D GRID ACTIVE</span>
          </div>
          <div class="flex-grow-1 position-relative overflow-hidden" style="border-radius: 1rem;">
            <app-breach-map height="100%" />
          </div>
        </div>
      </div>

      <!-- Analytics Side Panel -->
      <div class="col-lg-4 d-flex flex-column gap-4">
        <!-- Severity Breakdown -->
        <div class="glass-panel p-4 shadow-lg" style="height: 230px;">
          <h5 class="text-xs-caps mb-3">Severity Breakdown</h5>
          <div class="h-100 pb-4">
            <canvas #severityChart></canvas>
          </div>
        </div>

        <!-- Dynamic Panel -->
        <div class="glass-panel p-4 shadow-lg flex-grow-1 overflow-hidden d-flex flex-column" style="height: 226px;">
          <h5 class="text-xs-caps mb-3 d-flex justify-content-between flex-shrink-0">
            <span>{{ isAnalyst ? 'Attack Surface Profile' : 'Live Incursion Feed' }}</span>
            <span class="p-1 bg-success rounded-circle animate-pulse" style="width: 8px; height: 8px; display: inline-block;"></span>
          </h5>

          <!-- Analyst View -->
          <div *ngIf="isAnalyst && attackSurface" class="flex-grow-1 overflow-auto custom-scrollbar pe-1">
             <div class="d-flex flex-column gap-3">
                <div *ngFor="let dt of attackSurface.top_data_types | slice:0:3; let i = index">
                   <div class="d-flex justify-content-between mb-1">
                      <span class="text-xs-caps opacity-75" style="font-size: 8px;">{{ dt.data_type.split('_').join(' ') | uppercase }}</span>
                      <span class="text-xs-caps fw-bold" [ngClass]="getVaryingColorClass(i)" style="font-size: 8px;">{{ dt.count }} RECORDS</span>
                   </div>
                   <div class="progress bg-white bg-opacity-5" style="height: 2px;">
                      <div class="progress-bar" [ngClass]="getVaryingBgClass(i)" [style.width.%]="(dt.count / attackSurface.overview.breach_count) * 100"></div>
                   </div>
                </div>
                <!-- UNACKNOWLEDGED ALERTS UI BOX -->
                <div class="mt-2 p-2 border border-warning border-opacity-30 bg-warning bg-opacity-10 rounded text-center">
                   <div class="text-xs-caps text-warning mb-1" style="font-size: 9px; font-weight: 800; letter-spacing: 0.1em;">UNACKNOWLEDGED ALERTS</div>
                   <div class="fs-4 fw-bold text-warning font-headline">{{ attackSurface.alert_pressure.unacknowledged_alerts }}</div>
                </div>
             </div>
          </div>

          <!-- Guest/Fallback View -->
          <div *ngIf="!isAnalyst || !attackSurface" class="flex-grow-1 overflow-auto custom-scrollbar">
             <div class="list-group list-group-flush">
                <div *ngFor="let b of recentBreaches; let i = index" class="list-group-item bg-transparent border-outline-variant border-opacity-10 px-0 py-2 border-0" [routerLink]="['/breaches', b._id]" style="cursor: pointer;">
                   <div class="d-flex justify-content-between align-items-start">
                      <div class="fw-bold" [ngClass]="i % 2 === 0 ? 'text-on-surface' : 'text-secondary'" style="font-size: 10px;">{{ b.title | slice:0:30 }}{{ b.title.length > 30 ? '...' : '' }}</div>
                      <span class="text-xs-caps" [ngClass]="'text-' + getSevColor(b.severity)" style="font-size: 7px;">{{ b.severity | uppercase }}</span>
                   </div>
                   <div class="text-xs-caps opacity-50" style="font-size: 7px;">{{ getOrgName(b) | uppercase }} // {{ b.breach_date | date:'yyyy.MM' }}</div>
                </div>
             </div>
          </div>
        </div>
      </div>

      <!-- Trend Row -->
      <div class="col-12">
        <div class="glass-panel p-4 shadow-lg overflow-hidden" [style.height]="selectedMonth !== null ? 'auto' : '360px'">
          <div class="row h-100">
            <!-- Chart Side -->
            <div [ngClass]="selectedMonth !== null ? 'col-lg-8 border-end border-outline-variant border-opacity-10' : 'col-12'">
              <div class="d-flex justify-content-between align-items-center mb-4">
                <h5 class="text-xs-caps m-0">Monthly Propagation Index ({{ displayYear }})</h5>
                <div class="d-flex align-items-center gap-3">
                  <span class="text-xs-caps opacity-50 d-none d-sm-inline" style="font-size: 8px;">CLICK BAR FOR INTEL</span>
                  <div class="d-flex align-items-center gap-2">
                    <span class="text-xs-caps opacity-50" style="font-size: 8px;">YEAR</span>
                    <select class="form-select form-select-sm bg-surface-container border-outline-variant border-opacity-25 text-xs-caps"
                            style="width: auto; font-size: 10px; height: 28px;"
                            [(ngModel)]="selectedYear" (change)="onYearChange()">
                      <option *ngFor="let y of availableYears" [value]="y">{{ y }}</option>
                    </select>
                  </div>
                </div>
              </div>
              <div style="height: 250px;">
                <canvas #trendChart></canvas>
              </div>
            </div>

            <!-- List Side (Conditional) -->
            <div class="col-lg-4 animate__animated animate__fadeInRight" *ngIf="selectedMonth !== null">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="text-xs-caps m-0 text-primary">{{ monthNames[selectedMonth] }} Intelligence</h5>
                <button class="btn-close-tactical" (click)="selectedMonth = null">
                  <span class="material-symbols-outlined">close</span>
                </button>
              </div>

              <div class="overflow-auto custom-scrollbar" style="max-height: 280px;">
                @if (monthLoading) {
                  <div class="text-center py-5"><div class="spinner-border spinner-border-sm text-primary"></div></div>
                } @else {
                  <div class="list-group list-group-flush">
                    @for (b of monthBreaches; track b._id) {
                      <div class="list-group-item bg-transparent border-outline-variant border-opacity-10 px-0 py-2" [routerLink]="['/breaches', b._id]" style="cursor: pointer;">
                        <div class="fw-bold text-on-surface" style="font-size: 10px;">{{ b.title }}</div>
                        <div class="d-flex justify-content-between align-items-center mt-1">
                          <span class="text-xs-caps opacity-50" style="font-size: 7px;">{{ getOrgName(b) | uppercase }}</span>
                          <span class="badge text-xs-caps" [ngClass]="'bg-' + getSevColor(b.severity)" style="font-size: 6px; padding: 2px 4px;">{{ b.severity | uppercase }}</span>
                        </div>
                      </div>
                    }
                    @if (monthBreaches.length === 0) {
                      <div class="text-center py-4 opacity-25 text-xs-caps" style="font-size: 9px;">NO DATA CAPTURED FOR THIS PERIOD</div>
                    }
                  </div>
                }
              </div>
              <div class="mt-3 pt-2 border-top border-outline-variant border-opacity-10">
                <a routerLink="/breaches" class="text-xs-caps text-primary text-decoration-none d-flex align-items-center gap-2" style="font-size: 8px;">
                  ACCESS FULL REPOSITORY <span class="material-symbols-outlined fs-6">arrow_forward</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
    .custom-scrollbar::-webkit-scrollbar { width: 3px; }
  `]
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('severityChart')  severityChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('trendChart')     trendChartRef!: ElementRef<HTMLCanvasElement>;

  private analytics = inject(AnalyticsService);
  private breachService = inject(BreachService);
  private notifications = inject(NotificationService);
  private themeService = inject(ThemeService);
  auth = inject(AuthService);

  summary: AnalyticsSummary | null = null;
  severityData: SeverityBreakdown[] = [];
  trendData: MonthlyTrend[] = [];
  recentBreaches: Breach[] = [];
  attackSurface: AttackSurfaceProfile | null = null;
  isAnalyst = false;

  displayYear = new Date().getFullYear();
  selectedYear = new Date().getFullYear();
  availableYears: number[] = [];

  selectedMonth: number | null = null;
  monthBreaches: Breach[] = [];
  monthLoading = false;
  monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

  private charts: any[] = [];
  private viewReady = false;

  private _themeWatcher = effect(() => {
    this.themeService.theme();
    if (this.viewReady) this.renderAllCharts();
  });

  ngOnInit(): void {
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 5; i++) {
      this.availableYears.push(currentYear - i);
    }

    this.isAnalyst = this.auth.isAnalyst();
    this.loadData();
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

    if (this.isAnalyst) {
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
          backgroundColor: [
            style.getPropertyValue('--severity-critical').trim(),
            style.getPropertyValue('--severity-high').trim(),
            style.getPropertyValue('--severity-medium').trim(),
            style.getPropertyValue('--severity-low').trim(),
            style.getPropertyValue('--severity-info').trim()
          ],
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
    const s = sev?.toLowerCase();
    if (s === 'critical') return 'error';
    if (s === 'high') return 'warning';
    if (s === 'low') return 'primary';
    return 'on-surface-variant';
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
