import {
  Component, OnInit, OnDestroy, inject,
  ElementRef, ViewChild, AfterViewInit
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass, DecimalPipe } from '@angular/common';
import { AnalyticsService } from '../../core/services/analytics.service';
import { AuthService } from '../../core/services/auth.service';
import { AnalyticsSummary, SeverityBreakdown, MonthlyTrend, DataTypeFrequency } from '../../core/models/models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, NgClass, DecimalPipe],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h2 class="fw-bold mb-0">
          <span class="text-danger">⬡</span> BreachLens Dashboard
        </h2>
        <p class="text-muted mb-0 small">Dark web breach intelligence overview</p>
      </div>
      <a routerLink="/breaches" class="btn btn-danger btn-sm">View all breaches →</a>
    </div>

    <!-- KPI cards -->
    @if (summary) {
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3">
          <div class="card bg-dark border-secondary text-center p-3">
            <div class="fs-3 fw-bold text-danger">{{ summary.total_breaches | number }}</div>
            <small class="text-muted">Total breaches</small>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card bg-dark border-secondary text-center p-3">
            <div class="fs-3 fw-bold text-warning">{{ summary.active_breaches }}</div>
            <small class="text-muted">Active</small>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card bg-dark border-secondary text-center p-3">
            <div class="fs-3 fw-bold text-success">{{ summary.resolved_breaches }}</div>
            <small class="text-muted">Resolved</small>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card bg-dark border-secondary text-center p-3">
            <div class="fs-3 fw-bold text-info">{{ summary.avg_risk_score | number:'1.1-1' }}</div>
            <small class="text-muted">Avg risk score</small>
          </div>
        </div>
      </div>
    } @else {
      <div class="row g-3 mb-4">
        @for (i of [1,2,3,4]; track i) {
          <div class="col-6 col-md-3">
            <div class="card bg-dark border-secondary text-center p-3">
              <div class="placeholder-glow"><span class="placeholder col-6"></span></div>
              <small class="text-muted">Loading...</small>
            </div>
          </div>
        }
      </div>
    }

    <!-- Charts row -->
    <div class="row g-4 mb-4">
      <div class="col-lg-6">
        <div class="card bg-dark border-secondary h-100">
          <div class="card-header border-secondary d-flex justify-content-between align-items-center">
            <strong class="text-light">Breaches by severity</strong>
            @if (severityLoading) {
              <span class="spinner-border spinner-border-sm text-secondary"></span>
            }
          </div>
          <div class="card-body d-flex align-items-center justify-content-center">
            @if (!severityLoading && severityData.length === 0) {
              <p class="text-muted small">No data available</p>
            }
            <canvas #severityChart style="max-height:260px;"></canvas>
          </div>
        </div>
      </div>

      <div class="col-lg-6">
        <div class="card bg-dark border-secondary h-100">
          <div class="card-header border-secondary d-flex justify-content-between align-items-center">
            <strong class="text-light">
              Monthly breach trend
              @if (trendYear) {
                <span class="text-muted fw-normal fs-6"> ({{ trendYear }})</span>
              }
            </strong>
            @if (trendLoading) {
              <span class="spinner-border spinner-border-sm text-secondary"></span>
            }
          </div>
          <div class="card-body">
            @if (!trendLoading && trendData.length === 0) {
              <p class="text-muted small text-center pt-4">No trend data found</p>
            }
            <canvas #trendChart style="max-height:260px;"></canvas>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-4">
      <div class="col-lg-6">
        <div class="card bg-dark border-secondary">
          <div class="card-header border-secondary d-flex justify-content-between align-items-center">
            <strong class="text-light">Top exposed data types</strong>
            @if (dataTypesLoading) {
              <span class="spinner-border spinner-border-sm text-secondary"></span>
            }
          </div>
          <div class="card-body">
            @if (!dataTypesLoading && dataTypesData.length === 0) {
              <p class="text-muted small text-center pt-2">No data available</p>
            }
            <canvas #dataTypesChart style="max-height:240px;"></canvas>
          </div>
        </div>
      </div>

      <div class="col-lg-6">
        <div class="card bg-dark border-secondary">
          <div class="card-header border-secondary">
            <strong class="text-light">Exposure checker</strong>
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
                class="alert mt-2 mb-0 py-2"
                [ngClass]="exposureResult.exposed ? 'alert-danger' : 'alert-success'"
              >
                @if (exposureResult.exposed) {
                  <strong>⚠ Found in {{ exposureResult.breach_count }} breach(es)</strong>
                } @else {
                  <strong>✓ No breaches found</strong>
                }
              </div>
            }
            @if (exposureError) {
              <div class="alert alert-warning mt-2 mb-0 py-2 small">{{ exposureError }}</div>
            }
          </div>
        </div>
      </div>
    </div>

    @if (!auth.isAuthenticated()) {
      <div class="alert alert-dark border-secondary mt-4">
        <strong class="text-light">Sign in</strong>
        <span class="text-muted"> to access industry risk and alert analytics.</span>
        <a routerLink="/auth/login" class="btn btn-sm btn-danger ms-2">Login</a>
      </div>
    }
  `,
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('severityChart')  severityChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('trendChart')     trendChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('dataTypesChart') dataTypesChartRef!: ElementRef<HTMLCanvasElement>;

  private analytics = inject(AnalyticsService);
  auth = inject(AuthService);

  summary: AnalyticsSummary | null = null;
  severityData: SeverityBreakdown[] = [];
  trendData: MonthlyTrend[] = [];
  dataTypesData: DataTypeFrequency[] = [];
  trendYear: number | null = null;

  severityLoading  = true;
  trendLoading     = true;
  dataTypesLoading = true;

  checkingExposure = false;
  exposureResult: any = null;
  exposureError = '';

  private charts: any[] = [];
  private viewReady = false;

  ngOnInit(): void {
    this.loadSummary();
    this.loadSeverity();
    this.loadTrend();
    this.loadDataTypes();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.tryRenderSeverity();
    this.tryRenderTrend();
    this.tryRenderDataTypes();
  }

  ngOnDestroy(): void {
    this.charts.forEach((c) => c?.destroy());
  }

  // ------------------------------------------------------------------
  private loadSummary(): void {
    this.analytics.getSummary().subscribe({
      next: (res) => (this.summary = res.data),
      error: () => {},
    });
  }

  private loadSeverity(): void {
    this.analytics.getSeverityBreakdown().subscribe({
      next: (res) => {
        // API returns: { severity: string, breach_count: number, total_records: number }
        this.severityData = (res.data ?? []).filter((d: any) => d.severity);
        this.severityLoading = false;
        this.tryRenderSeverity();
      },
      error: () => { this.severityLoading = false; },
    });
  }

  private loadTrend(): void {
    const currentYear = new Date().getFullYear();
    this.analytics.getMonthlyTrend(currentYear).subscribe({
      next: (res) => {
        if ((res.data ?? []).length > 0) {
          this.trendData = res.data;
          this.trendYear = currentYear;
          this.trendLoading = false;
          this.tryRenderTrend();
        } else {
          // No data this year — try previous year
          this.analytics.getMonthlyTrend(currentYear - 1).subscribe({
            next: (res2) => {
              this.trendData = res2.data ?? [];
              this.trendYear = this.trendData.length > 0 ? currentYear - 1 : null;
              this.trendLoading = false;
              this.tryRenderTrend();
            },
            error: () => { this.trendLoading = false; },
          });
        }
      },
      error: () => { this.trendLoading = false; },
    });
  }

  private loadDataTypes(): void {
    this.analytics.getDataTypesFrequency().subscribe({
      next: (res) => {
        // API returns: { data_type: string, count: number }
        this.dataTypesData = (res.data ?? [])
          .filter((d: any) => d.data_type)
          .slice(0, 8);
        this.dataTypesLoading = false;
        this.tryRenderDataTypes();
      },
      error: () => { this.dataTypesLoading = false; },
    });
  }

  // ------------------------------------------------------------------
  private tryRenderSeverity(): void {
    if (!this.viewReady || !this.severityChartRef?.nativeElement || !this.severityData.length) return;

    import('chart.js/auto').then((mod) => {
      const Chart = mod.default;
      this.charts[0]?.destroy();
      const colorMap: Record<string, string> = {
        critical:      '#dc3545',
        high:          '#ffc107',
        medium:        '#0d6efd',
        low:           '#198754',
        informational: '#6c757d',
      };
      this.charts[0] = new Chart(this.severityChartRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: this.severityData.map((d) => d.severity),
          datasets: [{
            data: this.severityData.map((d) => d.breach_count),
            backgroundColor: this.severityData.map(
              (d) => colorMap[d.severity?.toLowerCase()] ?? '#6c757d'
            ),
            borderWidth: 0,
          }],
        },
        options: {
          plugins: { legend: { labels: { color: '#adb5bd' } } },
          cutout: '65%',
        },
      });
    });
  }

  private tryRenderTrend(): void {
    if (!this.viewReady || !this.trendChartRef?.nativeElement || !this.trendData.length) return;

    import('chart.js/auto').then((mod) => {
      const Chart = mod.default;
      this.charts[1]?.destroy();
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      this.charts[1] = new Chart(this.trendChartRef.nativeElement, {
        type: 'line',
        data: {
          labels: this.trendData.map((d) => months[(d.month ?? 1) - 1]),
          datasets: [{
            label: 'Breaches',
            data: this.trendData.map((d) => d.count),
            borderColor: '#dc3545',
            backgroundColor: 'rgba(220,53,69,0.1)',
            fill: true,
            tension: 0.3,
            pointBackgroundColor: '#dc3545',
            pointRadius: 4,
          }],
        },
        options: {
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#6c757d' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { beginAtZero: true, ticks: { color: '#6c757d', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } },
          },
        },
      });
    });
  }

  private tryRenderDataTypes(): void {
    if (!this.viewReady || !this.dataTypesChartRef?.nativeElement || !this.dataTypesData.length) return;

    import('chart.js/auto').then((mod) => {
      const Chart = mod.default;
      this.charts[2]?.destroy();
      this.charts[2] = new Chart(this.dataTypesChartRef.nativeElement, {
        type: 'bar',
        data: {
          labels: this.dataTypesData.map((d) => d.data_type),
          datasets: [{
            label: 'Occurrences',
            data: this.dataTypesData.map((d) => d.count),
            backgroundColor: 'rgba(220,53,69,0.75)',
            borderRadius: 4,
          }],
        },
        options: {
          indexAxis: 'y',
          plugins: { legend: { display: false } },
          scales: {
            x: { beginAtZero: true, ticks: { color: '#6c757d', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { ticks: { color: '#adb5bd' }, grid: { display: false } },
          },
        },
      });
    });
  }

  // ------------------------------------------------------------------
  checkExposure(value: string): void {
    this.exposureResult = null;
    this.exposureError = '';
    if (!value.trim()) return;

    this.checkingExposure = true;
    const isEmail = value.includes('@');
    const token = localStorage.getItem('bl_token');
    const param = isEmail
      ? `email=${encodeURIComponent(value)}`
      : `domain=${encodeURIComponent(value)}`;
    const url = `${environment.apiUrl}/breaches/exposure-check?${param}`;

    fetch(url, token ? { headers: { 'x-access-token': token } } : {})
      .then((r) => r.json())
      .then((data) => {
        this.exposureResult = data.data;
        this.checkingExposure = false;
      })
      .catch(() => {
        this.exposureError = 'Could not reach the API. Is Flask running on port 5001?';
        this.checkingExposure = false;
      });
  }
}
