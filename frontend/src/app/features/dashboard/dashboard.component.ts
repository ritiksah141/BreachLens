import {
  Component, OnInit, OnDestroy, inject,
  ElementRef, ViewChild, AfterViewInit, effect
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass, DecimalPipe, PercentPipe, CommonModule } from '@angular/common';
import { AnalyticsService } from '../../core/services/analytics.service';
import { BreachService } from '../../core/services/breach.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { ThemeService } from '../../core/services/theme.service';
import { AnalyticsSummary, SeverityBreakdown, MonthlyTrend, DataTypeFrequency } from '../../core/models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, NgClass, DecimalPipe, PercentPipe, CommonModule],
  template: `
    <div class="row g-4 mb-4 mt-2">
      <!-- KPI Row -->
      <div class="col-12">
        <div class="row g-4">
          <!-- KPI Card 1: Active Nodes (Total Breaches) -->
          <div class="col-md-3">
            <div class="card p-4 border-0 border-start border-primary border-3 glow-primary h-100 position-relative overflow-hidden">
              <div class="position-absolute top-0 end-0 p-2 opacity-10">
                <span class="material-symbols-outlined fs-1">hub</span>
              </div>
              <div class="d-flex justify-content-between align-items-start mb-2">
                <span class="text-xs-caps text-on-surface-variant">Active Breaches</span>
                <span class="p-1 bg-primary rounded-circle animate-pulse"></span>
              </div>
              <div class="fs-2 fw-bold text-on-surface font-headline">{{ summary?.total_breaches | number }}</div>
              <div class="text-xs-caps fw-bold mt-2" [ngClass]="trendDirection === 'up' ? 'text-primary' : (trendDirection === 'down' ? 'text-tertiary' : 'text-on-surface-variant')">
                <span class="material-symbols-outlined fs-6">{{ trendDirection === 'down' ? 'trending_down' : 'trending_up' }}</span>
                @if (trendDirection === 'flat') {
                  No month-over-month change
                } @else {
                  {{ trendChangePct }}% vs previous month
                }
              </div>
            </div>
          </div>

          <!-- KPI Card 2: Threats Blocked -->
          <div class="col-md-3">
            <div class="card p-4 border-0 border-start border-tertiary border-3 glow-error h-100">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <span class="text-xs-caps text-on-surface-variant">Open Alerts</span>
                <span class="material-symbols-outlined text-tertiary-container fs-6">warning</span>
              </div>
              <div class="fs-2 fw-bold text-on-surface font-headline">{{ summary?.open_alerts ?? 0 }}</div>
              <div class="text-xs-caps text-tertiary-container fw-bold mt-2">
                <span class="material-symbols-outlined fs-6">bolt</span> {{ summary?.active_breaches ?? 0 }} active breach(es)
              </div>
            </div>
          </div>

          <!-- KPI Card 3: Avg Risk Score -->
          <div class="col-md-3">
            <div class="card p-4 border-0 border-start border-secondary border-3 h-100">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <span class="text-xs-caps text-on-surface-variant">Average Risk Score</span>
                <span class="material-symbols-outlined text-secondary fs-6">speed</span>
              </div>
              <div class="fs-2 fw-bold text-on-surface font-headline">{{ summary?.avg_risk_score | number:'1.1-1' }}</div>
              <div class="text-xs-caps text-on-surface-variant mt-2 d-flex align-items-center gap-2">
                <span class="p-1 bg-secondary rounded-circle"></span> Across {{ summary?.industries_affected ?? 0 }} industries
              </div>
            </div>
          </div>

          <!-- KPI Card 4: System Health -->
          <div class="col-md-3">
            <div class="card p-4 border-0 border-start border-outline border-3 h-100">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <span class="text-xs-caps text-on-surface-variant">System Health</span>
                <span class="material-symbols-outlined text-outline fs-6">settings_heart</span>
              </div>
              <div class="fs-2 fw-bold text-on-surface font-headline">{{ systemHealthPct }}%</div>
              <div class="text-xs-caps text-on-surface-variant mt-2">Updated {{ lastUpdated | date:'shortTime' }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Visualization Panel -->
      <div class="col-lg-8">
        <div class="card border-0 bg-surface-container-low position-relative overflow-hidden h-100" style="min-height: 550px;">
          <div class="position-absolute inset-0 opacity-5 pointer-events-none"
               style="background-image: linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px); background-size: 40px 40px;"></div>

          <div class="card-body p-4 position-relative z-1 d-flex flex-column">
            <div class="d-flex justify-content-between align-items-start mb-4">
              <div>
                <h4 class="text-xs-caps text-on-surface d-flex align-items-center gap-2 mb-1">
                  <span class="p-1 bg-primary rounded-circle"></span>
                  Monthly Threat Propagation
                </h4>
                <div class="text-xs-caps text-on-surface-variant opacity-50" style="font-size: 8px;">
                  @if (trendYear) {
                    Data year: {{ trendYear }}
                  } @else {
                    No trend data available
                  }
                </div>
              </div>
              <div class="d-flex gap-2">
                <button
                  class="btn border-0 text-xs-caps py-1 px-3"
                  [ngClass]="trendView === '7d' ? 'btn-primary' : 'btn-dark bg-surface-container-highest'"
                  [disabled]="trendLoading"
                  (click)="setTrendView('7d')"
                >
                    LAST 7
                </button>
                <button
                  class="btn border-0 text-xs-caps py-1 px-3"
                  [ngClass]="trendView === 'historical' ? 'btn-primary' : 'btn-dark bg-surface-container-highest'"
                  [disabled]="trendLoading"
                  (click)="setTrendView('historical')"
                >
                    LAST 12
                </button>
              </div>
            </div>

            <div class="flex-grow-1 position-relative" style="min-height: 300px;">
              <canvas #trendChart></canvas>
              @if (panelErrors['trend']) {
                <div class="position-absolute top-50 start-50 translate-middle text-xs-caps text-on-surface-variant text-center px-3" style="font-size: 9px;">
                  {{ panelErrors['trend'] }}
                </div>
              }
            </div>

            <div class="glass-panel p-3 rounded-3 mt-4 d-flex justify-content-center align-items-center border border-outline-variant border-opacity-10">
              <div class="d-flex gap-4 flex-wrap justify-content-center">
                <div>
                  <div class="text-xs-caps text-on-surface-variant mb-1" style="font-size: 8px;">Intelligence Parameters</div>
                  <div class="fw-bold text-on-surface small">Open alerts: {{ summary?.open_alerts ?? 0 }}</div>
                </div>
                <div>
                  <div class="text-xs-caps text-on-surface-variant mb-1" style="font-size: 8px;">Industry Coverage</div>
                  <div class="fw-bold text-on-surface small">{{ summary?.industries_affected ?? 0 }} active sectors</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Panel: Distribution & Exposure -->
      <div class="col-lg-4 d-flex flex-column gap-4">
        <div class="card border-0 p-4" style="height: 260px;">
          <h4 class="text-xs-caps text-on-surface mb-3">Severity Breakdown</h4>
          <div class="position-relative flex-grow-1" style="min-height: 0;">
            <canvas #severityChart></canvas>
          </div>
        </div>

        <div class="card border-0 p-4" style="height: 260px;">
          <div class="d-flex flex-column h-100">
            <h4 class="text-xs-caps text-on-surface mb-2">Exposure Checker</h4>
            <p class="text-on-surface-variant mb-3" style="font-size: 11px;">Verify domain or identity intrusions</p>

            <div class="input-group mb-3">
              <span class="input-group-text bg-surface-container-low border-0 text-on-surface-variant">
                <span class="material-symbols-outlined fs-6">alternate_email</span>
              </span>
              <input
                #exposureInput
                class="form-control bg-surface-container-low border-0 ps-2 text-on-surface"
                type="text"
                placeholder="Search email, username, or domain..."
                (keyup.enter)="checkExposure(exposureInput.value)"
                style="font-size: 11px;"
              />
              <button
                class="btn btn-primary px-3"
                (click)="checkExposure(exposureInput.value)"
                [disabled]="checkingExposure"
              >
                @if (checkingExposure) {
                  <span class="spinner-border spinner-border-sm"></span>
                } @else {
                  Check
                }
              </button>
            </div>

            @if (exposureResult !== null) {
              <div
                class="p-2 rounded-2 border-start border-3 transition-all animate__animated animate__fadeIn mb-3"
                [ngClass]="exposureResult.exposed ? 'bg-error-container bg-opacity-10 border-error' : 'bg-success-container bg-opacity-10 border-success'"
              >
                @if (exposureResult.exposed) {
                  <div class="text-xs-caps text-error mb-1" style="font-size: 8px;">Critical Alert</div>
                  <div class="text-on-surface fw-bold" style="font-size: 10px;">Found in {{ exposureResult.breach_count }} breach(es)</div>
                } @else {
                  <div class="text-xs-caps text-success mb-1" style="font-size: 8px;">Clear Signal</div>
                  <div class="text-on-surface fw-bold" style="font-size: 10px;">No active intrusions detected</div>
                }
              </div>
            }

            <div class="mt-auto d-flex flex-column gap-2">
              <div class="d-flex justify-content-between align-items-center">
                <span class="text-xs-caps text-on-surface-variant" style="font-size: 8px;">Remediation Rate</span>
                <span class="fw-bold text-primary small">{{ remediationRate | percent }}</span>
              </div>
              <div class="progress bg-surface-container-highest" style="height: 4px;">
                <div class="progress-bar bg-primary" role="progressbar" [style.width.%]="remediationRate * 100"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Secondary Data Row -->
      <div class="col-12 mt-2">
        <div class="row g-4">
          <div class="col-lg-4">
            <div class="card border-0 p-4">
              <h4 class="text-xs-caps text-on-surface mb-4">Risk Distribution</h4>
              <div style="height: 200px;"><canvas #riskChart></canvas></div>
            </div>
          </div>
          <div class="col-lg-4">
            <div class="card border-0 p-4">
              <h4 class="text-xs-caps text-on-surface mb-4">Exposed Data Types</h4>
              <div style="height: 200px;"><canvas #dataTypesChart></canvas></div>
            </div>
          </div>
          <div class="col-lg-4">
            <div class="card border-0 p-4">
              <h4 class="text-xs-caps text-on-surface mb-4">Target Organisations</h4>
              @if (isAnalystUser) {
                <div style="height: 200px;"><canvas #orgChart></canvas></div>
              } @else {
                <div class="d-flex h-100 align-items-center justify-content-center text-center text-on-surface-variant" style="min-height: 200px; font-size: 11px;">
                  Analyst role required for organisation intelligence
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .progress-bar { transition: width 1s ease-in-out; }
    .text-xs-caps { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; }
    .glow-primary { box-shadow: 0 0 15px rgba(0, 167, 224, 0.15); }
    .glow-error { box-shadow: 0 0 15px rgba(248, 113, 113, 0.15); }
    .bg-success-container { background-color: #0a1a10; }
    .border-success { border-color: #4ade80 !important; }
    .text-success { color: #4ade80 !important; }
  `]
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('severityChart')  severityChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('trendChart')     trendChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('dataTypesChart') dataTypesChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('riskChart')      riskChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('orgChart')       orgChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('industryTrendChart') industryTrendChartRef!: ElementRef<HTMLCanvasElement>;

  private analytics = inject(AnalyticsService);
  private breachService = inject(BreachService);
  private notifications = inject(NotificationService);
  private themeService = inject(ThemeService);
  auth = inject(AuthService);
  isAnalystUser = false;

  summary: AnalyticsSummary | null = null;
  severityData: SeverityBreakdown[] = [];
  trendData: MonthlyTrend[] = [];
  dataTypesData: DataTypeFrequency[] = [];
  riskData: Array<{ label: string; count: number }> = [];
  orgData: Array<{ organisation: string; count: number }> = [];
  industryTrendData: Array<{ industry: string; year: number; value: number }> = [];
  remediationRate = 0;
  trendChangePct = 0;
  trendDirection: 'up' | 'down' | 'flat' = 'flat';
  systemHealthPct = 100;
  panelErrors: Record<string, string | null> = {
    summary: null,
    trend: null,
    severity: null,
    risk: null,
    dataTypes: null,
    organisations: null,
    remediation: null,
  };
  lastUpdated: Date | null = null;

  trendLoading = true;
  trendView: '7d' | 'historical' = 'historical';
  trendYear: number | null = null;
  checkingExposure = false;
  exposureResult: any = null;

  private charts: any[] = [];
  private viewReady = false;
  private hasShownDashboardLoadToast = false;

  private _themeWatcher = effect(() => {
    this.themeService.theme();
    if (this.viewReady) this.renderAllCharts();
  });

  ngOnInit(): void {
    this.isAnalystUser = this.auth.isAnalyst();
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
      next: (res) => {
        this.summary = res.data;
        this.lastUpdated = new Date();
        this.updateSystemHealth();
      },
      error: () => {
        this.panelErrors['summary'] = 'Failed to load summary metrics.';
        if (!this.hasShownDashboardLoadToast) {
          this.notifications.show('Some dashboard metrics failed to load.', 'warning', 3200);
          this.hasShownDashboardLoadToast = true;
        }
      }
    });
    this.analytics.getSeverityBreakdown().subscribe(res => {
      this.severityData = res.data;
      if (this.viewReady) this.renderSeverity();
    }, () => {
      this.panelErrors['severity'] = 'Failed to load severity breakdown.';
    });
    this.loadMonthlyTrendWithFallback();
    this.analytics.getDataTypesFrequency().subscribe(res => {
      this.dataTypesData = res.data.slice(0, 5);
      if (this.viewReady) this.renderDataTypes();
    }, () => {
      this.panelErrors['dataTypes'] = 'Failed to load exposed data types.';
    });
    this.analytics.getRiskScores().subscribe(res => {
      this.riskData = this.normalizeRiskData(res.data);
      if (this.viewReady) this.renderRisk();
    }, () => {
      this.panelErrors['risk'] = 'Failed to load risk distribution.';
    });

    if (this.isAnalystUser) {
      this.analytics.getTopOrganisations(5).subscribe(res => {
        this.orgData = this.normalizeOrgData(res.data);
        if (this.viewReady) this.renderOrg();
      }, () => {
        this.panelErrors['organisations'] = 'Failed to load top organisations.';
      });
      this.analytics.getRemediationRate().subscribe(res => {
        this.remediationRate = this.computeRemediationRate(res.data);
      }, () => {
        this.panelErrors['remediation'] = 'Failed to load remediation rate.';
      });
      this.analytics.getIndustryYearTrend().subscribe(res => {
        this.industryTrendData = this.normalizeIndustryTrendData(res.data);
        if (this.viewReady) this.renderIndustryTrend();
      });
    }
  }

  private loadMonthlyTrendWithFallback(): void {
    const currentYear = new Date().getFullYear();
    const yearsToTry: number[] = [];
    for (let y = currentYear; y >= currentYear - 5; y -= 1) yearsToTry.push(y);

    const tryYear = (index: number) => {
      if (index >= yearsToTry.length) {
        this.trendData = [];
        this.trendYear = null;
        this.trendLoading = false;
        this.panelErrors['trend'] = 'No monthly trend data found for recent years.';
        this.updateTrendStats();
        if (this.viewReady) this.renderTrend();
        return;
      }

      const year = yearsToTry[index];
      this.analytics.getMonthlyTrend(year).subscribe({
        next: (res) => {
          const data = Array.isArray(res.data) ? res.data : [];
          if (data.length > 0) {
            this.trendData = data;
            this.trendYear = year;
            this.trendLoading = false;
            this.panelErrors['trend'] = null;
            this.updateTrendStats();
            if (this.viewReady) this.renderTrend();
            return;
          }
          tryYear(index + 1);
        },
        error: () => tryYear(index + 1),
      });
    };

    tryYear(0);
  }

  private updateTrendStats(): void {
    if (!this.trendData.length) {
      this.trendChangePct = 0;
      this.trendDirection = 'flat';
      return;
    }

    const sorted = [...this.trendData].sort((a, b) => a.month - b.month);
    const latest = sorted[sorted.length - 1]?.count ?? 0;
    const previous = sorted.length > 1 ? (sorted[sorted.length - 2]?.count ?? 0) : 0;

    if (previous === 0) {
      this.trendChangePct = latest > 0 ? 100 : 0;
      this.trendDirection = latest > 0 ? 'up' : 'flat';
      return;
    }

    const pct = ((latest - previous) / previous) * 100;
    this.trendChangePct = Math.round(Math.abs(pct));
    this.trendDirection = pct > 0 ? 'up' : (pct < 0 ? 'down' : 'flat');
  }

  private updateSystemHealth(): void {
    const openAlerts = this.summary?.open_alerts ?? 0;
    const activeBreaches = this.summary?.active_breaches ?? 0;
    const risk = this.summary?.avg_risk_score ?? 0;

    const penalty = Math.min(35, openAlerts * 2) + Math.min(25, activeBreaches) + Math.min(20, risk * 2);
    this.systemHealthPct = Math.max(40, Math.min(100, Math.round(100 - penalty)));
  }

  setTrendView(view: '7d' | 'historical'): void {
    if (this.trendView === view) return;
    this.trendView = view;
    if (this.viewReady) this.renderTrend();
  }

  private normalizeRiskData(data: any): Array<{ label: string; count: number }> {
    if (!Array.isArray(data)) return [];
    return data
      .map((d: any) => {
        const label = d?.bin ?? d?.range ?? d?._id;
        const count = Number(d?.count ?? 0);
        return {
          label: label === undefined || label === null || String(label).trim() === '' ? 'UNSPECIFIED' : String(label),
          count,
        };
      })
      .filter((d) => Number.isFinite(d.count));
  }

  private normalizeOrgData(data: any): Array<{ organisation: string; count: number }> {
    if (!Array.isArray(data)) return [];
    return data
      .map((d: any) => ({
        organisation: String(d?.organisation ?? d?.org ?? d?.name ?? d?.domain ?? 'UNSPECIFIED'),
        count: Number(d?.count ?? d?.breach_count ?? 0),
      }))
      .filter((d) => Number.isFinite(d.count));
  }

  private normalizeIndustryTrendData(data: any): Array<{ industry: string; year: number; value: number }> {
    if (!Array.isArray(data)) return [];
    return data
      .map((d: any) => ({
        industry: String(d?.industry ?? d?.sector ?? 'UNSPECIFIED'),
        year: Number(d?.year ?? 0),
        value: Number(d?.avg_risk_score ?? d?.breach_count ?? 0),
      }))
      .filter((d) => Number.isFinite(d.year) && d.year > 0 && Number.isFinite(d.value));
  }

  private computeRemediationRate(data: any): number {
    if (!Array.isArray(data) || data.length === 0) return 0;
    const rates = data
      .map((d: any) => Number(d?.completion_rate))
      .filter((v: number) => Number.isFinite(v));
    if (!rates.length) return 0;
    const avgPercentage = rates.reduce((acc, v) => acc + v, 0) / rates.length;
    return Math.max(0, Math.min(1, avgPercentage / 100));
  }

  private renderAllCharts(): void {
    if (this.severityData.length) this.renderSeverity();
    if (this.trendData.length) this.renderTrend();
    if (this.dataTypesData.length) this.renderDataTypes();
    if (this.riskData.length) this.renderRisk();
    if (this.orgData.length) this.renderOrg();
    if (this.industryTrendData.length) this.renderIndustryTrend();
  }

  private async getChart() {
    const mod = await import('chart.js/auto');
    return mod.default;
  }

  private async renderSeverity() {
    if (!this.severityChartRef) return;
    const Chart = await this.getChart();
    const palette = this.getChartPalette();
    this.charts[0]?.destroy();
    this.charts[0] = new Chart(this.severityChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: this.severityData.map(d => d.severity),
        datasets: [{
          data: this.severityData.map(d => d.breach_count),
          backgroundColor: ['#f87171', '#fb923c', '#fbbf24', '#0ea5e9', '#64748b'],
          borderWidth: 0,
          hoverOffset: 10
        }]
      },
      options: {
        cutout: '70%',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: palette.tooltipBg,
            borderColor: palette.tooltipBorder,
            borderWidth: 1,
            titleColor: palette.tooltipText,
            bodyColor: palette.tooltipText,
            titleFont: { family: 'Manrope', size: 12 },
            bodyFont: { family: 'Inter', size: 11 },
            padding: 10,
            cornerRadius: 4
          }
        }
      }
    });
  }

  private async renderTrend() {
    if (!this.trendChartRef) return;
    const Chart = await this.getChart();
    const palette = this.getChartPalette();
    this.charts[1]?.destroy();
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const monthlyCounts = new Map<number, number>();
    this.trendData.forEach((d) => monthlyCounts.set(d.month, d.count));

    const allMonthlyPoints = months.map((label, i) => ({ label, value: monthlyCounts.get(i + 1) ?? 0 }));
    const visiblePoints = this.trendView === '7d' ? allMonthlyPoints.slice(-7) : allMonthlyPoints;

    this.charts[1] = new Chart(this.trendChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: visiblePoints.map((p) => p.label),
        datasets: [{
          label: 'Breaches',
          data: visiblePoints.map((p) => p.value),
          borderColor: '#0ea5e9',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          backgroundColor: (context: any) => {
            const canvas = context.chart.canvas;
            const ctx = canvas.getContext('2d');
            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, 'rgba(14, 165, 233, 0.2)');
            gradient.addColorStop(1, 'rgba(14, 165, 233, 0)');
            return gradient;
          },
          pointBackgroundColor: '#0ea5e9',
          pointBorderColor: '#fff',
          pointRadius: 0,
          pointHoverRadius: 5
        }]
      },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            grid: { color: palette.grid },
            ticks: { color: palette.tick, font: { size: 9, family: 'Inter' } }
          },
          x: {
            grid: { display: false },
            ticks: { color: palette.tick, font: { size: 9, family: 'Inter' } }
          }
        }
      }
    });
  }

  private async renderDataTypes() {
    if (!this.dataTypesChartRef) return;
    const Chart = await this.getChart();
    const palette = this.getChartPalette();
    this.charts[2]?.destroy();
    this.charts[2] = new Chart(this.dataTypesChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: this.dataTypesData.map(d => d.data_type),
        datasets: [{
          data: this.dataTypesData.map(d => d.count),
          backgroundColor: '#bdc2ff',
          borderRadius: 4
        }]
      },
      options: {
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: palette.tick, font: { size: 8 } } },
          y: { grid: { display: false }, ticks: { color: palette.tick, font: { size: 9, family: 'Manrope' } } }
        }
      }
    });
  }

  private async renderRisk() {
    if (!this.riskChartRef) return;
    const Chart = await this.getChart();
    const palette = this.getChartPalette();
    this.charts[3]?.destroy();
    this.charts[3] = new Chart(this.riskChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: this.riskData.map(d => d.label),
        datasets: [{
          data: this.riskData.map(d => d.count),
          backgroundColor: '#7bd0ff',
          borderRadius: 2
        }]
      },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: palette.tick, font: { size: 8 } } },
          y: { grid: { color: palette.grid }, ticks: { color: palette.tick, font: { size: 8 } } }
        }
      }
    });
  }

  private async renderOrg() {
    if (!this.orgChartRef || !this.orgData.length) return;
    const Chart = await this.getChart();
    const palette = this.getChartPalette();
    this.charts[4]?.destroy();
    this.charts[4] = new Chart(this.orgChartRef.nativeElement, {
      type: 'polarArea',
      data: {
        labels: this.orgData.map(d => d.organisation),
        datasets: [{
          data: this.orgData.map(d => d.count),
          backgroundColor: [
            'rgba(248, 113, 113, 0.7)',
            'rgba(14, 165, 233, 0.7)',
            'rgba(189, 194, 255, 0.7)',
            'rgba(251, 191, 36, 0.7)',
            'rgba(100, 116, 139, 0.7)'
          ],
          borderWidth: 0
        }]
      },
      options: {
        maintainAspectRatio: false,
        scales: { r: { grid: { color: palette.grid }, ticks: { display: false } } },
        plugins: { legend: { display: false } }
      }
    });
  }

  private async renderIndustryTrend() {
    if (!this.industryTrendChartRef) return;
    const Chart = await this.getChart();
    const palette = this.getChartPalette();

    const industries = Array.from(new Set(this.industryTrendData.map(d => d.industry))).slice(0, 5);
    const years = Array.from(new Set(this.industryTrendData.map(d => d.year))).sort();

    const datasets = industries.map((ind, i) => {
      const colors = ['#f87171', '#0ea5e9', '#bdc2ff', '#fbbf24', '#4ade80'];
      return {
        label: ind,
        data: years.map(y => {
          const found = this.industryTrendData.find(d => d.industry === ind && d.year === y);
          return found ? found.value : 0;
        }),
        borderColor: colors[i % colors.length],
        backgroundColor: colors[i % colors.length] + '33',
        fill: false,
        tension: 0.3
      };
    });

    this.charts[5]?.destroy();
    this.charts[5] = new Chart(this.industryTrendChartRef.nativeElement, {
      type: 'line',
      data: { labels: years.map(String), datasets },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: palette.tick, font: { size: 10 } } } },
        scales: {
          y: { grid: { color: palette.grid }, ticks: { color: palette.tick } },
          x: { grid: { display: false }, ticks: { color: palette.tick } }
        }
      }
    });
  }

  private getChartPalette() {
    const style = getComputedStyle(document.documentElement);
    const tick = style.getPropertyValue('--on-surface-variant').trim() || '#64748b';
    const outline = style.getPropertyValue('--outline-variant').trim() || '#3e4850';
    const isDark = this.themeService.theme() === 'dark';

    return {
      tick,
      grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)',
      tooltipBg: isDark ? 'rgba(15, 19, 30, 0.92)' : 'rgba(255, 255, 255, 0.96)',
      tooltipText: style.getPropertyValue('--on-surface').trim() || '#0f172a',
      tooltipBorder: outline,
    };
  }

  checkExposure(value: string): void {
    if (!value.trim()) {
      this.notifications.show('Enter an email or domain to check exposure.', 'warning', 2600);
      return;
    }
    this.checkingExposure = true;
    this.exposureResult = null;
    const isEmail = value.includes('@');
    const req$ = isEmail ? this.breachService.checkExposure(value) : this.breachService.checkExposure(undefined, value);
    req$.subscribe({
      next: (res) => {
        this.exposureResult = res.data;
        this.checkingExposure = false;
        if (this.exposureResult?.exposed) {
          this.notifications.show(`Exposure detected in ${this.exposureResult.breach_count ?? 0} breach(es).`, 'warning', 4500);
        } else {
          this.notifications.show('No active exposure detected for this query.', 'success', 3000);
        }
      },
      error: (err) => {
        this.checkingExposure = false;
        this.notifications.show(err?.error?.message ?? 'Exposure lookup failed.', 'error', 5000);
      }
    });
  }
}
