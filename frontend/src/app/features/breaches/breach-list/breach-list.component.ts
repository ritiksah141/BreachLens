import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgClass, SlicePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { BreachService } from '../../../core/services/breach.service';
import { Breach, BreachFilterParams } from '../../../core/models/models';
import { SeverityBadgeComponent } from '../../../shared/components/severity-badge/severity-badge.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

const SESSION_KEY = 'bl_breach_filters';

@Component({
  selector: 'app-breach-list',
  standalone: true,
  imports: [RouterLink, FormsModule, NgClass, SlicePipe, DecimalPipe, TitleCasePipe, SeverityBadgeComponent, PaginationComponent],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h2 class="fw-bold mb-0">
        <span class="text-danger">⬡</span> Breach Intelligence
      </h2>
      <small class="text-muted">{{ total }} records found</small>
    </div>

    <!-- Filter bar -->
    <div class="card bg-dark border-secondary mb-4">
      <div class="card-body">
        <div class="row g-2">
          <div class="col-md-4">
            <input
              class="form-control form-control-sm bg-dark text-light border-secondary"
              type="text"
              placeholder="Search breaches..."
              [(ngModel)]="filters.search"
              (input)="onSearchChange()"
            />
          </div>
          <div class="col-md-2">
            <select
              class="form-select form-select-sm bg-dark text-light border-secondary"
              [(ngModel)]="filters.severity"
              (change)="applyFilters()"
            >
              <option value="">All severities</option>
              @for (s of severities; track s) {
                <option [value]="s">{{ s | titlecase }}</option>
              }
            </select>
          </div>
          <div class="col-md-2">
            <select
              class="form-select form-select-sm bg-dark text-light border-secondary"
              [(ngModel)]="filters.status"
              (change)="applyFilters()"
            >
              <option value="">All statuses</option>
              @for (s of statuses; track s) {
                <option [value]="s">{{ s | titlecase }}</option>
              }
            </select>
          </div>
          <div class="col-md-2">
            <select
              class="form-select form-select-sm bg-dark text-light border-secondary"
              [(ngModel)]="filters.industry"
              (change)="applyFilters()"
            >
              <option value="">All industries</option>
              @for (i of industries; track i) {
                <option [value]="i">{{ i }}</option>
              }
            </select>
          </div>
          <div class="col-md-2">
            <select
              class="form-select form-select-sm bg-dark text-light border-secondary"
              [(ngModel)]="filters.sort_by"
              (change)="applyFilters()"
            >
              <option value="created_at">Date added</option>
              <option value="risk_score">Risk score</option>
              <option value="affected_records_count">Records affected</option>
              <option value="breach_date">Breach date</option>
            </select>
          </div>
        </div>
        <div class="d-flex gap-2 mt-2">
          <button class="btn btn-sm btn-outline-secondary" (click)="resetFilters()">
            Clear filters
          </button>
          <button class="btn btn-sm btn-outline-secondary" (click)="toggleOrder()">
            {{ filters.order === 'desc' ? '↓ Descending' : '↑ Ascending' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    @if (loading) {
      <div class="text-center py-5">
        <div class="spinner-border text-danger" role="status"></div>
        <p class="text-muted mt-2">Loading breaches...</p>
      </div>
    }

    <!-- Error state -->
    @if (error) {
      <div class="alert alert-danger">{{ error }}</div>
    }

    <!-- Breach cards -->
    @if (!loading && !error) {
      <div class="row g-3">
        @for (breach of breaches; track breach._id) {
          <div class="col-md-6 col-xl-4">
            <div
              class="card h-100 bg-dark border-secondary breach-card"
              [ngClass]="'border-' + severityBorder(breach.severity)"
              style="border-left-width: 3px !important;"
            >
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <app-severity-badge [severity]="breach.severity" />
                  <small class="text-muted">
                    {{ breach.breach_date | slice:0:10 }}
                  </small>
                </div>
                <h6 class="card-title text-light mb-1">{{ breach.title }}</h6>
                <p class="text-muted small mb-2">
                  {{ breach.organisation || 'Unknown org' }} · {{ breach.industry }}
                </p>
                <p class="text-muted small mb-3" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
                  {{ breach.description }}
                </p>
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <span class="badge bg-secondary me-1">
                      {{ breach.affected_records_count | number }} records
                    </span>
                    @if (breach.risk_score != null) {
                      <span
                        class="badge"
                        [ngClass]="riskBadge(breach.risk_score)"
                      >
                        Risk {{ breach.risk_score }}
                      </span>
                    }
                  </div>
                  <a
                    [routerLink]="['/breaches', breach._id]"
                    class="btn btn-sm btn-outline-danger"
                  >
                    View →
                  </a>
                </div>
              </div>
            </div>
          </div>
        }

        @if (breaches.length === 0) {
          <div class="col-12 text-center py-5 text-muted">
            <p class="fs-5">No breaches match your filters.</p>
            <button class="btn btn-outline-secondary btn-sm" (click)="resetFilters()">
              Clear filters
            </button>
          </div>
        }
      </div>

      <div class="mt-4 d-flex justify-content-center">
        <app-pagination
          [currentPage]="filters.page ?? 1"
          [totalPages]="totalPages"
          (pageChange)="onPageChange($event)"
        />
      </div>
    }
  `,
  styles: [`
    .breach-card { transition: transform 0.15s ease, box-shadow 0.15s ease; }
    .breach-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(220,53,69,0.15); }
    .border-critical { border-color: #dc3545 !important; }
    .border-high { border-color: #ffc107 !important; }
    .border-medium { border-color: #0d6efd !important; }
    .border-low { border-color: #198754 !important; }
    .border-informational { border-color: #6c757d !important; }
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

  riskBadge(score: number): string {
    if (score >= 8) return 'bg-danger';
    if (score >= 6) return 'bg-warning text-dark';
    if (score >= 4) return 'bg-primary';
    return 'bg-success';
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
