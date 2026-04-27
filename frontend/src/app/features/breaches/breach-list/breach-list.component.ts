import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgClass, SlicePipe, DecimalPipe, TitleCasePipe, CommonModule, UpperCasePipe } from '@angular/common';
import { BreachService } from '../../../core/services/breach.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Breach, BreachFilterParams, SubdocumentQueryParams } from '../../../core/models/models';
import { SeverityBadgeComponent } from '../../../shared/components/severity-badge/severity-badge.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';
import { CompactNumberPipe } from '../../../shared/pipes/compact-number.pipe';

@Component({
  selector: 'app-breach-list',
  standalone: true,
  imports: [
    RouterLink, FormsModule, NgClass, SlicePipe, DecimalPipe,
    TitleCasePipe, CommonModule, SeverityBadgeComponent,
    PaginationComponent, TimeAgoPipe, CompactNumberPipe, UpperCasePipe
  ],
  template: `
    <!-- Page Header -->
    <div class="glass-panel p-4 mb-4 shadow-lg border-0 d-flex justify-content-between align-items-center animate__animated animate__fadeIn">
      <div>
        <h2 class="font-headline fw-extrabold text-on-surface tracking-tight page-title mb-1">Incursion Log</h2>
        <p class="text-xs-caps mb-0 text-on-surface-variant opacity-75" style="font-size: 7px; letter-spacing: 0.1em;">Real-time intelligence feed from verified breach sources.</p>
      </div>
      <div class="text-end d-none d-md-block">
        <div class="text-xs-caps text-primary mb-1" style="font-size: 7px;">TRACKED INCIDENTS</div>
        <div class="font-headline fw-bold text-on-surface fs-4">{{ total | number }}</div>
      </div>
    </div>

    <!-- Main Filter Bar -->
    <div class="glass-panel p-4 mb-4 border-0 shadow-lg animate__animated animate__fadeIn" style="animation-delay: 0.1s;">
      <div class="row g-3 align-items-end">
        <div class="col-lg-3 col-md-6 position-relative">
          <label class="text-xs-caps text-on-surface-variant mb-2 d-block" style="font-size: 7px;">INTEL SEARCH</label>
          <div class="input-group">
            <span class="input-group-text bg-surface-container-high border-0 text-primary">
              <span class="material-symbols-outlined fs-6">search</span>
            </span>
            <input
              class="form-control bg-surface-container-high border-0 text-on-surface"
              type="text"
              placeholder="Query database..."
              [(ngModel)]="filters.search"
              (input)="onSearchInput()"
              (focus)="onSearchFocus()"
              (blur)="onSearchBlur()"
              style="font-size: 11px; height: 38px;"
              autocomplete="off"
            />
          </div>
          @if (showSearchSuggestions && searchSuggestions.length) {
            <div class="list-group position-absolute w-100 mt-1 shadow-lg suggestion-popover z-3">
              @for (s of searchSuggestions; track s.title + s.organisation) {
                <button
                  type="button"
                  class="list-group-item list-group-item-action bg-surface-container-highest text-on-surface border-outline-variant border-opacity-10 py-2 px-3"
                  (mousedown)="$event.preventDefault()"
                  (click)="applySearchSuggestion(s)"
                >
                  <div class="fw-bold small">{{ s.title }}</div>
                  <div class="text-xs-caps opacity-50" style="font-size: 7px;">{{ s.organisation }}</div>
                </button>
              }
            </div>
          }
        </div>

        <div class="col-lg-2 col-md-3">
          <label class="text-xs-caps text-on-surface-variant mb-2 d-block" style="font-size: 7px;">SEVERITY</label>
          <select class="form-select bg-surface-container-high border-0 text-on-surface" style="font-size: 11px; height: 38px;" [(ngModel)]="filters.severity" (change)="applyFilters()">
            <option value="">ALL LEVELS</option>
            @for (s of severities; track s) { <option [value]="s">{{ s | uppercase }}</option> }
          </select>
        </div>
        <div class="col-lg-2 col-md-3">
          <label class="text-xs-caps text-on-surface-variant mb-2 d-block" style="font-size: 7px;">SECTOR</label>
          <select class="form-select bg-surface-container-high border-0 text-on-surface" style="font-size: 11px; height: 38px;" [(ngModel)]="filters.industry" (change)="applyFilters()">
            <option value="">ALL SECTORS</option>
            @for (i of industries; track i) { <option [value]="i">{{ i | uppercase }}</option> }
          </select>
        </div>
        <div class="col-lg-2 col-md-6">
          <label class="text-xs-caps text-on-surface-variant mb-2 d-block" style="font-size: 7px;">ORDER BY</label>
          <div class="d-flex gap-2">
            <select class="form-select bg-surface-container-high border-0 text-on-surface" style="font-size: 11px; height: 38px;" [(ngModel)]="filters.sort_by" (change)="applyFilters()">
              <option value="created_at">DATE ADDED</option>
              <option value="risk_score">RISK SCORE</option>
              <option value="affected_records_count">RECORDS</option>
            </select>
            <button class="btn btn-dark bg-surface-container-high border-0 text-on-surface" style="width: 42px; height: 38px;" (click)="toggleOrder()">
              <span class="material-symbols-outlined fs-6">{{ filters.order === 'desc' ? 'expand_more' : 'expand_less' }}</span>
            </button>
          </div>
        </div>

        <div class="col-lg-3 col-md-6 d-flex gap-2">
          <button class="btn btn-primary text-on-primary flex-grow-1 fw-bold text-xs-caps" style="height: 38px; font-size: 9px;" (click)="applyFilters()">
            EXECUTE
          </button>
          <button class="btn btn-dark bg-surface-container-highest border-0 text-on-surface flex-grow-1 text-xs-caps" style="height: 38px; font-size: 9px;" (click)="resetFilters()">
            RESET
          </button>
        </div>
      </div>

      <!-- Advanced Filter Trigger & Sliders -->
      <div class="mt-4 pt-3 border-top border-outline-variant border-opacity-5">
        <div class="row g-3 align-items-center">
          <div class="col-md-6 d-flex gap-4">
            <div class="d-flex align-items-center gap-2">
              <span class="text-xs-caps text-on-surface opacity-50" style="font-size: 7px;">MIN RISK</span>
              <input type="number" min="0" max="10" step="0.1" class="form-control bg-surface-container-high border-0 text-center" style="width: 60px; font-size: 10px; height: 28px;" [(ngModel)]="filters.min_risk" (change)="applyFilters()">
            </div>
            <div class="d-flex align-items-center gap-2">
              <span class="text-xs-caps text-on-surface opacity-50" style="font-size: 7px;">MAX RISK</span>
              <input type="number" min="0" max="10" step="0.1" class="form-control bg-surface-container-high border-0 text-center" style="width: 60px; font-size: 10px; height: 28px;" [(ngModel)]="filters.max_risk" (change)="applyFilters()">
            </div>
          </div>
          <div class="col-md-6 d-flex justify-content-end">
            <button class="btn btn-link p-0 text-xs-caps text-primary text-decoration-none d-flex align-items-center gap-2 fw-bold" style="font-size: 8px;" (click)="toggleSubdocumentPanel()">
              <span class="material-symbols-outlined fs-6">{{ showSubdocQuery ? 'close' : 'manage_search' }}</span>
              {{ showSubdocQuery ? 'CLOSE DEEP QUERY' : 'INITIATE DEEP SUBDOCUMENT QUERY' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Deep Query Panel -->
      @if (showSubdocQuery) {
        <div class="mt-3 p-4 bg-surface-container-high rounded-4 border border-primary border-opacity-10 animate__animated animate__fadeIn">
          <div class="row g-3">
            <div class="col-md-3">
              <label class="text-xs-caps text-on-surface opacity-50 mb-2 d-block" style="font-size: 7px;">TIMELINE TYPES</label>
              <input class="form-control bg-surface-container-low border-0 text-on-surface" [(ngModel)]="subdocFilters.timeline_event_types" placeholder="e.g. contained, resolved" style="font-size: 10px;" />
            </div>
            <div class="col-md-3">
              <label class="text-xs-caps text-on-surface opacity-50 mb-2 d-block" style="font-size: 7px;">REMEDIATION STATUS</label>
              <input class="form-control bg-surface-container-low border-0 text-on-surface" [(ngModel)]="subdocFilters.remediation_statuses" placeholder="e.g. pending" style="font-size: 10px;" />
            </div>
            <div class="col-md-3">
              <label class="text-xs-caps text-on-surface opacity-50 mb-2 d-block" style="font-size: 7px;">ALERT SEVERITY</label>
              <input class="form-control bg-surface-container-low border-0 text-on-surface" [(ngModel)]="subdocFilters.alert_severities" placeholder="e.g. critical" style="font-size: 10px;" />
            </div>
            <div class="col-md-3">
              <label class="text-xs-caps text-on-surface opacity-50 mb-2 d-block" style="font-size: 7px;">NOTIFICATIONS</label>
              <select class="form-select bg-surface-container-low border-0 text-on-surface" [(ngModel)]="subdocFilters.account_notified" style="font-size: 10px;">
                <option [ngValue]="undefined">ANY STATE</option>
                <option [ngValue]="true">NOTIFIED</option>
                <option [ngValue]="false">PENDING</option>
              </select>
            </div>
          </div>
          <div class="col-12 d-flex justify-content-end gap-3 mt-4 pt-3 border-top border-outline-variant border-opacity-10">
            <button class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-2 px-4 shadow-sm fw-bold" style="font-size: 8px;" (click)="resetSubdocumentQuery()">RESET QUERY</button>
            <button class="btn btn-primary text-on-primary text-xs-caps py-2 px-4 fw-bold shadow-sm" style="font-size: 8px;" (click)="runSubdocumentQuery()">EXECUTE DEEP SCAN</button>
          </div>
        </div>
      }
    </div>

    <!-- Active Filter Chips Display -->
    <div class="mb-4 d-flex flex-wrap gap-2 align-items-center animate__animated animate__fadeIn" *ngIf="activeFilterChips.length">
      <span class="text-xs-caps text-on-surface opacity-50 me-2" style="font-size: 7px;">ACTIVE FILTERS:</span>
      @for (chip of activeFilterChips; track chip.key) {
        <div class="badge glass-panel border border-outline-variant border-opacity-25 text-on-surface py-2 px-3 d-flex align-items-center gap-2 shadow-sm">
          <span class="text-xs-caps" style="font-size: 7px; letter-spacing: 0.05em;">{{ chip.label | uppercase }}</span>
          <button class="btn-close-tactical border-0 bg-transparent p-0 d-flex" style="width: 14px; height: 14px;" (click)="clearFilter(chip.key)">
            <span class="material-symbols-outlined" style="font-size: 11px !important;">close</span>
          </button>
        </div>
      }
      <button class="btn btn-link text-primary text-xs-caps py-0 text-decoration-none fw-bold" style="font-size: 7px;" (click)="resetFilters()">CLEAR ALL</button>
    </div>

    <!-- Incursion Log Table -->
    <div class="glass-panel border-0 shadow-lg overflow-hidden animate__animated animate__fadeIn" style="animation-delay: 0.2s;">
      <div class="table-responsive custom-scrollbar-hidden">
        <table class="table table-hover mb-0 align-middle">
          <thead>
            <tr class="bg-surface-container-low">
              <th class="ps-4 text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 7px;">THREAT</th>
              <th class="text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 7px;">IDENTITY</th>
              <th class="text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 7px;">RECORDS</th>
              <th class="text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 7px;">DETECTION</th>
              <th class="text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 7px;">STATUS</th>
              <th class="pe-4 border-0"></th>
            </tr>
          </thead>
          <tbody>
            @for (breach of breaches; track breach._id) {
              <tr class="bg-transparent border-bottom border-outline-variant border-opacity-5 transition-all hover-bg-surface-container-high"
                  style="cursor: pointer;" [routerLink]="['/breaches', breach._id]">
                <td class="ps-4">
                  <div class="d-flex align-items-center gap-2">
                    <span class="p-1 rounded-circle shadow-sm" [ngClass]="'bg-' + severityBorder(breach.severity)" style="width: 6px; height: 6px;"></span>
                    <span class="text-xs-caps fw-bold" [ngClass]="'text-' + severityBorder(breach.severity)" style="font-size: 7px;">{{ breach.severity | uppercase }}</span>
                  </div>
                </td>
                <td>
                  <div class="d-flex align-items-center gap-3 py-1">
                    <div class="p-2 bg-surface-container-highest rounded-3 d-flex align-items-center justify-content-center shadow-sm" style="width: 32px; height: 32px;">
                      <span class="material-symbols-outlined fs-6 text-primary">
                        {{ getIcon(breach.industry) }}
                      </span>
                    </div>
                    <div>
                      <div class="fw-bold text-on-surface small" style="font-size: 11px;">{{ breach.title }}</div>
                      <div class="text-xs-caps text-on-surface-variant opacity-50" style="font-size: 7px;">{{ getOrganisationName(breach) | uppercase }}</div>
                    </div>
                  </div>
                </td>
                <td class="text-on-surface font-mono fw-bold" style="font-size: 10px;">{{ breach.affected_records_count | compactNumber }}</td>
                <td class="text-xs-caps text-on-surface opacity-75" style="font-size: 7px;">{{ breach.breach_date | timeAgo | uppercase }}</td>
                <td>
                  <div class="d-flex align-items-center gap-2">
                    <span class="p-1 rounded-circle bg-success shadow-sm" [class.animate-pulse]="breach.status === 'investigating'" style="width: 4px; height: 4px;"></span>
                    <span class="text-xs-caps text-on-surface-variant fw-bold" style="font-size: 7px;">{{ (breach.status || 'LOGGED') | uppercase }}</span>
                  </div>
                </td>
                <td class="pe-4 text-end">
                  <span class="material-symbols-outlined text-primary fs-6 opacity-50">arrow_forward</span>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (loading) {
        <div class="text-center py-5">
          <div class="spinner-border text-primary spinner-border-sm me-2"></div>
          <span class="text-xs-caps text-on-surface-variant" style="font-size: 7px;">SCANNING INTEL...</span>
        </div>
      }

      @if (!loading && breaches.length === 0) {
        <div class="text-center py-5">
          <span class="material-symbols-outlined fs-1 text-on-surface-variant opacity-10 mb-3">database_off</span>
          <p class="text-xs-caps text-on-surface-variant opacity-50" style="font-size: 8px;">No intelligence found matching these parameters.</p>
        </div>
      }
    </div>

    <!-- Pagination -->
    <div class="mt-4 d-flex justify-content-center pb-5">
      <app-pagination [currentPage]="filters.page ?? 1" [totalPages]="totalPages" (pageChange)="onPageChange($event)" />
    </div>
  `,
  styles: [`
    .text-xs-caps { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; }
    .bg-severity-critical { background-color: var(--severity-critical) !important; }
    .bg-severity-high { background-color: var(--severity-high) !important; }
    .bg-severity-medium { background-color: var(--severity-medium) !important; }
    .bg-severity-low { background-color: var(--severity-low) !important; }
    .bg-severity-info { background-color: var(--severity-info) !important; }
    .text-severity-critical { color: var(--severity-critical) !important; }
    .text-severity-high { color: var(--severity-high) !important; }
    .text-severity-medium { color: var(--severity-medium) !important; }
    .text-severity-low { color: var(--severity-low) !important; }
    .text-severity-info { color: var(--severity-info) !important; }

    .hover-bg-surface-container-high:hover {
       background-color: var(--surface-container-high) !important;
    }

    .custom-scrollbar-hidden::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar-hidden::-webkit-scrollbar-thumb { background: transparent; border-radius: 10px; }
    .custom-scrollbar-hidden:hover::-webkit-scrollbar-thumb { background: var(--outline-variant); }

    .suggestion-popover { border: 1px solid var(--outline-variant); border-radius: 0.75rem; overflow: hidden; }

    .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
  `],
})
export class BreachListComponent implements OnInit {
  private breachService = inject(BreachService);
  private notifications = inject(NotificationService);
  private route = inject(ActivatedRoute);

