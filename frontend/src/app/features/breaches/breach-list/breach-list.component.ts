import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgClass, SlicePipe, DecimalPipe, TitleCasePipe, CommonModule, UpperCasePipe } from '@angular/common';
import { BreachService } from '../../../core/services/breach.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Breach, BreachFilterParams, SubdocumentQueryParams, BreachFacets, BreachListResponse } from '../../../core/models/models';
import { HealthService } from '../../../core/services/health.service';
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
      <div class="title-wrapper">
        <h2 class="page-title mb-1">
          <span class="material-symbols-outlined text-primary opacity-50 me-2" style="font-size: 24px;">description</span>
          Incident Logs
        </h2>
        <p class="text-xs-caps mb-0 text-on-surface-variant opacity-75" style="font-size: 7px; letter-spacing: 0.1em;">Real-time feed of confirmed data breaches and security incursions.</p>
      </div>

      <div class="d-flex align-items-center gap-3">
        <div class="text-end d-none d-md-block me-3">
          <div class="text-xs-caps text-primary mb-1" style="font-size: 7px;">TOTAL EVENTS</div>
          <div class="font-headline fw-bold text-on-surface fs-4">{{ total | number }}</div>
        </div>
        <span class="badge py-2 px-3 glass-panel border border-opacity-25 text-xs-caps shadow-sm d-flex align-items-center gap-2"
              [ngClass]="health.isBackendReady() ? 'border-primary text-primary' : 'border-error text-error'"
              style="font-size: 8px;">
          <span class="material-symbols-outlined fs-6">{{ health.isBackendReady() ? 'description' : 'cloud_off' }}</span>
          {{ health.isBackendReady() ? 'REPOSITORY ACTIVE' : 'REPOSITORY OFFLINE' }}
        </span>
      </div>
    </div>

    <!-- Modular Filter Panels -->
    <div class="row g-4 mb-4 animate__animated animate__fadeIn" style="animation-delay: 0.1s;">
      <!-- Search Module -->
      <div class="col-lg-4 col-md-12">
        <div class="glass-panel p-4 border-0 shadow-lg h-100 transition-all hover-glow position-relative">
          <label class="text-xs-caps text-primary mb-3 d-block fw-bold" style="font-size: 7px;">SEARCH RECORDS</label>
          <div class="input-group">
            <span class="input-group-text bg-surface-container-high border-0 text-primary">
              <span class="material-symbols-outlined fs-6">search</span>
            </span>
            <input
              class="form-control bg-surface-container-high border-0 text-on-surface"
              type="text"
              placeholder="Find by name or domain..."
              [(ngModel)]="filters.search"
              (input)="onSearchInput()"
              (focus)="onSearchFocus()"
              (blur)="onSearchBlur()"
              style="font-size: 11px; height: 38px;"
              autocomplete="off"
            />
          </div>
          @if (showSearchSuggestions && searchSuggestions.length) {
            <div class="list-group position-absolute w-100 mt-1 shadow-lg suggestion-popover z-3" style="left: 0; padding: 0 1.5rem;">
              @for (s of searchSuggestions; track s.title + s.organisation) {
                <button
                  type="button"
                  class="list-group-item list-group-item-action bg-surface-container-highest text-on-surface border-outline-variant border-opacity-10 py-2 px-3"
                  (mousedown)="$event.preventDefault()"
                  (click)="applySearchSuggestion(s)"
                >
                  <div class="fw-bold small" style="font-size: 10px;">{{ s.title }}</div>
                  <div class="text-xs-caps opacity-50" style="font-size: 7px;">{{ s.organisation }}</div>
                </button>
              }
            </div>
          }
          <div class="mt-3 text-xs-caps opacity-50 fw-bold" style="font-size: 6px;">SEARCH DATABASE ENTRIES</div>
        </div>
      </div>

      <!-- Categories Module -->
      <div class="col-lg-5 col-md-8">
        <div class="glass-panel p-4 border-0 shadow-lg h-100 transition-all hover-glow">
          <label class="text-xs-caps text-primary mb-3 d-block fw-bold" style="font-size: 7px;">FILTER BY CATEGORY</label>
          <div class="row g-2">
            <div class="col-md-6">
               <select class="form-select bg-surface-container-high border-0 text-on-surface" style="font-size: 11px; height: 38px;" [(ngModel)]="filters.severity" (change)="applyFilters()">
                <option value="">ALL RISK LEVELS</option>
                @for (s of severities; track s) { <option [value]="s">{{ s | uppercase }}</option> }
              </select>
            </div>
            <div class="col-md-6">
              <select class="form-select bg-surface-container-high border-0 text-on-surface" style="font-size: 11px; height: 38px;" [(ngModel)]="filters.industry" (change)="applyFilters()">
                <option value="">ALL SECTORS</option>
                @for (i of industries; track i) { <option [value]="i">{{ i | uppercase }}</option> }
              </select>
            </div>
          </div>
          <div class="mt-3 d-flex gap-2">
             <div class="flex-grow-1">
               <select class="form-select bg-surface-container-high border-0 text-on-surface" style="font-size: 11px; height: 38px;" [(ngModel)]="filters.sort_by" (change)="applyFilters()">
                <option value="created_at">SORT BY: DATE ADDED</option>
                <option value="risk_score">SORT BY: RISK SCORE</option>
                <option value="affected_records_count">SORT BY: IMPACT</option>
              </select>
             </div>
             <button class="btn btn-dark bg-surface-container-high border-0 text-on-surface" style="width: 42px; height: 38px;" (click)="toggleOrder()">
              <span class="material-symbols-outlined fs-6">{{ filters.order === 'desc' ? 'expand_more' : 'expand_less' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Execution Module -->
      <div class="col-lg-3 col-md-4">
        <div class="glass-panel p-4 border-0 shadow-lg h-100 d-flex flex-column justify-content-between transition-all hover-glow">
          <label class="text-xs-caps text-primary mb-3 d-block fw-bold" style="font-size: 7px;">LOG ACTIONS</label>
          <button class="btn btn-primary text-on-primary w-100 fw-bold text-xs-caps mb-2 shadow-sm" style="height: 44px; font-size: 9px;" (click)="refreshLogs()">
            REFRESH LOGS
          </button>
          <button class="btn btn-dark bg-surface-container-highest border-0 text-on-surface w-100 text-xs-caps fw-bold shadow-sm" style="height: 38px; font-size: 9px;" (click)="resetFilters()">
            CLEAR FILTERS
          </button>
        </div>
      </div>

      <!-- Threat Range Module -->
      <div class="col-md-12">
        <div class="glass-panel p-3 border-0 shadow-lg d-flex justify-content-between align-items-center transition-all hover-glow">
           <div class="d-flex gap-4">
              <div class="d-flex align-items-center gap-2">
                <span class="text-xs-caps text-on-surface opacity-50 fw-bold" style="font-size: 7px;">MIN RISK</span>
                <input type="number" min="0" max="10" step="0.1" class="form-control bg-surface-container-high border-0 text-center fw-bold" style="width: 60px; font-size: 10px; height: 32px;" [(ngModel)]="filters.min_risk" (change)="applyFilters()">
              </div>
              <div class="d-flex align-items-center gap-2">
                <span class="text-xs-caps text-on-surface opacity-50 fw-bold" style="font-size: 7px;">MAX RISK</span>
                <input type="number" min="0" max="10" step="0.1" class="form-control bg-surface-container-high border-0 text-center fw-bold" style="width: 60px; font-size: 10px; height: 32px;" [(ngModel)]="filters.max_risk" (change)="applyFilters()">
              </div>
           </div>
           <button class="btn btn-link p-0 text-xs-caps text-primary text-decoration-none d-flex align-items-center gap-2 fw-bold" style="font-size: 8px;" (click)="toggleSubdocumentPanel()">
              <span class="material-symbols-outlined fs-6">{{ showSubdocQuery ? 'close' : 'manage_search' }}</span>
              {{ showSubdocQuery ? 'EXIT ADVANCED SEARCH' : 'START ADVANCED SEARCH' }}
           </button>
        </div>
      </div>

      <!-- Advanced Search Panel -->
      @if (showSubdocQuery) {
        <div class="col-12 animate__animated animate__fadeIn">
          <div class="glass-panel p-4 shadow-lg border-0 border-top border-primary border-4 position-relative overflow-hidden">
            <div class="position-absolute top-0 start-0 w-100" style="height: 4px; background-color: var(--primary); z-index: 10;"></div>
            <div class="row g-3">
              <div class="col-md-3">
                <label class="text-xs-caps text-on-surface-variant mb-2 d-block fw-bold" style="font-size: 7px;">EVENT TYPES</label>
                <select class="form-select bg-surface-container-high border-0 text-on-surface" [(ngModel)]="subdocFilters.timeline_event_types" style="font-size: 10px; height: 38px;">
                  <option [ngValue]="undefined">ALL EVENTS</option>
                  @for (t of timelineTypes; track t) { <option [value]="t">{{ t | uppercase }}</option> }
                </select>
              </div>
              <div class="col-md-3">
                <label class="text-xs-caps text-on-surface-variant mb-2 d-block fw-bold" style="font-size: 7px;">FIX STATUS</label>
                <select class="form-select bg-surface-container-high border-0 text-on-surface" [(ngModel)]="subdocFilters.remediation_statuses" style="font-size: 10px; height: 38px;">
                  <option [ngValue]="undefined">ANY STATUS</option>
                  @for (rs of remediationStatuses; track rs) { <option [value]="rs">{{ rs.split('_').join(' ') | uppercase }}</option> }
                </select>
              </div>
              <div class="col-md-3">
                <label class="text-xs-caps text-on-surface-variant mb-2 d-block fw-bold" style="font-size: 7px;">ALERT LEVEL</label>
                <select class="form-select bg-surface-container-high border-0 text-on-surface" [(ngModel)]="subdocFilters.alert_severities" style="font-size: 10px; height: 38px;">
                  <option [ngValue]="undefined">ANY LEVEL</option>
                  @for (s of severities; track s) { <option [value]="s">{{ s | uppercase }}</option> }
                </select>
              </div>
              <div class="col-md-3">
                <label class="text-xs-caps text-on-surface-variant mb-2 d-block fw-bold" style="font-size: 7px;">ACCOUNT UPDATED</label>
                <select class="form-select bg-surface-container-high border-0 text-on-surface" [(ngModel)]="subdocFilters.account_notified" style="font-size: 10px; height: 38px;">
                  <option [ngValue]="undefined">ANY STATE</option>
                  <option [ngValue]="true">YES</option>
                  <option [ngValue]="false">NO</option>
                </select>
              </div>
            </div>
            <div class="col-12 d-flex justify-content-end gap-3 mt-4 pt-3 border-top border-outline-variant border-opacity-10">
              <button class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-2 px-4 shadow-sm fw-bold" style="font-size: 8px;" (click)="resetSubdocumentQuery()">RESET ADVANCED</button>
              <button class="btn btn-primary text-on-primary text-xs-caps py-2 px-4 fw-bold shadow-sm" style="font-size: 8px;" (click)="runSubdocumentQuery()">APPLY ADVANCED</button>
            </div>
          </div>
        </div>
      }

      <!-- Analytics Facets Row -->
      @if (facets && breaches.length > 0) {
        <div class="col-12 animate__animated animate__fadeIn">
           <div class="glass-panel p-3 border-0 shadow-sm d-flex gap-4 overflow-auto custom-scrollbar-hidden">
              <div class="d-flex align-items-center gap-3 pe-4 border-end border-outline-variant border-opacity-10">
                 <span class="text-xs-caps text-on-surface-variant fw-bold" style="font-size: 7px;">DISTRIBUTION:</span>
                 <div class="d-flex gap-2">
                    @for (s of facets.severity; track s._id) {
                       <div class="d-flex align-items-center gap-1 cursor-pointer hover-opacity" (click)="filters.severity = s._id; applyFilters()">
                          <span class="p-1 rounded-circle" [ngClass]="'bg-' + severityBorder(s._id)" style="width: 5px; height: 5px;"></span>
                          <span class="text-xs-caps fw-bold" style="font-size: 7px;">{{ s.count }}</span>
                       </div>
                    }
                 </div>
              </div>
              <div class="d-flex align-items-center gap-3">
                 <span class="text-xs-caps text-on-surface-variant fw-bold" style="font-size: 7px;">TOP SECTORS:</span>
                 <div class="d-flex gap-3">
                    @for (i of facets.industry | slice:0:4; track i._id) {
                       <div class="d-flex align-items-center gap-2 cursor-pointer hover-opacity" (click)="filters.industry = i._id; applyFilters()">
                          <span class="material-symbols-outlined text-primary" style="font-size: 12px;">{{ getIcon(i._id) }}</span>
                          <span class="text-xs-caps fw-bold opacity-75" style="font-size: 7px;">{{ i._id | uppercase }}: {{ i.count }}</span>
                       </div>
                    }
                 </div>
              </div>
           </div>
        </div>
      }
    </div>

    <!-- Active Filter Chips -->
    <div class="mb-4 d-flex flex-wrap gap-2 align-items-center animate__animated animate__fadeIn" *ngIf="activeFilterChips.length">
      <span class="text-xs-caps text-on-surface opacity-50 me-2 fw-bold" style="font-size: 7px;">ACTIVE FILTERS:</span>
      @for (chip of activeFilterChips; track chip.key) {
        <div class="badge glass-panel border border-outline-variant border-opacity-25 text-on-surface py-2 px-3 d-flex align-items-center gap-2 shadow-sm">
          <span class="text-xs-caps fw-bold" style="font-size: 7px; letter-spacing: 0.05em;">{{ chip.label | uppercase }}</span>
          <button class="btn-close-tactical border-0 bg-transparent p-0 d-flex" style="width: 14px; height: 14px;" (click)="clearFilter(chip.key)">
            <span class="material-symbols-outlined" style="font-size: 11px !important;">close</span>
          </button>
        </div>
      }
      <button class="btn btn-link text-primary text-xs-caps py-0 text-decoration-none fw-bold" style="font-size: 7px;" (click)="resetFilters()">REMOVE ALL</button>
    </div>

    <!-- Incident Log Table -->
    <div class="glass-panel border-0 shadow-lg overflow-hidden animate__animated animate__fadeIn" style="animation-delay: 0.2s;">
      <div class="table-responsive custom-scrollbar-hidden">
        <table class="table table-hover mb-0 align-middle">
          <thead>
            <tr class="bg-surface-container-low">
              <th class="ps-4 text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 7px;">RISK LEVEL</th>
              <th class="text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 7px;">AFFECTED SOURCE</th>
              <th class="text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 7px;">IMPACT</th>
              <th class="text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 7px;">RECORDED</th>
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
                      <div class="text-xs-caps text-on-surface-variant opacity-50 fw-bold" style="font-size: 7px;">{{ getOrganisationName(breach) | uppercase }}</div>
                    </div>
                  </div>
                </td>
                <td class="text-on-surface font-mono fw-bold" style="font-size: 10px;">{{ breach.affected_records_count | compactNumber }}</td>
                <td class="text-xs-caps text-on-surface opacity-75 fw-bold" style="font-size: 7px;">{{ breach.breach_date | timeAgo | uppercase }}</td>
                <td>
                  <div class="d-flex align-items-center gap-2">
                    <span class="p-1 rounded-circle bg-success shadow-sm" [class.animate-pulse]="breach.status === 'investigating'" style="width: 4px; height: 4px;"></span>
                    <span class="text-xs-caps text-on-surface-variant fw-bold" style="font-size: 7px;">{{ (breach.status || 'LOGGED').split('_').join(' ') | uppercase }}</span>
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
          <span class="text-xs-caps text-on-surface-variant fw-bold" style="font-size: 7px;">SCANNING DATABASE...</span>
        </div>
      }

      @if (!loading && breaches.length === 0) {
        <div class="text-center py-5">
          <span class="material-symbols-outlined fs-1 text-on-surface-variant opacity-10 mb-3">database_off</span>
          <p class="text-xs-caps text-on-surface-variant opacity-50 fw-bold" style="font-size: 8px;">NO RESULTS MATCHING PARAMETERS</p>
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

    .hover-glow:hover {
       background-color: var(--surface-container-low) !important;
       transform: translateY(-2px);
       box-shadow: 0 10px 30px rgba(0,0,0,0.1) !important;
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
  public health = inject(HealthService);
  private route = inject(ActivatedRoute);

  breaches: Breach[] = [];
  total = 0;
  totalPages = 1;
  loading = false;
  facets: BreachFacets | null = null;

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
  remediationStatuses = ['pending', 'in_progress', 'completed'];
  timelineTypes = ['discovered', 'reported', 'mitigated', 'resolved', 'notified'];

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
    const params: any = { ...this.filters };

    // Advanced search transformation: strings to arrays for the backend
    if (this.showSubdocQuery) {
      const advanced = { ...this.subdocFilters };

      // Convert comma-separated strings to arrays
      if (typeof advanced.timeline_event_types === 'string' && (advanced.timeline_event_types as string).trim()) {
        advanced.timeline_event_types = (advanced.timeline_event_types as string).split(',').map(s => s.trim());
      }
      if (typeof advanced.remediation_statuses === 'string' && (advanced.remediation_statuses as string).trim()) {
        advanced.remediation_statuses = (advanced.remediation_statuses as string).split(',').map(s => s.trim());
      }
      if (typeof advanced.alert_severities === 'string' && (advanced.alert_severities as string).trim()) {
        advanced.alert_severities = (advanced.alert_severities as string).split(',').map(s => s.trim());
      }
      if (typeof advanced.exposed_data_types === 'string' && (advanced.exposed_data_types as string).trim()) {
        advanced.exposed_data_types = (advanced.exposed_data_types as string).split(',').map(s => s.trim());
      }

      Object.assign(params, advanced);
    }

    this.breachService.getBreaches(params).subscribe({
      next: (res: BreachListResponse) => {
        this.breaches = res.data;
        this.total = res.meta.total;
        this.totalPages = res.meta.total_pages;
        this.facets = res.facets || null;
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

  refreshLogs(): void {
    this.notifications.show('SYNCHRONIZING THREAT INTELLIGENCE...', 'info', 2000);
    this.applyFilters();
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
    this.notifications.show('ALL FILTERS RESET', 'info', 2000);
    this.loadBreaches();
  }

  get activeFilterChips(): Array<{ key: string; label: string }> {
    const chips: Array<{ key: string; label: string }> = [];
    if (this.filters.search) chips.push({ key: 'search', label: `SEARCH: ${this.filters.search}` });
    if (this.filters.severity) chips.push({ key: 'severity', label: `RISK: ${this.filters.severity}` });
    if (this.filters.industry) chips.push({ key: 'industry', label: `SECTOR: ${this.filters.industry}` });
    if (this.filters.min_risk !== undefined) chips.push({ key: 'min_risk', label: `MIN: ${this.filters.min_risk}` });
    if (this.filters.max_risk !== undefined) chips.push({ key: 'max_risk', label: `MAX: ${this.filters.max_risk}` });
    if (this.filters.data_type) chips.push({ key: 'data_type', label: `TYPE: ${this.filters.data_type}` });

    if (this.showSubdocQuery) {
      if (this.subdocFilters.timeline_event_types) chips.push({ key: 'timeline', label: 'ADV: EVENTS' });
      if (this.subdocFilters.remediation_statuses) chips.push({ key: 'remediation', label: 'ADV: PROGRESS' });
      if (this.subdocFilters.alert_severities) chips.push({ key: 'alerts', label: 'ADV: URGENCY' });
      if (this.subdocFilters.exposed_data_types) chips.push({ key: 'exposed', label: 'ADV: DATA' });
      if (this.subdocFilters.account_notified !== undefined) chips.push({ key: 'notified', label: 'ADV: NOTIFIED' });
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
    if (key === 'exposed') this.subdocFilters.exposed_data_types = undefined;
    if (key === 'notified') this.subdocFilters.account_notified = undefined;

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
