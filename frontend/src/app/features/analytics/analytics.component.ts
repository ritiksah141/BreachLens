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
    <div class="row g-4 mb-4 mt-2">
      <!-- Header -->
      <div class="col-12">
        <div class="glass-panel p-4 shadow-lg border-0 d-flex justify-content-between align-items-center">
          <div>
            <h2 class="font-headline fw-extrabold text-on-surface tracking-tight page-title mb-1">Intelligence & Analytics</h2>
            <p class="page-subtitle mb-0 opacity-75">Advanced Data Surface Visualization</p>
          </div>
          <div class="d-flex align-items-center gap-3">
             <span class="badge py-2 px-3 text-xs-caps shadow-sm d-flex align-items-center gap-2"
                   style="background: var(--surface-container-highest); border: 1px solid var(--primary); color: var(--primary);">
                <span class="material-symbols-outlined fs-6">analytics</span>
                REAL-TIME METRICS
             </span>
          </div>
        </div>
      </div>

      <!-- Top Row Charts -->
      <div class="col-lg-6">
        <div class="glass-panel p-4 shadow-lg h-100 border-0 d-flex flex-column">
          <h5 class="text-xs-caps mb-3">Top Organisations Targeted</h5>
          <div class="flex-grow-1 position-relative" style="min-height: 250px;">
            <canvas #orgsChart></canvas>
          </div>
        </div>
      </div>

      <div class="col-lg-6">
        <div class="glass-panel p-4 shadow-lg h-100 border-0 d-flex flex-column">
          <h5 class="text-xs-caps mb-3">Risk Distribution</h5>
          <div class="flex-grow-1 position-relative" style="min-height: 250px;">
            <canvas #riskChart></canvas>
          </div>
        </div>
      </div>

      <!-- Middle Row Charts -->
      <div class="col-lg-8">
        <div class="glass-panel p-4 shadow-lg h-100 border-0 d-flex flex-column">
          <h5 class="text-xs-caps mb-3">Industry vs Year Correlation</h5>
          <div class="flex-grow-1 position-relative" style="min-height: 350px;">
            <canvas #industryYearChart></canvas>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="glass-panel p-4 shadow-lg h-100 border-0 d-flex flex-column">
          <h5 class="text-xs-caps mb-3">Exposed Data Frequency</h5>
          <div class="flex-grow-1 position-relative" style="min-height: 350px;">
             @if (loadingDataTypes) {
               <div class="position-absolute top-50 start-50 translate-middle">
                 <div class="spinner-border spinner-border-sm text-primary"></div>
               </div>
             }
             <div class="list-group list-group-flush overflow-auto custom-scrollbar h-100" style="max-height: 350px;">
               @for (dt of dataTypes; track dt.data_type; let i = $index) {
                 <div class="list-group-item bg-transparent border-outline-variant border-opacity-10 px-0 py-2 border-0">
                   <div class="d-flex justify-content-between mb-1">
                      <span class="text-xs-caps opacity-75 font-mono" style="font-size: 9px;">{{ dt.data_type.split('_').join(' ') | uppercase }}</span>
                      <span class="text-xs-caps fw-bold text-primary" style="font-size: 9px;">{{ dt.count }} INCIDENTS</span>
                   </div>
                   <div class="progress bg-surface-container-high" style="height: 3px;">
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
    .custom-scrollbar::-webkit-scrollbar { width: 3px; }
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
    if (!this.orgsChartRef) return;
    const Chart = await this.getChart();
    const style = getComputedStyle(document.documentElement);
    this.charts[0]?.destroy();

    const labels = this.orgsData.map(d => d.organisation || 'Unknown');
    const counts = this.orgsData.map(d => d.total_records_exposed);

    const ctx = this.orgsChartRef.nativeElement.getContext('2d');
    const gradient = ctx?.createLinearGradient(0, 0, 400, 0);
    if (gradient) {
      gradient.addColorStop(0, style.getPropertyValue('--error').trim());
      gradient.addColorStop(1, style.getPropertyValue('--error-container').trim());
    }

    this.charts[0] = new Chart(this.orgsChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Records Exposed',
          data: counts,
          backgroundColor: gradient || style.getPropertyValue('--error').trim(),
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
            titleFont: { family: 'JetBrains Mono', size: 10 },
            bodyFont: { family: 'Inter', size: 11 },
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: style.getPropertyValue('--on-surface-variant'), font: { size: 9 } }
          },
          y: {
            grid: { display: false },
            ticks: { color: style.getPropertyValue('--on-surface-variant'), font: { size: 10, family: 'Inter' } }
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
    if (gradient) {
      gradient.addColorStop(0, style.getPropertyValue('--warning').trim() + '44');
      gradient.addColorStop(1, 'transparent');
    }

    this.charts[1] = new Chart(this.riskChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Incidents',
          data: counts,
          borderColor: style.getPropertyValue('--warning').trim(),
          backgroundColor: gradient || 'transparent',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: style.getPropertyValue('--warning').trim(),
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
          x: { grid: { display: false }, ticks: { color: style.getPropertyValue('--on-surface-variant'), font: { size: 9 } } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: style.getPropertyValue('--on-surface-variant'), font: { size: 9 } } }
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

    const colors = [
       style.getPropertyValue('--primary').trim(),
       style.getPropertyValue('--secondary').trim(),
       style.getPropertyValue('--tertiary').trim() || '#7bd0ff',
       style.getPropertyValue('--warning').trim(),
       style.getPropertyValue('--success').trim(),
       style.getPropertyValue('--error').trim(),
    ];

    const datasets = industries.map((ind, i) => {
       const dataPoints = years.map(y => {
          const match = this.industryYearData.find(d => d.year === y && d.industry === ind);
          return match ? match.breach_count : 0;
       });
       return {
          label: ind.split('_').join(' ').toUpperCase(),
          data: dataPoints,
          backgroundColor: colors[i % colors.length],
          borderColor: 'transparent',
          borderWidth: 0,
          borderRadius: 2,
          stack: 'Stack 0',
       };
    });

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
              color: style.getPropertyValue('--on-surface'),
              font: { size: 8, family: 'Inter', weight: 'bold' },
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 15
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.9)',
            padding: 10,
            cornerRadius: 4
          }
        },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { color: style.getPropertyValue('--on-surface-variant'), font: { size: 9 } } },
          y: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: style.getPropertyValue('--on-surface-variant'), font: { size: 9 } } }
        }
      }
    });
  }
}