  breaches: Breach[] = [];
  total = 0;
  totalPages = 1;
  loading = false;
  facets: any = null;

  filters: BreachFilterParams = {
    page: 1,
    limit: 15,
    search: '',
    severity: '',
    industry: '',
    sort_by: 'created_at',
    order: 'desc',
    min_risk: undefined,
    max_risk: undefined,
    data_type: undefined
  };

  showSubdocQuery = false;
  subdocFilters: SubdocumentQueryParams = {};

  severities = ['critical', 'high', 'medium', 'low', 'informational'];
  industries = ['finance', 'healthcare', 'technology', 'retail', 'education', 'government', 'energy', 'other'];
  statuses = ['active', 'investigating', 'contained', 'resolved'];

  // Search Suggestions
  searchSuggestions: Array<{ title: string; organisation: string }> = [];
  showSearchSuggestions = false;
  private searchTimer: any;

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['data_type']) {
        this.filters.data_type = params['data_type'];
      }
      this.loadBreaches();
    });
  }

  loadBreaches(): void {
    this.loading = true;
    const params = { ...this.filters };
    if (this.showSubdocQuery) {
       Object.assign(params, this.subdocFilters);
    }

    this.breachService.getBreaches(params).subscribe({
      next: (res: any) => {
        this.breaches = res.data;
        this.total = res.meta.total;
        this.totalPages = res.meta.total_pages;
        this.facets = res.facets;
        this.loading = false;
      },
      error: () => {
        this.notifications.show('FAILED TO SYNCHRONIZE INTEL', 'error');
        this.loading = false;
      },
    });
  }

  applyFilters(): void {
    this.filters.page = 1;
    this.loadBreaches();
  }

  resetFilters(): void {
    this.filters = {
      page: 1,
      limit: 15,
      search: '',
      severity: '',
      industry: '',
      sort_by: 'created_at',
      order: 'desc',
      min_risk: undefined,
      max_risk: undefined,
      data_type: undefined
    };
    this.subdocFilters = {};
    this.showSubdocQuery = false;
    this.loadBreaches();
  }

  get activeFilterChips(): Array<{ key: string; label: string }> {
    const chips: Array<{ key: string; label: string }> = [];
    if (this.filters.search) chips.push({ key: 'search', label: `QUERY: ${this.filters.search}` });
    if (this.filters.severity) chips.push({ key: 'severity', label: `SEVERITY: ${this.filters.severity}` });
    if (this.filters.industry) chips.push({ key: 'industry', label: `SECTOR: ${this.filters.industry}` });
    if (this.filters.min_risk !== undefined) chips.push({ key: 'min_risk', label: `MIN RISK: ${this.filters.min_risk}` });
    if (this.filters.max_risk !== undefined) chips.push({ key: 'max_risk', label: `MAX RISK: ${this.filters.max_risk}` });
    if (this.filters.data_type) chips.push({ key: 'data_type', label: `DATA: ${this.filters.data_type}` });

    if (this.showSubdocQuery) {
      if (this.subdocFilters.timeline_event_types) chips.push({ key: 'timeline', label: 'DEEP: TIMELINE' });
      if (this.subdocFilters.remediation_statuses) chips.push({ key: 'remediation', label: 'DEEP: MITIGATION' });
      if (this.subdocFilters.alert_severities) chips.push({ key: 'alerts', label: 'DEEP: ALERTS' });
    }

    return chips;
  }

  clearFilter(key: string): void {
    if (key === 'search') this.filters.search = '';
    if (key === 'severity') this.filters.severity = '';
    if (key === 'industry') this.filters.industry = '';
    if (key === 'min_risk') this.filters.min_risk = undefined;
    if (key === 'max_risk') this.filters.max_risk = undefined;
    if (key === 'data_type') this.filters.data_type = undefined;
    if (key === 'timeline') this.subdocFilters.timeline_event_types = undefined;
    if (key === 'remediation') this.subdocFilters.remediation_statuses = undefined;
    if (key === 'alerts') this.subdocFilters.alert_severities = undefined;

    this.applyFilters();
  }

  onPageChange(page: number): void {
    this.filters.page = page;
    this.loadBreaches();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleOrder(): void {
    this.filters.order = this.filters.order === 'asc' ? 'desc' : 'asc';
    this.applyFilters();
  }

  toggleSubdocumentPanel(): void {
    this.showSubdocQuery = !this.showSubdocQuery;
  }

  runSubdocumentQuery(): void {
    this.applyFilters();
  }

  resetSubdocumentQuery(): void {
    this.subdocFilters = {};
    this.applyFilters();
  }

  onSearchInput(): void {
    clearTimeout(this.searchTimer);
    if (!this.filters.search || this.filters.search.length < 2) {
      this.searchSuggestions = [];
      return;
    }
    this.searchTimer = setTimeout(() => {
      this.breachService.getBreaches({ search: this.filters.search, limit: 5 }).subscribe(res => {
        this.searchSuggestions = res.data.map((b: any) => ({
          title: b.title,
          organisation: this.getOrganisationName(b)
        }));
      });
    }, 300);
  }

  onSearchFocus(): void {
    this.showSearchSuggestions = true;
  }

  onSearchBlur(): void {
    setTimeout(() => (this.showSearchSuggestions = false), 200);
  }

  applySearchSuggestion(s: any): void {
    this.filters.search = s.title;
    this.applyFilters();
    this.showSearchSuggestions = false;
  }

  getOrganisationName(breach: Breach): string {
    if (!breach.organisation) return 'UNKNOWN';
    if (typeof breach.organisation === 'string') return breach.organisation;
    return breach.organisation.name || 'UNKNOWN';
  }

  severityBorder(s: string): string {
    const sev = s?.toLowerCase() || 'info';
    if (sev === 'informational' || sev === 'info') return 'severity-info';
    return `severity-${sev}`;
  }

  getIcon(industry: string): string {
    switch (industry?.toLowerCase()) {
      case 'finance': return 'account_balance';
      case 'healthcare': return 'medical_services';
      case 'technology': return 'biotech';
      case 'retail': return 'shopping_cart';
      case 'government': return 'account_balance_wallet';
      case 'energy': return 'bolt';
      case 'education': return 'school';
      default: return 'database';
    }
  }
}
