import {
  Component, OnInit, OnDestroy, inject,
  ElementRef, ViewChild, AfterViewInit
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass, DecimalPipe, PercentPipe } from '@angular/common';
import { AnalyticsService } from '../../core/services/analytics.service';
import { BreachService } from '../../core/services/breach.service';
import { AuthService } from '../../core/services/auth.service';
import { AnalyticsSummary, SeverityBreakdown, MonthlyTrend, DataTypeFrequency } from '../../core/models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, NgClass, DecimalPipe, PercentPipe],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h2 class="fw-bold mb-0">
          <span class="text-danger">⬡</span> BreachLens Dashboard
        </h2>
        <p class="text-muted mb-0 small">Dark web breach intelligence overview</p>
      </div>
      <div class="d-flex gap-2">
        @if (auth.isAdmin()) {
          <a routerLink="/admin" class="btn btn-outline-warning btn-sm">Admin Panel</a>
        }
        <a routerLink="/breaches" class="btn btn-danger btn-sm">View all breaches →</a>
      </div>
    </div>

    <!-- KPI cards -->
    @if (summary) {
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3">
          <div class="card bg-dark border-secondary text-center p-3">
            <div class="fs-3 fw-bold text-danger">{{ summary.total_breaches | number }}</div>
            <small class="text-muted text-uppercase fw-bold" style="font-size: 0.65rem;">Total breaches</small>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card bg-dark border-secondary text-center p-3">
            <div class="fs-3 fw-bold text-warning">{{ summary.active_breaches }}</div>
            <small class="text-muted text-uppercase fw-bold" style="font-size: 0.65rem;">Active</small>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card bg-dark border-secondary text-center p-3">
            <div class="fs-3 fw-bold text-success">{{ summary.resolved_breaches }}</div>
            <small class="text-muted text-uppercase fw-bold" style="font-size: 0.65rem;">Resolved</small>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card bg-dark border-secondary text-center p-3">
            <div class="fs-3 fw-bold text-info">{{ summary.avg_risk_score | number:'1.1-1' }}</div>
            <small class="text-muted text-uppercase fw-bold" style="font-size: 0.65rem;">Avg risk score</small>
          </div>
        </div>
      </div>
    }

    <!-- Main Charts row -->
    <div class="row g-4 mb-4">
      <div class="col-lg-8">
        <div class="card bg-dark border-secondary h-100">
          <div class="card-header border-secondary d-flex justify-content-between align-items-center">
            <strong class="text-light">Monthly breach trend</strong>
            @if (trendLoading) {
              <span class="spinner-border spinner-border-sm text-secondary"></span>
            }
          </div>
          <div class="card-body">
            <canvas #trendChart style="max-height:300px;"></canvas>
          </div>
        </div>
      </div>
      <div class="col-lg-4">
        <div class="card bg-dark border-secondary h-100">
          <div class="card-header border-secondary">
            <strong class="text-light">Breaches by severity</strong>
          </div>
          <div class="card-body d-flex align-items-center justify-content-center">
            <canvas #severityChart style="max-height:240px;"></canvas>
          </div>
        </div>
      </div>
    </div>

    <!-- Advanced Industry Trend Chart (NEW) -->
    @if (auth.isAuthenticated()) {
      <div class="row mb-4">
        <div class="col-12">
          <div class="card bg-dark border-secondary">
            <div class="card-header border-secondary">
              <strong class="text-light">Industry Risk Year-over-Year Trend</strong>
            </div>
            <div class="card-body">
              <canvas #industryTrendChart style="max-height:350px;"></canvas>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Secondary Charts row -->
    <div class="row g-4 mb-4">
      <div class="col-lg-4">
        <div class="card bg-dark border-secondary h-100">
          <div class="card-header border-secondary">
            <strong class="text-light">Risk Score Distribution</strong>
          </div>
          <div class="card-body">
            <canvas #riskChart style="max-height:220px;"></canvas>
          </div>
        </div>
      </div>
      <div class="col-lg-4">
        <div class="card bg-dark border-secondary h-100">
          <div class="card-header border-secondary">
            <strong class="text-light">Top Target Organisations</strong>
          </div>
          <div class="card-body">
            <canvas #orgChart style="max-height:220px;"></canvas>
          </div>
        </div>
      </div>
      <div class="col-lg-4">
        <div class="card bg-dark border-secondary h-100">
          <div class="card-header border-secondary">
            <strong class="text-light">Top Exposed Data Types</strong>
          </div>
          <div class="card-body">
            <canvas #dataTypesChart style="max-height:220px;"></canvas>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-4">
      <div class="col-lg-6">
        <div class="card bg-dark border-secondary">
          <div class="card-header border-secondary">
            <strong class="text-light">Exposure Checker</strong>
          </div>
          <div class="card-body">
            <p class="text-muted small mb-3">
              Check if an email or domain appears in any known breach.
            </p>
            <div class="input-group mb-2">
              <input
                #exposureInput
                class="form-control bg-dark text-light border-secondary"
                type="text"
                placeholder="email@example.com or example.com"
                (keyup.enter)="checkExposure(exposureInput.value)"
              />
              <button
                class="btn btn-danger"
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
                class="alert mt-2 mb-0 py-2 animate__animated animate__fadeIn"
                [ngClass]="exposureResult.exposed ? 'alert-danger' : 'alert-success'"
              >
                @if (exposureResult.exposed) {
                  <strong>⚠ Found in {{ exposureResult.breach_count }} breach(es)</strong>
                } @else {
                  <strong>✓ No breaches found</strong>
                }
              </div>
            }
          </div>
        </div>
      </div>
      <div class="col-lg-6">
        <div class="card bg-dark border-secondary h-100">
          <div class="card-header border-secondary">
            <strong class="text-light">Remediation Status</strong>
          </div>
          <div class="card-body d-flex flex-column justify-content-center">
             <div class="text-center mb-3">
               <div class="fs-1 fw-bold text-success">{{ remediationRate | percent }}</div>
               <small class="text-muted">Actions Completed</small>
             </div>
             <div class="progress bg-black" style="height: 10px;">
               <div class="progress-bar bg-success" role="progressbar" [style.width.%]="remediationRate * 100"></div>
             </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .progress-bar { transition: width 1s ease-in-out; }
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
  auth = inject(AuthService);

  summary: AnalyticsSummary | null = null;
  severityData: SeverityBreakdown[] = [];
  trendData: MonthlyTrend[] = [];
  dataTypesData: DataTypeFrequency[] = [];
  riskData: any[] = [];
  orgData: any[] = [];
  industryTrendData: any[] = [];
  remediationRate = 0;

  trendLoading = true;
  checkingExposure = false;
  exposureResult: any = null;

  private charts: any[] = [];
  private viewReady = false;

  ngOnInit(): void {
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
    this.analytics.getSummary().subscribe(res => this.summary = res.data);
    this.analytics.getSeverityBreakdown().subscribe(res => {
      this.severityData = res.data;
      if (this.viewReady) this.renderSeverity();
    });
    this.analytics.getMonthlyTrend(new Date().getFullYear()).subscribe(res => {
      this.trendData = res.data;
      this.trendLoading = false;
      if (this.viewReady) this.renderTrend();
    });
    this.analytics.getDataTypesFrequency().subscribe(res => {
      this.dataTypesData = res.data.slice(0, 5);
      if (this.viewReady) this.renderDataTypes();
    });
    this.analytics.getRiskScores().subscribe(res => {
      this.riskData = res.data;
      if (this.viewReady) this.renderRisk();
    });

    if (this.auth.isAnalyst()) {
      this.analytics.getTopOrganisations(5).subscribe(res => {
        this.orgData = res.data;
        if (this.viewReady) this.renderOrg();
      });
      this.analytics.getRemediationRate().subscribe(res => {
        this.remediationRate = res.data?.rate || 0;
      });
      this.analytics.getIndustryYearTrend().subscribe(res => {
        this.industryTrendData = res.data;
        if (this.viewReady) this.renderIndustryTrend();
      });
    }
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
    this.charts[0]?.destroy();
    this.charts[0] = new Chart(this.severityChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: this.severityData.map(d => d.severity),
        datasets: [{
          data: this.severityData.map(d => d.breach_count),
          backgroundColor: ['#dc3545', '#fd7e14', '#ffc107', '#0dcaf0', '#6c757d'],
          borderWidth: 0
        }]
      },
      options: { plugins: { legend: { position: 'bottom', labels: { color: '#adb5bd', font: { size: 10 } } } } }
    });
  }

  private async renderTrend() {
    if (!this.trendChartRef) return;
    const Chart = await this.getChart();
    this.charts[1]?.destroy();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    this.charts[1] = new Chart(this.trendChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: this.trendData.map(d => months[d.month - 1]),
        datasets: [{
          label: 'Breaches',
          data: this.trendData.map(d => d.count),
          borderColor: '#dc3545',
          tension: 0.4,
          fill: true,
          backgroundColor: 'rgba(220, 53, 69, 0.1)'
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#6c757d' } },
          x: { grid: { display: false }, ticks: { color: '#6c757d' } }
        }
      }
    });
  }

  private async renderDataTypes() {
    if (!this.dataTypesChartRef) return;
    const Chart = await this.getChart();
    this.charts[2]?.destroy();
    this.charts[2] = new Chart(this.dataTypesChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: this.dataTypesData.map(d => d.data_type),
        datasets: [{ data: this.dataTypesData.map(d => d.count), backgroundColor: '#0dcaf0' }]
      },
      options: {
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#6c757d' } },
          y: { grid: { display: false }, ticks: { color: '#adb5bd' } }
        }
      }
    });
  }

  private async renderRisk() {
    if (!this.riskChartRef) return;
    const Chart = await this.getChart();
    this.charts[3]?.destroy();
    this.charts[3] = new Chart(this.riskChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: this.riskData.map(d => d.bin),
        datasets: [{ data: this.riskData.map(d => d.count), backgroundColor: '#ffc107' }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#6c757d' } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#6c757d' } }
        }
      }
    });
  }

  private async renderOrg() {
    if (!this.orgChartRef) return;
    const Chart = await this.getChart();
    this.charts[4]?.destroy();
    this.charts[4] = new Chart(this.orgChartRef.nativeElement, {
      type: 'polarArea',
      data: {
        labels: this.orgData.map(d => d.organisation),
        datasets: [{ data: this.orgData.map(d => d.count), backgroundColor: ['rgba(220, 53, 69, 0.7)', 'rgba(253, 126, 20, 0.7)', 'rgba(255, 193, 7, 0.7)', 'rgba(13, 202, 240, 0.7)', 'rgba(108, 117, 125, 0.7)'] }]
      },
      options: {
        scales: { r: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { display: false } } },
        plugins: { legend: { display: false } }
      }
    });
  }

  private async renderIndustryTrend() {
    if (!this.industryTrendChartRef) return;
    const Chart = await this.getChart();

    // Process data: backend returns list of {industry, year, avg_risk}
    const industries = Array.from(new Set(this.industryTrendData.map(d => d.industry))).slice(0, 5);
    const years = Array.from(new Set(this.industryTrendData.map(d => d.year))).sort();

    const datasets = industries.map((ind, i) => {
      const colors = ['#dc3545', '#fd7e14', '#ffc107', '#0dcaf0', '#198754'];
      return {
        label: ind,
        data: years.map(y => {
          const found = this.industryTrendData.find(d => d.industry === ind && d.year === y);
          return found ? found.avg_risk_score : 0;
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
        plugins: { legend: { position: 'bottom', labels: { color: '#adb5bd' } } },
        scales: {
          y: { title: { display: true, text: 'Avg Risk Score', color: '#6c757d' }, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#6c757d' } },
          x: { grid: { display: false }, ticks: { color: '#6c757d' } }
        }
      }
    });
  }

  checkExposure(value: string): void {
    if (!value.trim()) return;
    this.checkingExposure = true;
    this.exposureResult = null;
    const isEmail = value.includes('@');
    const req$ = isEmail ? this.breachService.checkExposure(value) : this.breachService.checkExposure(undefined, value);
    req$.subscribe({
      next: (res) => {
        this.exposureResult = res.data;
        this.checkingExposure = false;
      },
      error: () => this.checkingExposure = false
    });
  }
}
