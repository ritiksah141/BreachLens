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
    <div class="d-flex justify-content-between align-items-end mb-4">
      <div>
        <h2 class="font-headline fw-extrabold text-on-surface tracking-tight page-title">Active Breaches</h2>
        <p class="page-subtitle mb-0">Monitoring global leak sites and dark web forums in real-time.</p>
      </div>
      <div class="text-end">
        <div class="text-xs-caps text-primary mb-1">Total Records</div>
        <div class="font-headline fw-bold text-on-surface fs-4 metric-emphasis">{{ total | number }}</div>
      </div>
    </div>

    <!-- Filter bar -->
    <div class="glass-panel p-3 rounded-3 mb-4 border border-outline-variant border-opacity-10 shadow-lg">
      <div class="row g-3">
        <div class="col-12 col-md-6 col-lg-3 position-relative">
          <div class="input-group">
            <span class="input-group-text bg-surface-container-low border-0 text-on-surface-variant">
              <span class="material-symbols-outlined fs-6">search</span>
            </span>
            <input
              class="form-control bg-surface-container-low border-0 ps-2 text-xs-caps"
              type="text"
              placeholder="Search breaches..."
              [(ngModel)]="filters.search"
              (input)="onSearchInput()"
              (focus)="onSearchFocus()"
              (blur)="onSearchBlur()"
              style="font-size: 10px;"
              autocomplete="off"
            />
          </div>
          @if (showSearchSuggestions && searchSuggestions.length) {
            <div class="list-group position-absolute w-100 mt-1 shadow-sm suggestion-popover z-3">
              @for (s of searchSuggestions; track s.title + s.organisation) {
                <button
                  type="button"
                  class="list-group-item list-group-item-action bg-surface-container text-on-surface border-outline-variant border-opacity-10 py-2 px-3"
                  (mousedown)="$event.preventDefault()"
                  (click)="applySearchSuggestion(s)"
                >
                  <div class="fw-bold small">{{ s.title }}</div>
                  <div class="text-on-surface-variant" style="font-size: 9px;">Org: {{ s.organisation }}</div>
                </button>
              }
            </div>
          }
        </div>
        <div class="col-6 col-md-3 col-lg-2">
          <select
            class="form-select bg-surface-container-low border-0 text-xs-caps"
            [(ngModel)]="filters.severity"
            (change)="applyFilters()"
            style="font-size: 10px;"
          >
            <option value="">All severities</option>
            @for (s of severities; track s) {
              <option [value]="s">{{ s | uppercase }}</option>
            }
          </select>
        </div>
        <div class="col-6 col-md-3 col-lg-2">
          <select
            class="form-select bg-surface-container-low border-0 text-xs-caps"
            [(ngModel)]="filters.status"
            (change)="applyFilters()"
            style="font-size: 10px;"
          >
            <option value="">All status</option>
            @for (s of statuses; track s) {
              <option [value]="s">{{ s | uppercase }}</option>
            }
          </select>
        </div>
        <div class="col-6 col-md-3 col-lg-2">
          <select
            class="form-select bg-surface-container-low border-0 text-xs-caps"
            [(ngModel)]="filters.industry"
            (change)="applyFilters()"
            style="font-size: 10px;"
          >
            <option value="">All industries</option>
            @for (i of industries; track i) {
              <option [value]="i">{{ i | uppercase }}</option>
            }
          </select>
        </div>
        <div class="col-6 col-md-3 col-lg-1">
          <select
            class="form-select bg-surface-container-low border-0 text-xs-caps"
            [(ngModel)]="filters.sort_by"
            (change)="applyFilters()"
            style="font-size: 10px;"
          >
            <option value="created_at">Date added</option>
            <option value="risk_score">Risk score</option>
            <option value="affected_records_count">RECORDS</option>
          </select>
        </div>
        <div class="col-12 col-md-6 col-lg-2 d-flex gap-2 flex-wrap justify-content-end">
          <button class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-2 px-3" (click)="toggleOrder()">
            {{ filters.order === 'desc' ? 'DESC' : 'ASC' }}
          </button>
          <button class="btn btn-outline-secondary border-outline-variant border-opacity-25 text-xs-caps py-2 px-3" (click)="resetFilters()">
            RESET
          </button>
        </div>
      </div>

      <div class="row g-3 mt-2">
        <div class="col-md-3">
          <input
            class="form-control bg-surface-container-low border-0 text-xs-caps"
            type="number"
            min="0"
            max="10"
            step="0.1"
            [(ngModel)]="filters.min_risk"
            (change)="applyFilters()"
            placeholder="Min risk (0-10)"
            style="font-size: 10px;"
          />
        </div>
        <div class="col-md-3">
          <input
            class="form-control bg-surface-container-low border-0 text-xs-caps"
            type="number"
            min="0"
            max="10"
            step="0.1"
            [(ngModel)]="filters.max_risk"
            (change)="applyFilters()"
            placeholder="Max risk (0-10)"
            style="font-size: 10px;"
          />
        </div>
        <div class="col-md-6 d-flex justify-content-end align-items-center">
          <button
            class="btn btn-outline-primary text-xs-caps py-2 px-3"
            (click)="toggleSubdocumentPanel()"
          >
            {{ showSubdocQuery ? 'Hide Deep Query' : 'Deep Subdocument Query' }}
          </button>
        </div>
      </div>

      @if (showSubdocQuery) {
        <div class="mt-3 p-3 rounded-3 bg-surface-container-high border border-outline-variant border-opacity-10">
          <div class="row g-3">
            <div class="col-md-3">
              <input
                class="form-control bg-surface-container-low border-0 text-xs-caps"
                [(ngModel)]="subdocFilters.timeline_event_types"
                placeholder="Timeline types (comma)"
                style="font-size: 10px;"
              />
            </div>
            <div class="col-md-3">
              <input
                class="form-control bg-surface-container-low border-0 text-xs-caps"
                [(ngModel)]="subdocFilters.remediation_statuses"
                placeholder="Remediation status (comma)"
                style="font-size: 10px;"
              />
            </div>
            <div class="col-md-3">
              <input
                class="form-control bg-surface-container-low border-0 text-xs-caps"
                [(ngModel)]="subdocFilters.alert_severities"
                placeholder="Alert severities (comma)"
                style="font-size: 10px;"
              />
            </div>
            <div class="col-md-3">
              <select
                class="form-select bg-surface-container-low border-0 text-xs-caps"
                [(ngModel)]="subdocFilters.account_notified"
                style="font-size: 10px;"
              >
                <option [ngValue]="undefined">Account notified: any</option>
                <option [ngValue]="true">Account notified: true</option>
                <option [ngValue]="false">Account notified: false</option>
              </select>
            </div>
            <div class="col-12 d-flex justify-content-end gap-2">
              <button class="btn btn-primary text-xs-caps py-2 px-3" (click)="runSubdocumentQuery()">Run Deep Query</button>
              <button class="btn btn-outline-secondary text-xs-caps py-2 px-3" (click)="resetSubdocumentQuery()">Reset Deep Query</button>
            </div>
          </div>

          @if (subdocFacets) {
            <div class="mt-3 d-flex flex-wrap gap-2">
              @for (f of facetSummary; track f) {
                <span class="badge bg-surface-container-low text-on-surface-variant border border-outline-variant border-opacity-25 py-2 px-3 text-xs-caps">
                  {{ f }}
                </span>
              }
            </div>
          }
        </div>
      }
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
          <table class="table table-hover mb-0 align-middle custom-terminal-table">
            <thead>
              <tr class="bg-surface-container-low">
                <th class="ps-4 text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 9px;">Severity</th>
                <th class="text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 9px;">Event identifier</th>
                <th class="text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 9px;">Records</th>
                <th class="text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 9px;">Date detected</th>
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
                        <div class="fw-bold text-on-surface small">{{ breach.title }}</div>
                        <div class="text-on-surface-variant" style="font-size: 9px;">Org: {{ getOrganisationName(breach) }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="font-mono text-on-surface-variant small">{{ breach.affected_records_count | compactNumber }}</td>
                  <td class="text-on-surface-variant small" [title]="breach.breach_date | slice:0:10">{{ breach.breach_date | timeAgo }}</td>
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
    .custom-terminal-table tr { border-bottom: 1px solid var(--outline-variant); transition: all 0.2s; }
    .custom-terminal-table tr:hover { background-color: color-mix(in srgb, var(--primary) 3%, transparent) !important; }
    .severity-bar { width: 4px; height: 16px; border-radius: 2px; }

    .bg-critical { background-color: var(--severity-critical) !important; box-shadow: 0 0 10px color-mix(in srgb, var(--severity-critical) 40%, transparent); }
    .bg-high { background-color: var(--severity-high) !important; }
    .bg-medium { background-color: var(--severity-medium) !important; }
    .bg-low { background-color: var(--severity-low) !important; }
    .bg-informational { background-color: var(--severity-info) !important; }

    .text-critical { color: var(--severity-critical) !important; }
    .text-high { color: var(--severity-high) !important; }
    .text-medium { color: var(--severity-medium) !important; }
    .text-low { color: var(--severity-low) !important; }
    .text-informational { color: var(--severity-info) !important; }
    .suggestion-popover { max-height: 260px; overflow-y: auto; }

    .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
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

    // Highest priority: exact and prefix matches in title.
    if (title === query) return 1000;
    if (title.startsWith(query)) return 900;

    // Next: word-prefix matches in title.
    const titleWords = title.split(/\s+/).filter(Boolean);
    if (titleWords.some((w) => w.startsWith(query))) return 800;

    // Then: contains matches in title.
    if (title.includes(query)) return 700;

    // Organisation-based relevance.
    if (org === query) return 600;
    if (org.startsWith(query)) return 500;
    if (org.includes(query)) return 400;

    // Fallback fuzzy boost for scattered character matches.
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
    if (org && typeof org.domain === 'string' && org.domain.trim()) return org.domain.toUpperCase();

    const title = typeof breach?.title === 'string' ? breach.title.trim() : '';
    if (title) {
      const compact = title.split(/\s+(Data|Breach|Leak|Incident)\b/i)[0]?.trim();
      if (compact) return compact.toUpperCase();
    }

    return 'UNSPECIFIED';
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

  private loadFilterOptions(): void {
    this.breachService.getFilterOptions().subscribe({
      next: (res) => {
        const opts = res.data;
        this.severities = opts?.severities?.length ? opts.severities : this.severities;
        this.industries = opts?.industries?.length ? opts.industries : this.industries;
        this.statuses = opts?.statuses?.length ? opts.statuses : this.statuses;
      },
      error: () => {
        // Keep static fallback options when metadata endpoint is unavailable.
      },
    });
  }
}
