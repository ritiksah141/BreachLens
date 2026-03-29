import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  ReactiveFormsModule, FormBuilder, Validators, FormGroup,
} from '@angular/forms';
import { NgClass, DecimalPipe, UpperCasePipe, TitleCasePipe, KeyValuePipe, DatePipe, CommonModule } from '@angular/common';
import { BreachService } from '../../core/services/breach.service';
import { AdminService } from '../../core/services/admin.service';
import { AuthService } from '../../core/services/auth.service';
import { Breach, SystemStats, AuditLog } from '../../core/models/models';
import { SeverityBadgeComponent } from '../../shared/components/severity-badge/severity-badge.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { UserManagementComponent } from './user-management/user-management.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink, NgClass, DecimalPipe, UpperCasePipe, TitleCasePipe, KeyValuePipe, DatePipe,
    SeverityBadgeComponent, PaginationComponent, UserManagementComponent, CommonModule,
  ],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h2 class="fw-bold mb-0">
        <span class="text-warning">⚙</span> Admin Panel
      </h2>
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-secondary" (click)="refreshStats()">Refresh Stats</button>
        <span class="badge bg-warning text-dark">{{ auth.currentUser()?.role | uppercase }}</span>
      </div>
    </div>

    @if (!auth.isAnalyst()) {
      <div class="alert alert-danger">
        You need analyst or admin privileges to access this page.
        <a routerLink="/auth/login" class="alert-link">Login</a>
      </div>
    }

    @if (auth.isAnalyst()) {
      <!-- System Stats Section -->
      @if (stats) {
        <div class="row g-3 mb-4">
          <div class="col-md-4">
            <div class="card bg-dark border-secondary h-100">
              <div class="card-body py-2">
                <small class="text-muted d-block mb-1">Users</small>
                <div class="d-flex justify-content-between align-items-end">
                  <h4 class="mb-0 text-light">{{ stats.users.total }}</h4>
                  <div class="small">
                    <span class="text-success">{{ stats.users.active }} active</span> ·
                    <span class="text-danger">{{ stats.users.inactive }} inactive</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card bg-dark border-secondary h-100">
              <div class="card-body py-2">
                <small class="text-muted d-block mb-1">Breaches</small>
                <div class="d-flex justify-content-between align-items-end">
                  <h4 class="mb-0 text-light">{{ stats.breaches.total }}</h4>
                  <div class="small text-muted">
                    {{ stats.breaches.by_status['open'] || 0 }} open ·
                    {{ stats.breaches.by_status['resolved'] || 0 }} resolved
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card bg-dark border-secondary h-100">
              <div class="card-body py-2">
                <small class="text-muted d-block mb-1">Monitoring</small>
                <div class="d-flex justify-content-between align-items-end">
                  <h4 class="mb-0 text-warning">{{ stats.alerts.unacknowledged }}</h4>
                  <div class="small text-muted">Unacked alerts</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Tabs Navigation -->
      <ul class="nav nav-tabs border-secondary mb-4">
        <li class="nav-item">
          <button class="nav-link" [ngClass]="{ 'active bg-dark text-danger border-secondary': activeTab === 'manage' }" (click)="activeTab = 'manage'">Manage Breaches</button>
        </li>
        <li class="nav-item">
          <button class="nav-link" [ngClass]="{ 'active bg-dark text-danger border-secondary': activeTab === 'bulk' }" (click)="activeTab = 'bulk'">Bulk Import</button>
        </li>
        @if (auth.isAdmin()) {
          <li class="nav-item">
            <button class="nav-link" [ngClass]="{ 'active bg-dark text-danger border-secondary': activeTab === 'audit' }" (click)="loadAuditLogs(); activeTab = 'audit'">Audit Logs</button>
          </li>
          <li class="nav-item">
            <button class="nav-link" [ngClass]="{ 'active bg-dark text-danger border-secondary': activeTab === 'users' }" (click)="activeTab = 'users'">User Management</button>
          </li>
        }
      </ul>

      @switch (activeTab) {

        <!-- TAB: Manage Breaches -->
        @case ('manage') {
          <div class="row g-4 animate__animated animate__fadeIn">
            <div class="col-lg-5">
              <div class="card bg-dark border-secondary">
                <div class="card-header border-secondary d-flex justify-content-between align-items-center">
                  <strong class="text-light">All Breaches</strong>
                  <div class="d-flex gap-2">
                    @if (selectedIds.size > 0 && auth.isAdmin()) {
                      <button class="btn btn-sm btn-outline-danger" (click)="bulkDelete()">
                        Delete ({{ selectedIds.size }})
                      </button>
                    }
                    <button class="btn btn-sm btn-danger" (click)="startCreate()">+ New</button>
                  </div>
                </div>
                <div class="card-body p-0">
                  @if (listLoading) {
                    <div class="text-center py-4">
                      <div class="spinner-border spinner-border-sm text-danger"></div>
                    </div>
                  }
                  <ul class="list-group list-group-flush">
                    @for (b of breaches; track b._id) {
                      <li
                        class="list-group-item bg-dark border-secondary d-flex justify-content-between align-items-start"
                        [ngClass]="{ 'active-item': selectedId === b._id }"
                        style="cursor:pointer"
                        (click)="selectBreach(b)"
                      >
                        <div class="d-flex gap-2 align-items-start">
                          @if (auth.isAdmin()) {
                            <input
                              type="checkbox"
                              class="form-check-input mt-1"
                              [checked]="selectedIds.has(b._id)"
                              (click)="$event.stopPropagation()"
                              (change)="toggleSelection(b._id)"
                            />
                          }
                          <div>
                            <div class="text-light small fw-semibold">{{ b.title }}</div>
                            <div class="d-flex gap-1 mt-1">
                              <app-severity-badge [severity]="b.severity" />
                              <span class="badge bg-secondary">{{ b.status }}</span>
                            </div>
                          </div>
                        </div>
                        @if (auth.isAdmin()) {
                          <button
                            class="btn btn-sm btn-outline-danger"
                            (click)="deleteBreach(b._id, $event)"
                          >✕</button>
                        }
                      </li>
                    }
                  </ul>
                </div>
                <div class="card-footer border-secondary">
                  <app-pagination
                    [currentPage]="page"
                    [totalPages]="totalPages"
                    (pageChange)="onPageChange($event)"
                  />
                </div>
              </div>
            </div>

            <div class="col-lg-7">
              <div class="card bg-dark border-secondary">
                <div class="card-header border-secondary">
                  <strong class="text-light">{{ editingId ? 'Edit breach' : 'New breach' }}</strong>
                </div>
                <div class="card-body">
                  @if (formSuccess) { <div class="alert alert-success py-2 small animate__animated animate__fadeIn">{{ formSuccess }}</div> }
                  @if (formError) { <div class="alert alert-danger py-2 small animate__animated animate__fadeIn">{{ formError }}</div> }

                  <form [formGroup]="breachForm" (ngSubmit)="onSubmit()">
                    <div class="row g-3">
                      <div class="col-12">
                        <label class="form-label text-muted small">Title *</label>
                        <input formControlName="title" class="form-control form-control-sm bg-dark text-light border-secondary" [ngClass]="fc('title')" placeholder="e.g. Acme Corp Leak" />
                        @if (invalid('title')) { <div class="invalid-feedback">Required.</div> }
                      </div>
                      <div class="col-12">
                        <label class="form-label text-muted small">Description *</label>
                        <textarea formControlName="description" class="form-control form-control-sm bg-dark text-light border-secondary" rows="3" [ngClass]="fc('description')" placeholder="Details..."></textarea>
                        @if (invalid('description')) { <div class="invalid-feedback">Required.</div> }
                      </div>
                      <div class="col-md-6">
                        <label class="form-label text-muted small">Severity *</label>
                        <select formControlName="severity" class="form-select form-select-sm bg-dark text-light border-secondary" [ngClass]="fc('severity')">
                          <option value="">Select...</option>
                          @for (s of severities; track s) { <option [value]="s">{{ s | titlecase }}</option> }
                        </select>
                      </div>
                      <div class="col-md-6">
                        <label class="form-label text-muted small">Status *</label>
                        <select formControlName="status" class="form-select form-select-sm bg-dark text-light border-secondary" [ngClass]="fc('status')">
                          <option value="">Select...</option>
                          @for (s of statuses; track s) { <option [value]="s">{{ s | titlecase }}</option> }
                        </select>
                      </div>
                      <div class="col-md-6">
                        <label class="form-label text-muted small">Industry *</label>
                        <select formControlName="industry" class="form-select form-select-sm bg-dark text-light border-secondary" [ngClass]="fc('industry')">
                          <option value="">Select...</option>
                          @for (i of industries; track i) { <option [value]="i">{{ i }}</option> }
                        </select>
                      </div>
                      <div class="col-md-6">
                        <label class="form-label text-muted small">Affected records *</label>
                        <input formControlName="affected_records_count" type="number" class="form-control form-control-sm bg-dark text-light border-secondary" [ngClass]="fc('affected_records_count')" />
                      </div>
                      <div class="col-md-6">
                        <label class="form-label text-muted small">Breach date *</label>
                        <input formControlName="breach_date" type="date" class="form-control form-control-sm bg-dark text-light border-secondary" [ngClass]="fc('breach_date')" />
                      </div>
                      <div class="col-md-6">
                        <label class="form-label text-muted small">Discovered date *</label>
                        <input formControlName="discovered_date" type="date" class="form-control form-control-sm bg-dark text-light border-secondary" [ngClass]="fc('discovered_date')" />
                      </div>
                      <div class="col-md-6">
                        <label class="form-label text-muted small">Organisation</label>
                        <input formControlName="organisation" class="form-control form-control-sm bg-dark text-light border-secondary" />
                      </div>
                      <div class="col-md-6">
                        <label class="form-label text-muted small">Risk score (0-10)</label>
                        <input formControlName="risk_score" type="number" step="0.1" class="form-control form-control-sm bg-dark text-light border-secondary" [ngClass]="fc('risk_score')" />
                      </div>
                    </div>

                    <div class="d-flex gap-2 mt-4">
                      <button type="submit" class="btn btn-danger btn-sm" [disabled]="formLoading">
                        @if (formLoading) { <span class="spinner-border spinner-border-sm me-1"></span> }
                        {{ editingId ? 'Save changes' : 'Create breach' }}
                      </button>
                      @if (editingId) { <button type="button" class="btn btn-sm btn-outline-secondary" (click)="cancelEdit()">Cancel</button> }
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- TAB: Bulk Import -->
        @case ('bulk') {
          <div class="animate__animated animate__fadeIn">
            <div class="card bg-dark border-secondary">
              <div class="card-header border-secondary d-flex justify-content-between">
                <strong class="text-light">Bulk Breach Import</strong>
                <small class="text-muted">JSON format required</small>
              </div>
              <div class="card-body">
                <p class="text-muted small mb-3">Upload a JSON file or paste a JSON array of breach objects to import multiple records at once.</p>

                <div class="mb-4 p-3 bg-black border border-secondary rounded">
                  <label class="form-label text-light small mb-2">Upload JSON File</label>
                  <input type="file" (change)="onFileSelected($event)" accept=".json" class="form-control form-control-sm bg-dark text-light border-secondary" />
                </div>

                <div class="mb-3">
                  <label class="form-label text-light small mb-2">Manual JSON Entry</label>
                  <textarea #jsonInput class="form-control bg-black text-info border-secondary font-monospace small" rows="12" placeholder='[ { "title": "Breach 1", "description": "...", "severity": "high", ... }, ... ]'></textarea>
                </div>

                @if (bulkSuccess) { <div class="alert alert-success py-2 small animate__animated animate__fadeIn">{{ bulkSuccess }}</div> }
                @if (bulkError) { <div class="alert alert-danger py-2 small animate__animated animate__fadeIn">{{ bulkError }}</div> }

                <button class="btn btn-danger" (click)="onBulkImport(jsonInput.value)" [disabled]="bulkLoading">
                  @if (bulkLoading) { <span class="spinner-border spinner-border-sm me-2"></span> }
                  Import Breaches
                </button>
              </div>
            </div>
          </div>
        }

        <!-- TAB: Audit Logs -->
        @case ('audit') {
          <div class="animate__animated animate__fadeIn">
            <div class="card bg-dark border-secondary">
              <div class="card-header border-secondary d-flex justify-content-between align-items-center">
                <strong class="text-light">System Audit Trail</strong>
                <button class="btn btn-xs btn-outline-secondary" (click)="loadAuditLogs()">Refresh</button>
              </div>
              <div class="card-body p-0 table-responsive">
                <table class="table table-dark table-hover mb-0 small">
                  <thead>
                    <tr class="text-muted border-secondary">
                      <th>Timestamp</th>
                      <th>User</th>
                      <th>Action</th>
                      <th>Resource</th>
                      <th>Result</th>
                      <th>IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (log of auditLogs; track log.timestamp) {
                      <tr class="border-secondary">
                        <td class="text-muted">{{ log.timestamp | date:'short' }}</td>
                        <td class="text-info fw-semibold">{{ log.user_id }}</td>
                        <td><span class="badge bg-secondary">{{ log.action }}</span></td>
                        <td class="text-muted small">{{ log.resource }}</td>
                        <td>
                          <span [ngClass]="log.result.startsWith('success') ? 'text-success' : 'text-danger'">
                            {{ log.result }}
                          </span>
                        </td>
                        <td class="text-muted font-monospace small">{{ log.ip_address }}</td>
                      </tr>
                    }
                    @if (auditLogs.length === 0 && !auditLoading) {
                      <tr><td colspan="6" class="text-center py-4 text-muted">No audit logs found in system.</td></tr>
                    }
                  </tbody>
                </table>
              </div>
              <div class="card-footer border-secondary">
                <app-pagination [currentPage]="auditPage" [totalPages]="auditTotalPages" (pageChange)="onAuditPageChange($event)" />
              </div>
            </div>
          </div>
        }

        <!-- TAB: User Management -->
        @case ('users') {
          <div class="animate__animated animate__fadeIn">
            <app-user-management />
          </div>
        }

      }
    }
  `,
  styles: [`
    .active-item { background-color: rgba(220,53,69,0.1) !important; border-left: 3px solid #dc3545 !important; }
    .btn-xs { padding: 0.1rem 0.4rem; font-size: 0.75rem; }
  `],
})
export class AdminComponent implements OnInit {
  private breachService = inject(BreachService);
  private adminService = inject(AdminService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  auth = inject(AuthService);

  activeTab = 'manage';

  // Breaches list
  breaches: Breach[] = [];
  stats: SystemStats | null = null;
  page = 1;
  totalPages = 1;
  listLoading = false;
  selectedId = '';
  editingId = '';
  selectedIds = new Set<string>();

  // Audit logs
  auditLogs: AuditLog[] = [];
  auditPage = 1;
  auditTotalPages = 1;
  auditLoading = false;

  // Bulk import
  bulkLoading = false;
  bulkSuccess = '';
  bulkError = '';

  // Form
  formLoading = false;
  formSuccess = '';
  formError = '';

  severities = ['critical', 'high', 'medium', 'low', 'informational'];
  statuses = ['open', 'investigating', 'contained', 'resolved', 'closed'];
  industries = ['Finance', 'Healthcare', 'Technology', 'Retail', 'Education', 'Government', 'Energy', 'Telecommunications', 'Legal', 'Other'];

  breachForm: FormGroup = this.fb.group({
    title:                  ['', Validators.required],
    description:            ['', Validators.required],
    severity:               ['', Validators.required],
    status:                 ['', Validators.required],
    industry:               ['', Validators.required],
    affected_records_count: [0, [Validators.required, Validators.min(0)]],
    breach_date:            ['', Validators.required],
    discovered_date:        ['', Validators.required],
    organisation:           [''],
    risk_score:             [null, [Validators.min(0), Validators.max(10)]],
  });

  ngOnInit(): void {
    this.loadBreaches();
    this.refreshStats();
    this.route.queryParams.subscribe((p) => {
      if (p['edit']) {
        this.activeTab = 'manage';
        this.loadForEdit(p['edit']);
      }
    });
  }

  refreshStats(): void {
    if (this.auth.isAdmin()) {
      this.adminService.getSystemStats().subscribe({
        next: (res) => (this.stats = res.data),
        error: () => {}
      });
    }
  }

  loadBreaches(): void {
    this.listLoading = true;
    this.breachService.getBreaches({ page: this.page, limit: 10 }).subscribe({
      next: (res: any) => {
        this.breaches = res.data ?? [];
        this.totalPages = res.meta?.total_pages ?? 1;
        this.listLoading = false;
      },
      error: () => (this.listLoading = false),
    });
  }

  onPageChange(p: number): void {
    this.page = p;
    this.loadBreaches();
  }

  loadAuditLogs(): void {
    this.auditLoading = true;
    this.adminService.getAuditLogs(this.auditPage).subscribe({
      next: (res: any) => {
        this.auditLogs = res.data;
        this.auditTotalPages = res.meta?.total_pages ?? 1;
        this.auditLoading = false;
      },
      error: () => (this.auditLoading = false)
    });
  }

  onAuditPageChange(p: number): void {
    this.auditPage = p;
    this.loadAuditLogs();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const content = e.target.result;
          JSON.parse(content); // Validate JSON format
          const textarea = document.querySelector('textarea[#jsonInput]') as HTMLTextAreaElement;
          if (textarea) textarea.value = content;
          else {
            // Fallback if view child or selector fails in this specific tool context
            this.onBulkImport(content);
          }
        } catch (err) {
          this.bulkError = 'Invalid JSON file.';
        }
      };
      reader.readAsText(file);
    }
  }

  onBulkImport(json: string): void {
    if (!json.trim()) return;
    try {
      const data = JSON.parse(json);
      const breaches = Array.isArray(data) ? data : [data];
      this.bulkLoading = true;
      this.bulkSuccess = '';
      this.bulkError = '';

      this.breachService.bulkImport(breaches).subscribe({
        next: (res: any) => {
          this.bulkSuccess = `${res.data?.count || breaches.length} breaches processed successfully.`;
          this.bulkLoading = false;
          this.loadBreaches();
          this.refreshStats();
        },
        error: (err) => {
          this.bulkError = err?.error?.message ?? 'Bulk import failed. Ensure data schema is correct.';
          this.bulkLoading = false;
        }
      });
    } catch (e) {
      this.bulkError = 'Invalid JSON structure. Must be an array of objects.';
    }
  }

  selectBreach(b: Breach): void {
    this.selectedId = b._id;
    this.loadForEdit(b._id);
  }

  loadForEdit(id: string): void {
    this.editingId = id;
    this.formSuccess = '';
    this.formError = '';
    this.breachService.getBreach(id).subscribe({
      next: (res: any) => {
        const b: Breach = res.data;
        this.breachForm.patchValue({
          ...b,
          breach_date: b.breach_date?.slice(0, 10),
          discovered_date: b.discovered_date?.slice(0, 10),
        });
      },
    });
  }

  startCreate(): void {
    this.editingId = '';
    this.selectedId = '';
    this.breachForm.reset({ affected_records_count: 0 });
    this.formSuccess = '';
    this.formError = '';
  }

  cancelEdit(): void {
    this.startCreate();
  }

  onSubmit(): void {
    if (this.breachForm.invalid) {
      this.breachForm.markAllAsTouched();
      return;
    }
    this.formLoading = true;
    this.formSuccess = '';
    this.formError = '';

    const payload = this.breachForm.value;
    const request$ = this.editingId
      ? this.breachService.updateBreach(this.editingId, payload)
      : this.breachService.createBreach(payload);

    request$.subscribe({
      next: () => {
        this.formLoading = false;
        this.formSuccess = this.editingId ? 'Breach updated.' : 'Breach created.';
        this.loadBreaches();
        this.refreshStats();
        if (!this.editingId) this.breachForm.reset({ affected_records_count: 0 });
      },
      error: (err) => {
        this.formLoading = false;
        this.formError = err?.error?.message ?? 'Operation failed.';
      }
    });
  }

  deleteBreach(id: string, event: Event): void {
    event.stopPropagation();
    if (confirm('Permanently delete this breach record?')) {
      this.breachService.deleteBreach(id).subscribe({
        next: () => {
          if (this.selectedId === id) this.startCreate();
          this.loadBreaches();
          this.refreshStats();
        }
      });
    }
  }

  toggleSelection(id: string): void {
    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else this.selectedIds.add(id);
  }

  bulkDelete(): void {
    const ids = Array.from(this.selectedIds);
    if (confirm(`Permanently delete ${ids.length} selected records?`)) {
      this.adminService.bulkDeleteBreaches(ids).subscribe({
        next: () => {
          this.selectedIds.clear();
          this.loadBreaches();
          this.refreshStats();
        }
      });
    }
  }

  fc(field: string): object {
    const ctrl = this.breachForm.get(field);
    return { 'is-invalid': ctrl?.invalid && ctrl?.touched };
  }

  invalid(field: string): boolean {
    const ctrl = this.breachForm.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }
}
