import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy, inject, effect } from '@angular/core';
import { CommonModule, DecimalPipe, PercentPipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnalyticsService } from '../../core/services/analytics.service';
import { ThemeService } from '../../core/services/theme.service';
import { NotificationService } from '../../core/services/notification.service';
import { CompactNumberPipe } from '../../shared/pipes/compact-number.pipe';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, PercentPipe, TitleCasePipe, CompactNumberPipe],
  template: `
    <!-- Page Header -->
    <div class="glass-panel p-4 mb-4 shadow-lg border-0 d-flex justify-content-between align-items-center animate__animated animate__fadeIn">
      <div class="title-wrapper">
        <h2 class="page-title mb-1">
          <span class="material-symbols-outlined text-primary opacity-50 me-2" style="font-size: 24px;">monitoring</span>
          Intelligence & Analytics
        </h2>
        <p class="text-xs-caps mb-0 text-on-surface-variant opacity-75" style="font-size: 7px; letter-spacing: 0.1em;">Advanced cross-sector visualization and surface-level vulnerability mapping.</p>
      </div>
      <div class="d-flex align-items-center gap-3">
         <span class="badge py-2 px-3 text-xs-caps shadow-sm d-flex align-items-center gap-2"
               style="background: var(--surface-container-highest); border: 1px solid var(--primary); color: var(--primary); font-size: 8px;">
            <span class="material-symbols-outlined fs-6">monitoring</span>
            LIVE METRICS
         </span>
      </div>
    </div>

    <div class="row g-4 mb-5 animate__animated animate__fadeIn" style="animation-delay: 0.1s;">
      <!-- Top Row Charts -->
      <div class="col-lg-6">
        <div class="glass-panel p-4 shadow-lg h-100 border-0 d-flex flex-column">
          <h5 class="text-xs-caps mb-3 text-on-surface" style="font-size: 8px;">Top Organisations Targeted</h5>
          <div class="flex-grow-1 position-relative" style="min-height: 250px;">
            <canvas #orgsChart></canvas>
          </div>
        </div>
      </div>

      <div class="col-lg-6">
        <div class="glass-panel p-4 shadow-lg h-100 border-0 d-flex flex-column">
          <h5 class="text-xs-caps mb-3 text-on-surface" style="font-size: 8px;">Risk Distribution</h5>
          <div class="flex-grow-1 position-relative" style="min-height: 250px;">
            <canvas #riskChart></canvas>
          </div>
        </div>
      </div>

      <!-- Middle Row Charts -->
      <div class="col-lg-8">
        <div class="glass-panel p-4 shadow-lg h-100 border-0 d-flex flex-column">
          <h5 class="text-xs-caps mb-3 text-on-surface" style="font-size: 8px;">Industry vs Year Correlation</h5>
          <div class="flex-grow-1 position-relative" style="min-height: 350px;">
            <canvas #industryYearChart></canvas>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="glass-panel p-4 shadow-lg h-100 border-0 d-flex flex-column">
          <h5 class="text-xs-caps mb-3 text-on-surface" style="font-size: 8px;">Exposed Data Frequency</h5>
          <div class="flex-grow-1 overflow-auto custom-scrollbar-hidden pe-1" style="max-height: 350px;">
             @if (loadingDataTypes) {
               <div class="text-center py-5">
                 <div class="spinner-border spinner-border-sm text-primary"></div>
               </div>
             }
             <div class="d-flex flex-column gap-2">
               @for (dt of dataTypes; track dt.data_type; let i = $index) {
                 <div class="p-2 rounded bg-surface-container-high border border-outline-variant border-opacity-10 shadow-sm transition-all hover-glow cursor-pointer">
                   <div class="d-flex justify-content-between mb-1">
                      <span class="text-xs-caps text-on-surface opacity-75" style="font-size: 7px;">{{ dt.data_type.split('_').join(' ') | uppercase }}</span>
                      <span class="text-xs-caps fw-bold text-primary" style="font-size: 7px;">{{ dt.count }}</span>
                   </div>
                   <div class="progress bg-white bg-opacity-5" style="height: 2px;">
                      <div class="progress-bar bg-primary" [style.width.%]="(dt.count / maxDataTypesCount) * 100"></div>
                   </div>
                 </div>
               }
             </div>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; }
    .text-xs-caps { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; }
    .custom-scrollbar-hidden::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar-hidden::-webkit-scrollbar-thumb { background: transparent; border-radius: 10px; }
    .custom-scrollbar-hidden:hover::-webkit-scrollbar-thumb { background: var(--outline-variant); }

    .hover-glow:hover {
       background-color: var(--surface-container-highest) !important;
       border-color: var(--primary) !important;
       transform: translateX(4px);
    }
  `]
})
export class AnalyticsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('orgsChart') orgsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('riskChart') riskChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('industryYearChart') industryYearChartRef!: ElementRef<HTMLCanvasElement>;

  private analytics = inject(AnalyticsService);
  private themeService = inject(ThemeService);
  private notifications = inject(NotificationService);

  private charts: any[] = [];
  private viewReady = false;

  dataTypes: any[] = [];
  loadingDataTypes = true;
  maxDataTypesCount = 1;

  orgsData: any[] = [];
  riskData: any[] = [];
  industryYearData: any[] = [];

  private _themeWatcher = effect(() => {
    this.themeService.theme();
    if (this.viewReady) this.renderAllCharts();
  });

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
    this.analytics.getTopOrganisations(10).subscribe({
      next: (res) => {
        this.orgsData = res.data;
        if (this.viewReady) this.renderOrgsChart();
      }
    });

    this.analytics.getRiskScores(10).subscribe({
      next: (res) => {
        this.riskData = res.data;
        if (this.viewReady) this.renderRiskChart();
      }
    });

    this.analytics.getIndustryYearTrend().subscribe({
      next: (res) => {
        this.industryYearData = res.data;
        if (this.viewReady) this.renderIndustryYearChart();
      }
    });

    this.analytics.getDataTypesFrequency().subscribe({
      next: (res) => {
        this.dataTypes = res.data;
        this.maxDataTypesCount = Math.max(...this.dataTypes.map(d => d.count), 1);
        this.loadingDataTypes = false;
      },
      error: () => this.loadingDataTypes = false
    });
  }

  private renderAllCharts(): void {
    if (this.orgsData.length) this.renderOrgsChart();
    if (this.riskData.length) this.renderRiskChart();
    if (this.industryYearData.length) this.renderIndustryYearChart();
  }

  private async getChart() {
    const mod = await import('chart.js/auto');
    return mod.default;
  }

  private async renderOrgsChart() {
    if (!this.orgsChartRef || !this.orgsData.length) return;
    const Chart = await this.getChart();
    const style = getComputedStyle(document.documentElement);
    this.charts[0]?.destroy();

    const labels = this.orgsData.map(d => d.organisation || 'Unknown');
    const counts = this.orgsData.map(d => d.total_records_exposed);

    const ctx = this.orgsChartRef.nativeElement.getContext('2d');
    const gradient = ctx?.createLinearGradient(0, 0, 400, 0);

    const colorError = style.getPropertyValue('--error').trim() || '#ef4444';
    const colorCritical = style.getPropertyValue('--severity-critical').trim() || '#dc2626';

    if (gradient) {
      gradient.addColorStop(0, colorError);
      gradient.addColorStop(1, colorCritical);
    }

    this.charts[0] = new Chart(this.orgsChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Records Exposed',
          data: counts,
          backgroundColor: gradient || colorError,
          borderRadius: 4,
          borderWidth: 0
        }]
      },
      options: {
        indexAxis: 'y',
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.9)',
            titleFont: { family: 'Inter', size: 10 },
            bodyFont: { family: 'Inter', size: 11 },
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: style.getPropertyValue('--on-surface-variant') || '#94a3b8', font: { size: 9 } }
          },
          y: {
            grid: { display: false },
            ticks: { color: style.getPropertyValue('--on-surface-variant') || '#94a3b8', font: { size: 10, family: 'Inter' } }
          }
        }
      }
    });
  }

  private async renderRiskChart() {
    if (!this.riskChartRef) return;
    const Chart = await this.getChart();
    const style = getComputedStyle(document.documentElement);
    this.charts[1]?.destroy();

    const labels = this.riskData.map(d => {
      const binStart = d._id;
      if (typeof binStart !== 'number') return 'Other';
      return `${binStart.toFixed(1)} - ${(binStart + (10/this.riskData.length)).toFixed(1)}`;
    });
    const counts = this.riskData.map(d => d.count);

    const ctx = this.riskChartRef.nativeElement.getContext('2d');
    const gradient = ctx?.createLinearGradient(0, 0, 0, 400);
    const colorWarning = style.getPropertyValue('--warning').trim() || '#f59e0b';
    const colorSurfaceVariant = style.getPropertyValue('--on-surface-variant').trim() || '#94a3b8';

    if (gradient) {
      gradient.addColorStop(0, colorWarning + '44');
      gradient.addColorStop(1, 'transparent');
    }

    this.charts[1] = new Chart(this.riskChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Incidents',
          data: counts,
          borderColor: colorWarning,
          backgroundColor: gradient || 'transparent',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: colorWarning,
          pointRadius: 2
        }]
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.9)',
            displayColors: false
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: colorSurfaceVariant, font: { size: 9 } } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: colorSurfaceVariant, font: { size: 9 } } }
        }
      }
    });
  }

  private async renderIndustryYearChart() {
    if (!this.industryYearChartRef) return;
    const Chart = await this.getChart();
    const style = getComputedStyle(document.documentElement);
    this.charts[2]?.destroy();

    // Grouping data by industry
    const years = [...new Set(this.industryYearData.map(d => d.year))].sort();
    const industries = [...new Set(this.industryYearData.map(d => d.industry))];

    // High-contrast, theme-aware palette for industries
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

    // Professional qualitative palette
    const colorPalette = isDark ? [
      '#60a5fa', // blue 400
      '#34d399', // emerald 400
      '#fbbf24', // amber 400
      '#f87171', // red 400
      '#a78bfa', // violet 400
      '#22d3ee', // cyan 400
      '#f472b6', // pink 400
      '#fb923c', // orange 400
    ] : [
      '#2563eb', // blue 600
      '#059669', // emerald 600
      '#d97706', // amber 600
      '#dc2626', // red 600
      '#7c3aed', // violet 600
      '#0891b2', // cyan 600
      '#db2777', // pink 600
      '#ea580c', // orange 600
    ];

    const datasets = industries.map((ind, i) => {
       const dataPoints = years.map(y => {
          const match = this.industryYearData.find(d => d.year === y && d.industry === ind);
          return match ? match.breach_count : 0;
       });
       return {
          label: ind.split('_').join(' ').toUpperCase(),
          data: dataPoints,
          backgroundColor: colorPalette[i % colorPalette.length],
          borderColor: 'transparent',
          borderWidth: 0,
          borderRadius: 2,
          stack: 'Stack 0',
       };
    });

    const colorOnSurface = style.getPropertyValue('--on-surface').trim() || (isDark ? '#f1f5f9' : '#0f172a');
    const colorOnSurfaceVariant = style.getPropertyValue('--on-surface-variant').trim() || (isDark ? '#94a3b8' : '#475569');
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

    this.charts[2] = new Chart(this.industryYearChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: years,
        datasets: datasets
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              color: colorOnSurface,
              font: { size: 9, family: 'Inter', weight: 600 },
              usePointStyle: true,
              pointStyle: 'rectRounded',
              padding: 15
            }
          },
          tooltip: {
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            titleColor: isDark ? '#fff' : '#0f172a',
            bodyColor: isDark ? '#cbd5e1' : '#475569',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            titleFont: { size: 12, weight: 'bold' },
            bodyFont: { size: 11 }
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { color: colorOnSurfaceVariant, font: { size: 10 } }
          },
          y: {
            stacked: true,
            grid: { color: gridColor },
            ticks: { color: colorOnSurfaceVariant, font: { size: 10 } }
          }
        }
      }
    });
  }
}
