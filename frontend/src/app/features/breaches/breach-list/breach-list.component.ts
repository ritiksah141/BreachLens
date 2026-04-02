import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgClass, SlicePipe, DecimalPipe, TitleCasePipe, CommonModule } from '@angular/common';
import { BreachService } from '../../../core/services/breach.service';
import { Breach, BreachFilterParams } from '../../../core/models/models';
import { SeverityBadgeComponent } from '../../../shared/components/severity-badge/severity-badge.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

const SESSION_KEY = 'bl_breach_filters';

@Component({
  selector: 'app-breach-list',
  standalone: true,
  imports: [RouterLink, FormsModule, NgClass, SlicePipe, DecimalPipe, TitleCasePipe, SeverityBadgeComponent, PaginationComponent, CommonModule],
  template: `
    <div class="d-flex justify-content-between align-items-end mb-4">
      <div>
        <h2 class="font-headline fw-extrabold text-on-surface tracking-tight mb-1">Active Breaches</h2>
        <p class="text-on-surface-variant mb-0 small">Monitoring global leak sites and dark web forums in real-time.</p>
      </div>
      <div class="text-end">
        <div class="text-xs-caps text-primary mb-1">Total Records</div>
        <div class="font-headline fw-bold text-on-surface fs-4">{{ total | number }}</div>
      </div>
    </div>

    <!-- Filter bar -->
    <div class="glass-panel p-3 rounded-3 mb-4 border border-outline-variant border-opacity-10 shadow-lg">
      <div class="row g-3">
        <div class="col-md-4">
          <div class="input-group">
            <span class="input-group-text bg-surface-container-low border-0 text-on-surface-variant">
              <span class="material-symbols-outlined fs-6">search</span>
            </span>
            <input
              class="form-control bg-surface-container-low border-0 ps-0 text-xs-caps"
              type="text"
              placeholder="SEARCH_DATABASE..."
              [(ngModel)]="filters.search"
              (input)="onSearchChange()"
              style="font-size: 10px;"
            />
          </div>
        </div>
        <div class="col-md-2">
          <select
            class="form-select bg-surface-container-low border-0 text-xs-caps"
            [(ngModel)]="filters.severity"
            (change)="applyFilters()"
            style="font-size: 10px;"
          >
            <option value="">ALL_SEVERITIES</option>
            @for (s of severities; track s) {
              <option [value]="s">{{ s | uppercase }}</option>
            }
          </select>
        </div>
        <div class="col-md-2">
          <select
            class="form-select bg-surface-container-low border-0 text-xs-caps"
            [(ngModel)]="filters.industry"
            (change)="applyFilters()"
            style="font-size: 10px;"
          >
            <option value="">ALL_INDUSTRIES</option>
            @for (i of industries; track i) {
              <option [value]="i">{{ i | uppercase }}</option>
            }
          </select>
        </div>
        <div class="col-md-2">
          <select
            class="form-select bg-surface-container-low border-0 text-xs-caps"
            [(ngModel)]="filters.sort_by"
            (change)="applyFilters()"
            style="font-size: 10px;"
          >
            <option value="created_at">DATE_ADDED</option>
            <option value="risk_score">RISK_SCORE</option>
            <option value="affected_records_count">RECORDS</option>
          </select>
        </div>
        <div class="col-md-2 d-flex gap-2">
          <button class="btn btn-dark bg-surface-container-highest border-0 flex-grow-1 text-xs-caps py-2" (click)="toggleOrder()">
            {{ filters.order === 'desc' ? 'DESC' : 'ASC' }}
          </button>
          <button class="btn btn-outline-secondary border-outline-variant border-opacity-25 text-xs-caps py-2" (click)="resetFilters()">
            RESET
          </button>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    @if (loading) {
      <div class="text-center py-5 glass-panel rounded-3 border border-outline-variant border-opacity-10">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="text-on-surface-variant text-xs-caps mt-3">Synchronizing breach telemetry...</p>
      </div>
    }

    <!-- Breach Table -->
    @if (!loading && !error) {
      <div class="glass-panel rounded-3 overflow-hidden border border-outline-variant border-opacity-10 shadow-lg">
        <div class="table-responsive">
          <table class="table table-dark table-hover mb-0 align-middle custom-terminal-table">
            <thead>
              <tr class="bg-surface-container-low">
                <th class="ps-4 text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 9px;">Severity</th>
                <th class="text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 9px;">Event_Identifier</th>
                <th class="text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 9px;">Records</th>
                <th class="text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 9px;">Date_Detected</th>
                <th class="text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 9px;">Status</th>
                <th class="pe-4 border-0"></th>
              </tr>
            </thead>
            <tbody class="border-top-0">
              @for (breach of breaches; track breach._id) {
                <tr class="bg-transparent" style="cursor: pointer;" [routerLink]="['/breaches', breach._id]">
                  <td class="ps-4">
                    <div class="d-flex align-items-center gap-2">
                      <span class="severity-bar" [ngClass]="'bg-' + severityBorder(breach.severity)"></span>
                      <span class="text-xs-caps fw-bold" [ngClass]="'text-' + severityBorder(breach.severity)">{{ breach.severity }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="d-flex align-items-center gap-3">
                      <div class="p-2 bg-surface-container-highest rounded-2">
                        <span class="material-symbols-outlined fs-6 text-on-surface-variant">
                          {{ getIcon(breach.industry) }}
                        </span>
                      </div>
                      <div>
                        <div class="fw-bold text-white small">{{ breach.title }}</div>
                        <div class="text-on-surface-variant" style="font-size: 9px;">ORG: {{ breach.organisation || 'UNKNOWN' }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="font-mono text-on-surface-variant small">{{ breach.affected_records_count | number }}</td>
                  <td class="text-on-surface-variant small">{{ breach.breach_date | slice:0:10 }}</td>
                  <td>
                    <div class="d-flex align-items-center gap-2">
                      <span class="p-1 rounded-circle bg-primary opacity-75" [class.animate-pulse]="breach.status === 'investigating'"></span>
                      <span class="text-xs-caps small text-on-surface-variant">{{ breach.status || 'LOGGED' }}</span>
                    </div>
                  </td>
                  <td class="pe-4 text-end">
                    <span class="material-symbols-outlined text-on-surface-variant fs-5">chevron_right</span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (breaches.length === 0) {
          <div class="text-center py-5 text-on-surface-variant">
            <span class="material-symbols-outlined fs-1 opacity-25 mb-3">database_off</span>
            <p class="text-xs-caps">No telemetry matches your current filter set.</p>
          </div>
        }
      </div>

      <div class="mt-4 d-flex justify-content-center pb-5">
        <app-pagination
          [currentPage]="filters.page ?? 1"
          [totalPages]="totalPages"
          (pageChange)="onPageChange($event)"
        />
      </div>
    }
  `,
  styles: [`
    .text-xs-caps { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; }
    .custom-terminal-table { background-color: transparent !important; }
    .custom-terminal-table tr { border-bottom: 1px solid rgba(62, 72, 80, 0.2); transition: all 0.2s; }
    .custom-terminal-table tr:hover { background-color: rgba(123, 208, 255, 0.03) !important; }
    .severity-bar { width: 4px; height: 16px; border-radius: 2px; }

    .bg-critical { background-color: var(--tertiary-container) !important; box-shadow: 0 0 10px rgba(248, 113, 113, 0.4); }
    .bg-high { background-color: #fb923c !important; }
    .bg-medium { background-color: #fbbf24 !important; }
    .bg-low { background-color: var(--primary) !important; }
    .bg-informational { background-color: var(--on-surface-variant) !important; }

    .text-critical { color: var(--tertiary-container) !important; }
    .text-high { color: #fb923c !important; }
    .text-medium { color: #fbbf24 !important; }
    .text-low { color: var(--primary) !important; }
    .text-informational { color: var(--on-surface-variant) !important; }

    .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
  `],
})
export class BreachListComponent implements OnInit {
  private breachService = inject(BreachService);

