import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgClass, SlicePipe, DecimalPipe, TitleCasePipe, CommonModule } from '@angular/common';
import { BreachService } from '../../../core/services/breach.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  AdvancedSearchParams,
  Breach,
  BreachFilterParams,
  SubdocumentQueryFacets,
  SubdocumentQueryParams,
} from '../../../core/models/models';
import { SeverityBadgeComponent } from '../../../shared/components/severity-badge/severity-badge.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';
import { CompactNumberPipe } from '../../../shared/pipes/compact-number.pipe';

const SESSION_KEY = 'bl_breach_filters';
type SearchSuggestion = { title: string; organisation: string };

@Component({
  selector: 'app-breach-list',
  standalone: true,
  imports: [RouterLink, FormsModule, NgClass, SlicePipe, DecimalPipe, TitleCasePipe, SeverityBadgeComponent, PaginationComponent, CommonModule, TimeAgoPipe, CompactNumberPipe],
  template: `
    <!-- Page Header -->
    <div class="glass-panel p-4 mb-4 shadow-lg border-0 d-flex justify-content-between align-items-center">
      <div>
        <h2 class="font-headline fw-extrabold text-on-surface tracking-tight page-title mb-1">Active Breaches</h2>
        <p class="page-subtitle mb-0 text-on-surface-variant opacity-75">Global intelligence monitoring across leak sites and dark web forums.</p>
      </div>
      <div class="text-end d-none d-md-block">
        <div class="text-xs-caps text-primary mb-1" style="font-size: 8px;">INTELLIGENCE COUNT</div>
        <div class="font-headline fw-bold text-on-surface fs-4 metric-emphasis">{{ total | number }}</div>
      </div>
    </div>

    <!-- Enhanced Filter Bar -->
    <div class="glass-panel p-4 mb-4 border-0 shadow-lg">
      <div class="row g-3 align-items-end">
        <!-- Search Field -->
        <div class="col-lg-3 col-md-6 position-relative">
          <label class="text-xs-caps text-on-surface-variant mb-2 d-block" style="font-size: 8px;">SEARCH PARAMETERS</label>
          <div class="input-group">
            <span class="input-group-text bg-surface-container-high border-0 text-primary">
              <span class="material-symbols-outlined fs-6">search</span>
            </span>
            <input
              class="form-control bg-surface-container-high border-0 text-on-surface ps-1"
              type="text"
              placeholder="Query intelligence..."
              [(ngModel)]="filters.search"
              (input)="onSearchInput()"
              (focus)="onSearchFocus()"
              (blur)="onSearchBlur()"
              style="font-size: 11px; height: 38px;"
              autocomplete="off"
            />
          </div>
          <!-- Suggestions -->
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
                  <div class="text-xs-caps opacity-50" style="font-size: 8px;">SOURCE: {{ s.organisation }}</div>
                </button>
              }
            </div>
          }
        </div>

        <!-- Filter Selects -->
        <div class="col-lg-2 col-md-3">
          <label class="text-xs-caps text-on-surface-variant mb-2 d-block" style="font-size: 8px;">SEVERITY</label>
          <select class="form-select bg-surface-container-high border-0 text-on-surface" style="font-size: 11px; height: 38px;" [(ngModel)]="filters.severity" (change)="applyFilters()">
            <option value="">ALL LEVELS</option>
            @for (s of severities; track s) { <option [value]="s">{{ s | uppercase }}</option> }
          </select>
        </div>
        <div class="col-lg-2 col-md-3">
          <label class="text-xs-caps text-on-surface-variant mb-2 d-block" style="font-size: 8px;">SECTOR</label>
          <select class="form-select bg-surface-container-high border-0 text-on-surface" style="font-size: 11px; height: 38px;" [(ngModel)]="filters.industry" (change)="applyFilters()">
            <option value="">ALL SECTORS</option>
            @for (i of industries; track i) { <option [value]="i">{{ i | uppercase }}</option> }
          </select>
        </div>
        <div class="col-lg-2 col-md-6">
          <label class="text-xs-caps text-on-surface-variant mb-2 d-block" style="font-size: 8px;">SORT BY</label>
          <div class="d-flex gap-2">
            <select class="form-select bg-surface-container-high border-0 text-on-surface" style="font-size: 11px; height: 38px;" [(ngModel)]="filters.sort_by" (change)="applyFilters()">
              <option value="created_at">DATE ADDED</option>
              <option value="risk_score">RISK SCORE</option>
              <option value="affected_records_count">RECORDS</option>
            </select>
            <button class="btn btn-dark bg-surface-container-highest border-0 text-on-surface" style="width: 42px; height: 38px;" (click)="toggleOrder()">
              <span class="material-symbols-outlined fs-6">{{ filters.order === 'desc' ? 'south' : 'north' }}</span>
            </button>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="col-lg-3 col-md-6 d-flex gap-2">
          <button class="btn btn-primary text-on-primary flex-grow-1 fw-bold" style="height: 38px;" (click)="applyFilters()">
            APPLY FILTERS
          </button>
          <button class="btn btn-dark bg-surface-container-highest border-0 text-on-surface flex-grow-1" style="height: 38px;" (click)="resetFilters()">
            RESET
          </button>
        </div>
      </div>

      <!-- Advanced Filter Row -->
      <div class="mt-4 pt-3 border-top border-outline-variant border-opacity-10">
        <div class="row g-3 align-items-center">
          <div class="col-md-6 d-flex gap-4">
            <div class="d-flex align-items-center gap-2">
              <span class="text-xs-caps text-on-surface opacity-50" style="font-size: 8px;">MIN RISK</span>
              <input type="number" min="0" max="10" step="0.1" class="form-control bg-surface-container-high border-0 text-on-surface text-center shadow-inner" style="width: 70px; font-size: 11px; height: 32px;" [(ngModel)]="filters.min_risk" (change)="applyFilters()">
            </div>
            <div class="d-flex align-items-center gap-2">
              <span class="text-xs-caps text-on-surface opacity-50" style="font-size: 8px;">MAX RISK</span>
              <input type="number" min="0" max="10" step="0.1" class="form-control bg-surface-container-high border-0 text-on-surface text-center shadow-inner" style="width: 70px; font-size: 11px; height: 32px;" [(ngModel)]="filters.max_risk" (change)="applyFilters()">
            </div>
          </div>
          <div class="col-md-6 d-flex justify-content-end">
            <button class="btn btn-link p-0 text-xs-caps text-primary text-decoration-none d-flex align-items-center gap-2" style="font-size: 9px;" (click)="toggleSubdocumentPanel()">
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
              <input class="form-control bg-surface-container-low border-0 text-on-surface text-xs-caps shadow-inner" [(ngModel)]="subdocFilters.timeline_event_types" placeholder="e.g. contained, resolved" style="font-size: 10px;" />
            </div>
            <div class="col-md-3">
              <label class="text-xs-caps text-on-surface opacity-50 mb-2 d-block" style="font-size: 7px;">REMEDIATION STATUS</label>
              <input class="form-control bg-surface-container-low border-0 text-on-surface text-xs-caps shadow-inner" [(ngModel)]="subdocFilters.remediation_statuses" placeholder="e.g. pending" style="font-size: 10px;" />
            </div>
            <div class="col-md-3">
              <label class="text-xs-caps text-on-surface opacity-50 mb-2 d-block" style="font-size: 7px;">ALERT SEVERITY</label>
              <input class="form-control bg-surface-container-low border-0 text-on-surface text-xs-caps shadow-inner" [(ngModel)]="subdocFilters.alert_severities" placeholder="e.g. critical" style="font-size: 10px;" />
            </div>
            <div class="col-md-3">
              <label class="text-xs-caps text-on-surface opacity-50 mb-2 d-block" style="font-size: 7px;">NOTIFICATIONS</label>
              <select class="form-select bg-surface-container-low border-0 text-on-surface text-xs-caps shadow-inner" [(ngModel)]="subdocFilters.account_notified" style="font-size: 10px;">
                <option [ngValue]="undefined">ANY STATE</option>
                <option [ngValue]="true">NOTIFIED</option>
                <option [ngValue]="false">PENDING</option>
              </select>
            </div>
          </div>
          <div class="col-12 d-flex justify-content-end gap-3 mt-4 pt-3 border-top border-outline-variant border-opacity-10">
            <button class="btn btn-dark bg-surface-container-highest border-0 text-on-surface text-xs-caps py-2 px-4 shadow-sm" (click)="resetSubdocumentQuery()">RESET QUERY</button>
            <button class="btn btn-primary text-on-primary text-xs-caps py-2 px-4 fw-bold shadow-sm" (click)="runSubdocumentQuery()">EXECUTE SEARCH</button>
          </div>

          @if (subdocFacets) {
            <div class="mt-4 d-flex flex-wrap gap-2">
              @for (f of facetSummary; track f) {
                <span class="badge glass-panel border border-primary border-opacity-20 text-primary py-2 px-3 text-xs-caps shadow-sm">
                  {{ f | uppercase }}
                </span>
              }
            </div>
          }
        </div>
      }
    </div>

    <!-- Active Filters Display -->
    <div class="mb-4 d-flex flex-wrap gap-2 align-items-center" *ngIf="activeFilterChips.length">
      <span class="text-xs-caps text-on-surface opacity-50 me-2" style="font-size: 7px;">ACTIVE FILTERS:</span>
      @for (chip of activeFilterChips; track chip.key) {
        <div class="badge glass-panel border border-outline-variant border-opacity-25 text-on-surface py-2 px-3 d-flex align-items-center gap-2 shadow-sm">
          <span class="text-xs-caps" style="font-size: 8px;">{{ chip.label | uppercase }}</span>
          <button class="btn-close-tactical" style="width: 14px; height: 14px;" (click)="clearFilter(chip.key)">
            <span class="material-symbols-outlined" style="font-size: 9px !important;">close</span>
          </button>
        </div>
      }
      <button class="btn btn-link text-primary text-xs-caps py-0 text-decoration-none" style="font-size: 8px;" (click)="resetFilters()">CLEAR ALL</button>
    </div>

    <!-- Data Table -->
    <div class="glass-panel border-0 shadow-lg overflow-hidden">
      <div class="table-responsive custom-scrollbar">
        <table class="table table-hover mb-0 align-middle">
          <thead>
            <tr class="bg-surface-container-low">
              <th class="ps-4 text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 8px;">THREAT LEVEL</th>
              <th class="text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 8px;">INTEL IDENTIFIER</th>
              <th class="text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 8px;">RECORDS</th>
              <th class="text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 8px;">DETECTION LAG</th>
              <th class="text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 8px;">OPERATIONAL STATUS</th>
              <th class="pe-4 border-0"></th>
            </tr>
          </thead>
          <tbody>
            @for (breach of breaches; track breach._id) {
              <tr class="bg-transparent border-bottom border-outline-variant border-opacity-5 transition-all" style="cursor: pointer;" [routerLink]="['/breaches', breach._id]">
                <td class="ps-4">
                  <div class="d-flex align-items-center gap-2">
                    <span class="severity-bar shadow-sm" [ngClass]="'bg-' + severityBorder(breach.severity)"></span>
                    <span class="text-xs-caps fw-bold" [ngClass]="'text-' + severityBorder(breach.severity)" style="font-size: 8px;">{{ breach.severity | uppercase }}</span>
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
                      <div class="fw-bold text-on-surface small">{{ breach.title }}</div>
                      <div class="text-xs-caps text-on-surface-variant opacity-75" style="font-size: 7px;">SOURCE: {{ getOrganisationName(breach) }}</div>
                    </div>
                  </div>
                </td>
                <td class="font-mono text-on-surface small fw-bold">{{ breach.affected_records_count | compactNumber }}</td>
                <td class="text-on-surface-variant small text-on-surface">{{ breach.breach_date | timeAgo | uppercase }}</td>
                <td>
                  <div class="d-flex align-items-center gap-2">
                    <span class="p-1 rounded-circle bg-success shadow-sm" [class.animate-pulse]="breach.status === 'investigating'" style="width: 6px; height: 6px;"></span>
                    <span class="text-xs-caps small text-on-surface-variant text-on-surface" style="font-size: 8px;">{{ (breach.status || 'LOGGED') | uppercase }}</span>
                  </div>
                </td>
                <td class="pe-4 text-end">
                  <span class="material-symbols-outlined text-primary fs-5">chevron_right</span>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Loading Overlay -->
      @if (loading) {
        <div class="text-center py-5">
          <div class="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
          <span class="text-xs-caps text-on-surface-variant">Synchronizing global intel...</span>
        </div>
      }

      @if (!loading && breaches.length === 0) {
        <div class="text-center py-5">
          <span class="material-symbols-outlined fs-1 text-on-surface-variant opacity-10 mb-3">database_off</span>
          <p class="text-xs-caps text-on-surface-variant opacity-50">No intelligence found matching these parameters.</p>
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
    .severity-bar { width: 4px; height: 16px; border-radius: 2px; }
    .bg-critical { background-color: var(--severity-critical) !important; box-shadow: 0 0 10px var(--severity-critical-bg); }
    .bg-high { background-color: var(--severity-high) !important; }
    .bg-medium { background-color: var(--severity-medium) !important; }
    .bg-low { background-color: var(--severity-low) !important; }
    .bg-informational { background-color: var(--severity-info) !important; }
    .text-critical { color: var(--severity-critical) !important; }
    .text-high { color: var(--severity-high) !important; }
    .text-medium { color: var(--severity-medium) !important; }
    .text-low { color: var(--severity-low) !important; }
    .text-informational { color: var(--severity-info) !important; }
    .suggestion-popover { border: 1px solid var(--outline-variant); border-radius: 0.75rem; overflow: hidden; }
    .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
    .table tr:hover { background-color: rgba(123, 208, 255, 0.04) !important; }
    .shadow-inner { box-shadow: inset 0 2px 4px rgba(0,0,0,0.1); }
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
  statuses = ['active', 'investigating', 'contained', 'resolved'];
  industries = [
    'finance', 'healthcare', 'technology', 'retail', 'education',
    'government', 'energy', 'other',
  ];

  private searchTimer: any;
  private suggestionTimer: any;
  private latestSuggestionQuery = '';
  showSearchSuggestions = false;
  searchSuggestions: SearchSuggestion[] = [];
  showSubdocQuery = false;
  subdocFacets: SubdocumentQueryFacets | null = null;
  subdocFilters: {
    timeline_event_types: string;
    remediation_statuses: string;
    alert_severities: string;
    account_notified: boolean | undefined;
  } = {
    timeline_event_types: '',
    remediation_statuses: '',
    alert_severities: '',
    account_notified: undefined,
  };

  ngOnInit(): void {
    this.restoreFilters();
    this.loadFilterOptions();
    this.route.queryParams.subscribe(params => {
      if (params['q']) {
        this.filters.search = params['q'];
        this.filters.page = 1;
      }
      this.loadBreaches();
    });
  }

  loadBreaches(): void {
    this.loading = true;
    this.error = '';
    this.subdocFacets = null;
    this.saveFilters();

    const params: AdvancedSearchParams = {
      page: this.filters.page,
      limit: this.filters.limit,
      sort_by: this.filters.sort_by as AdvancedSearchParams['sort_by'],
      order: this.filters.order,
      q: this.filters.search,
      severities: this.filters.severity ? [this.filters.severity] : undefined,
      statuses: this.filters.status ? [this.filters.status] : undefined,
      industries: this.filters.industry ? [this.filters.industry] : undefined,
      min_risk: this.filters.min_risk,
      max_risk: this.filters.max_risk,
      include_facets: false,
    };

    this.breachService.getAdvancedSearch(params).subscribe({
      next: (res: any) => {
        this.breaches = res.data ?? [];
        this.total = res.meta?.total ?? 0;
        this.totalPages = res.meta?.total_pages ?? 1;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'Failed to load breaches.';
        this.loading = false;
        this.notifications.show(this.error, 'error', 4500);
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

  onSearchInput(): void {
    this.onSearchChange();
    this.updateSearchSuggestions();
  }

  onSearchFocus(): void {
    if (this.searchSuggestions.length) {
      this.showSearchSuggestions = true;
    }
  }

  onSearchBlur(): void {
    setTimeout(() => {
      this.showSearchSuggestions = false;
    }, 120);
  }

  applySearchSuggestion(suggestion: SearchSuggestion): void {
    this.filters.search = suggestion.title;
    this.showSearchSuggestions = false;
    this.applyFilters();
  }

  private updateSearchSuggestions(): void {
    const query = (this.filters.search || '').trim();
    this.latestSuggestionQuery = query;

    if (query.length < 2) {
      this.searchSuggestions = [];
      this.showSearchSuggestions = false;
      return;
    }

    clearTimeout(this.suggestionTimer);
    this.suggestionTimer = setTimeout(() => {
      const lookup: AdvancedSearchParams = {
        page: 1,
        limit: 6,
        q: query,
        include_facets: false,
      };

      this.breachService.getAdvancedSearch(lookup).subscribe({
        next: (res: any) => {
          if (this.latestSuggestionQuery !== query) return;
          const data: Breach[] = Array.isArray(res?.data) ? res.data : [];
          const unique = new Set<string>();
          const suggestions: SearchSuggestion[] = [];

          for (const item of data) {
            const title = (item?.title || '').trim();
            if (!title) continue;
            const organisation = this.getOrganisationName(item);
            const key = `${title}::${organisation}`.toLowerCase();
            if (unique.has(key)) continue;
            unique.add(key);
            suggestions.push({ title, organisation });
          }

          const ranked = suggestions
            .map((s) => ({ suggestion: s, score: this.scoreSuggestion(s, query) }))
            .sort((a, b) => b.score - a.score || a.suggestion.title.localeCompare(b.suggestion.title))
            .map((entry) => entry.suggestion);

          this.searchSuggestions = ranked;
          this.showSearchSuggestions = ranked.length > 0;
        },
        error: () => {
          this.searchSuggestions = [];
          this.showSearchSuggestions = false;
        },
      });
    }, 220);
  }

  private scoreSuggestion(suggestion: SearchSuggestion, rawQuery: string): number {
    const query = rawQuery.toLowerCase();
    const title = suggestion.title.toLowerCase();
    const org = suggestion.organisation.toLowerCase();

    if (title === query) return 1000;
    if (title.startsWith(query)) return 900;
    const titleWords = title.split(/\s+/).filter(Boolean);
    if (titleWords.some((w) => w.startsWith(query))) return 800;
    if (title.includes(query)) return 700;
    if (org === query) return 600;
    if (org.startsWith(query)) return 500;
    if (org.includes(query)) return 400;

    let cursor = 0;
    for (const ch of query) {
      const idx = title.indexOf(ch, cursor);
      if (idx === -1) return 0;
      cursor = idx + 1;
    }
    return 300;
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
      min_risk: undefined, max_risk: undefined
    };
    this.loadBreaches();
  }

  toggleSubdocumentPanel(): void {
    this.showSubdocQuery = !this.showSubdocQuery;
  }

  runSubdocumentQuery(): void {
    const splitCsv = (value: string): string[] | undefined => {
      if (!value.trim()) return undefined;
      const parsed = value.split(',').map((v) => v.trim()).filter(Boolean);
      return parsed.length ? parsed : undefined;
    };

    const params: SubdocumentQueryParams = {
      page: this.filters.page,
      limit: this.filters.limit,
      sort_by: (this.filters.sort_by as SubdocumentQueryParams['sort_by']) || 'risk_score',
      order: this.filters.order,
      timeline_event_types: splitCsv(this.subdocFilters.timeline_event_types),
      remediation_statuses: splitCsv(this.subdocFilters.remediation_statuses),
      alert_severities: splitCsv(this.subdocFilters.alert_severities),
      account_notified: this.subdocFilters.account_notified,
    };

    this.loading = true;
    this.error = '';
    this.breachService.querySubdocuments(params).subscribe({
      next: (res) => {
        this.breaches = res.data ?? [];
        this.total = res.meta?.total ?? 0;
        this.totalPages = res.meta?.total_pages ?? 1;
        this.subdocFacets = res.meta?.facets ?? null;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'Failed to execute deep subdocument query.';
        this.loading = false;
        this.notifications.show(this.error, 'error', 4500);
      },
    });
  }

  resetSubdocumentQuery(): void {
    this.subdocFilters = {
      timeline_event_types: '',
      remediation_statuses: '',
      alert_severities: '',
      account_notified: undefined,
    };
    this.subdocFacets = null;
    this.loadBreaches();
  }

  get activeFilterChips(): Array<{ key: string; label: string }> {
    const chips: Array<{ key: string; label: string }> = [];
    if (this.filters.search) chips.push({ key: 'search', label: `Search: ${this.filters.search}` });
    if (this.filters.severity) chips.push({ key: 'severity', label: `Severity: ${this.filters.severity}` });
    if (this.filters.industry) chips.push({ key: 'industry', label: `Sector: ${this.filters.industry}` });
    if (this.filters.status) chips.push({ key: 'status', label: `Status: ${this.filters.status}` });
    if (this.filters.min_risk) chips.push({ key: 'min_risk', label: `Min Risk: ${this.filters.min_risk}` });
    if (this.filters.max_risk) chips.push({ key: 'max_risk', label: `Max Risk: ${this.filters.max_risk}` });
    return chips;
  }

  clearFilter(key: string): void {
    (this.filters as any)[key] = key === 'search' || key === 'severity' || key === 'industry' || key === 'status' ? '' : undefined;
    this.applyFilters();
  }

  get facetSummary(): string[] {
    if (!this.subdocFacets) return [];
    const rows: string[] = [];
    const top = (arr?: Array<{ value?: string; count: number; notified?: boolean }>) =>
      Array.isArray(arr) && arr.length ? arr[0] : null;

    const timeline = top(this.subdocFacets.timeline_event_types);
    const remediation = top(this.subdocFacets.remediation_statuses);
    const alerts = top(this.subdocFacets.alert_severities);
    const notified = top(this.subdocFacets.account_notified_mix);

    if (timeline?.value) rows.push(`Top timeline: ${timeline.value} (${timeline.count})`);
    if (remediation?.value) rows.push(`Top remediation: ${remediation.value} (${remediation.count})`);
    if (alerts?.value) rows.push(`Top alert severity: ${alerts.value} (${alerts.count})`);
    if (notified && notified.notified !== undefined) {
      rows.push(`Accounts notified=${notified.notified}: ${notified.count}`);
    }
    return rows;
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

  getOrganisationName(breach: Breach): string {
    const org: any = breach?.organisation;
    if (typeof org === 'string' && org.trim()) return org;
    if (org && typeof org.name === 'string' && org.name.trim()) return org.name;
    return 'UNSPECIFIED';
  }

  private saveFilters(): void {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(this.filters));
  }

  private restoreFilters(): void {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) this.filters = { ...this.filters, ...JSON.parse(saved) };
    } catch { /* ignore */ }
  }

  private loadFilterOptions(): void {
    this.breachService.getFilterOptions().subscribe({
      next: (res) => {
        const opts = res.data;
        this.severities = opts?.severities?.length ? opts.severities : this.severities;
        this.industries = opts?.industries?.length ? opts.industries : this.industries;
        this.statuses = opts?.statuses?.length ? opts.statuses : this.statuses;
      }
    });
  }
}
