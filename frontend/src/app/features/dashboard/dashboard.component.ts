import {
  Component, OnInit, OnDestroy, inject,
  ElementRef, ViewChild, AfterViewInit
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass, DecimalPipe, PercentPipe, CommonModule } from '@angular/common';
import { AnalyticsService } from '../../core/services/analytics.service';
import { BreachService } from '../../core/services/breach.service';
import { AuthService } from '../../core/services/auth.service';
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
              <div class="text-xs-caps text-primary fw-bold mt-2">
                <span class="material-symbols-outlined fs-6">trending_up</span> +12% VS LAST_HR
              </div>
            </div>
          </div>

          <!-- KPI Card 2: Threats Blocked -->
          <div class="col-md-3">
            <div class="card p-4 border-0 border-start border-tertiary border-3 glow-error h-100">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <span class="text-xs-caps text-on-surface-variant">Critical Status</span>
                <span class="material-symbols-outlined text-tertiary-container fs-6">warning</span>
              </div>
              <div class="fs-2 fw-bold text-on-surface font-headline">{{ summary?.active_breaches }}</div>
              <div class="text-xs-caps text-tertiary-container fw-bold mt-2">
                <span class="material-symbols-outlined fs-6">bolt</span> PEAK_ACTIVITY_DETECTED
              </div>
            </div>
          </div>

          <!-- KPI Card 3: Avg Risk Score -->
          <div class="col-md-3">
            <div class="card p-4 border-0 border-start border-secondary border-3 h-100">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <span class="text-xs-caps text-on-surface-variant">Avg Risk Index</span>
                <span class="material-symbols-outlined text-secondary fs-6">speed</span>
              </div>
              <div class="fs-2 fw-bold text-on-surface font-headline">{{ summary?.avg_risk_score | number:'1.1-1' }}</div>
              <div class="text-xs-caps text-on-surface-variant mt-2 d-flex align-items-center gap-2">
                <span class="p-1 bg-secondary rounded-circle"></span> STABLE_NETWORK_STATE
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
              <div class="fs-2 fw-bold text-on-surface font-headline">99.8%</div>
              <div class="text-xs-caps text-on-surface-variant mt-2">UPTIME: 412:12:04</div>
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
                <div class="text-xs-caps text-on-surface-variant opacity-50" style="font-size: 8px;">LIVE_ANALYTICS_KERNEL V4.2</div>
              </div>
              <div class="d-flex gap-2">
                <button class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-1 px-3">7D VIEW</button>
                <button class="btn btn-primary text-xs-caps py-1 px-3">HISTORICAL</button>
              </div>
            </div>

            <div class="flex-grow-1 position-relative" style="min-height: 300px;">
              <canvas #trendChart></canvas>
            </div>

            <div class="glass-panel p-3 rounded-3 mt-4 d-flex justify-content-center align-items-center border border-outline-variant border-opacity-10">
              <div class="d-flex gap-4">
                <div>
                  <div class="text-xs-caps text-on-surface-variant mb-1" style="font-size: 8px;">Encryption_Layer</div>
                  <div class="fw-bold text-on-surface small">AES-256-GCM</div>
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
            <p class="text-on-surface-variant mb-3" style="font-size: 11px;">VERIFY DOMAIN OR IDENTITY INTRUSIONS</p>

            <div class="input-group mb-3">
              <span class="input-group-text bg-surface-container-low border-0 text-on-surface-variant">
                <span class="material-symbols-outlined fs-6">alternate_email</span>
              </span>
              <input
                #exposureInput
                class="form-control bg-surface-container-low border-0 ps-0 text-on-surface"
                type="text"
                placeholder="IDENTITY_QUERY..."
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
                  GO
                }
              </button>
            </div>

            @if (exposureResult !== null) {
              <div
                class="p-2 rounded-2 border-start border-3 transition-all animate__animated animate__fadeIn mb-3"
                [ngClass]="exposureResult.exposed ? 'bg-error-container bg-opacity-10 border-error' : 'bg-success-container bg-opacity-10 border-success'"
              >
                @if (exposureResult.exposed) {
                  <div class="text-xs-caps text-error mb-1" style="font-size: 8px;">Critical_Alert</div>
                  <div class="text-on-surface fw-bold" style="font-size: 10px;">Found in {{ exposureResult.breach_count }} breach(es)</div>
                } @else {
                  <div class="text-xs-caps text-success mb-1" style="font-size: 8px;">Clear_Signal</div>
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
              <div style="height: 200px;"><canvas #orgChart></canvas></div>
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
            backgroundColor: 'rgba(15, 19, 30, 0.9)',
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
    this.charts[1]?.destroy();
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    this.charts[1] = new Chart(this.trendChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: this.trendData.map(d => months[d.month - 1]),
        datasets: [{
          label: 'Breaches',
          data: this.trendData.map(d => d.count),
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
            grid: { color: 'rgba(255,255,255,0.03)' },
            ticks: { color: '#64748b', font: { size: 9, family: 'Inter' } }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#64748b', font: { size: 9, family: 'Inter' } }
          }
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
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 8 } } },
          y: { grid: { display: false }, ticks: { color: '#bec8d2', font: { size: 9, family: 'Manrope' } } }
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
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 8 } } },
          y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b', font: { size: 8 } } }
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
        scales: { r: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { display: false } } },
        plugins: { legend: { display: false } }
      }
    });
  }

  private async renderIndustryTrend() {
    if (!this.industryTrendChartRef) return;
    const Chart = await this.getChart();

    const industries = Array.from(new Set(this.industryTrendData.map(d => d.industry))).slice(0, 5);
    const years = Array.from(new Set(this.industryTrendData.map(d => d.year))).sort();

    const datasets = industries.map((ind, i) => {
      const colors = ['#f87171', '#0ea5e9', '#bdc2ff', '#fbbf24', '#4ade80'];
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
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: '#64748b', font: { size: 10 } } } },
        scales: {
          y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b' } },
          x: { grid: { display: false }, ticks: { color: '#64748b' } }
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