  breaches: Breach[] = [];
  total = 0;
  totalPages = 1;
  loading = false;
  error = '';

  filters: BreachFilterParams = {
    page: 1,
    limit: 12,
    search: '',
    severity: '',
    status: '',
    industry: '',
    sort_by: 'created_at',
    order: 'desc',
  };

  severities = ['critical', 'high', 'medium', 'low', 'informational'];
  statuses = ['open', 'investigating', 'contained', 'resolved', 'closed'];
  industries = [
    'Finance', 'Healthcare', 'Technology', 'Retail', 'Education',
    'Government', 'Energy', 'Telecommunications', 'Legal', 'Other',
  ];

  private searchTimer: any;

  ngOnInit(): void {
    this.restoreFilters();
    this.loadBreaches();
  }

  loadBreaches(): void {
    this.loading = true;
    this.error = '';
    this.saveFilters();

    this.breachService.getBreaches(this.filters).subscribe({
      next: (res: any) => {
        this.breaches = res.data ?? [];
        this.total = res.meta?.total ?? 0;
        this.totalPages = res.meta?.total_pages ?? 1;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'Failed to load breaches.';
        this.loading = false;
      },
    });
  }

  applyFilters(): void {
    this.filters.page = 1;
    this.loadBreaches();
  }

  onSearchChange(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.applyFilters(), 350);
  }

  onPageChange(page: number): void {
    this.filters.page = page;
    this.loadBreaches();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleOrder(): void {
    this.filters.order = this.filters.order === 'desc' ? 'asc' : 'desc';
    this.applyFilters();
  }

  resetFilters(): void {
    this.filters = {
      page: 1, limit: 12, search: '', severity: '',
      status: '', industry: '', sort_by: 'created_at', order: 'desc',
    };
    this.loadBreaches();
  }

  severityBorder(s: string): string {
    return s?.toLowerCase() ?? 'informational';
  }

  getIcon(industry: string): string {
    switch (industry?.toLowerCase()) {
      case 'finance': return 'payments';
      case 'healthcare': return 'medical_services';
      case 'technology': return 'computer';
      case 'government': return 'account_balance';
      case 'retail': return 'shopping_cart';
      default: return 'database';
    }
  }

  // Persist filter state in sessionStorage so page refresh restores it
  private saveFilters(): void {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(this.filters));
  }

  private restoreFilters(): void {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) this.filters = { ...this.filters, ...JSON.parse(saved) };
    } catch {
      /* ignore */
    }
  }
}
