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
    <div class="d-flex justify-content-between align-items-end mb-4">
      <div>
        <h2 class="font-headline fw-extrabold text-on-surface tracking-tight mb-1">Command Center</h2>
        <p class="text-on-surface-variant mb-0 small text-uppercase tracking-widest" style="font-size: 9px;">Administrative Terminal v2.0</p>
      </div>
      <div class="d-flex gap-3 align-items-center">
        <button class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-2 px-3" (click)="refreshStats()">
          <span class="material-symbols-outlined fs-6 me-1">refresh</span> Refresh
        </button>
        <span class="badge py-2 px-3 glass-panel border border-primary border-opacity-25 text-primary text-xs-caps">{{ auth.currentUser()?.role }}</span>
      </div>
    </div>

    @if (!auth.isAnalyst()) {
      <div class="alert bg-error-container bg-opacity-10 border-error text-error p-4 rounded-3 shadow-lg">
        <div class="d-flex align-items-center gap-3">
          <span class="material-symbols-outlined fs-2">security</span>
          <div>
            <div class="fw-bold text-xs-caps mb-1">Access_Denied</div>
            <div class="small">Elevated privileges required for terminal access. Please <a routerLink="/auth/login" class="text-error fw-bold">Authenticate</a>.</div>
          </div>
        </div>
      </div>
    }

    @if (auth.isAnalyst()) {
      <!-- System Stats Row -->
      @if (stats) {
        <div class="row g-4 mb-4">
          <div class="col-md-4">
            <div class="card p-3 border-0 border-start border-primary border-3 glow-primary">
              <div class="text-xs-caps text-on-surface-variant mb-2" style="font-size: 8px;">Operator_Network</div>
              <div class="d-flex justify-content-between align-items-end">
                <h3 class="mb-0 fw-bold font-headline text-on-surface">{{ stats.users.total }}</h3>
                <div class="text-xs-caps" style="font-size: 8px;">
                  <span class="text-success">{{ stats.users.active }} ACTIVE</span> •
                  <span class="text-error">{{ stats.users.inactive }} OFFLINE</span>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card p-3 border-0 border-start border-secondary border-3">
              <div class="text-xs-caps text-on-surface-variant mb-2" style="font-size: 8px;">Intelligence_Repository</div>
              <div class="d-flex justify-content-between align-items-end">
                <h3 class="mb-0 fw-bold font-headline text-on-surface">{{ stats.breaches.total }}</h3>
                <div class="text-xs-caps text-on-surface-variant" style="font-size: 8px;">
                  {{ stats.breaches.by_status['active'] || 0 }} ACTIVE •
                  {{ stats.breaches.by_status['resolved'] || 0 }} RESOLVED
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card p-3 border-0 border-start border-tertiary border-3 glow-error">
              <div class="text-xs-caps text-on-surface-variant mb-2" style="font-size: 8px;">Alert_Monitoring</div>
              <div class="d-flex justify-content-between align-items-end">
                <h3 class="mb-0 fw-bold font-headline text-tertiary">{{ stats.alerts.unacknowledged }}</h3>
                <div class="text-xs-caps text-tertiary" style="font-size: 8px;">UNACKNOWLEDGED_EVENTS</div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Tab Navigation -->
      <div class="glass-panel p-1 rounded-3 mb-4 d-inline-flex border border-outline-variant border-opacity-10">
        <button class="btn text-xs-caps py-2 px-4 transition-all"
                [ngClass]="activeTab === 'manage' ? 'btn-primary shadow-sm' : 'btn-link text-on-surface-variant text-decoration-none'"
                (click)="activeTab = 'manage'">Manage_Logs</button>
        <button class="btn text-xs-caps py-2 px-4 transition-all"
                [ngClass]="activeTab === 'bulk' ? 'btn-primary shadow-sm' : 'btn-link text-on-surface-variant text-decoration-none'"
                (click)="activeTab = 'bulk'">Bulk_Import</button>
        @if (auth.isAdmin()) {
          <button class="btn text-xs-caps py-2 px-4 transition-all"
                  [ngClass]="activeTab === 'audit' ? 'btn-primary shadow-sm' : 'btn-link text-on-surface-variant text-decoration-none'"
                  (click)="loadAuditLogs(); activeTab = 'audit'">Audit_Trail</button>
          <button class="btn text-xs-caps py-2 px-4 transition-all"
                  [ngClass]="activeTab === 'users' ? 'btn-primary shadow-sm' : 'btn-link text-on-surface-variant text-decoration-none'"
                  (click)="activeTab = 'users'">Operators</button>
        }
      </div>

      @switch (activeTab) {
        @case ('manage') {
          <div class="row g-4 animate__animated animate__fadeIn">
            <div class="col-lg-5">
              <div class="card border-0 bg-surface-container-low h-100 shadow-lg">
                <div class="p-3 border-bottom border-outline-variant border-opacity-10 d-flex justify-content-between align-items-center">
                  <span class="text-xs-caps text-on-surface">Active_Investigation_Log</span>
                  <div class="d-flex gap-2">
                    @if (selectedIds.size > 0 && auth.isAdmin()) {
                      <button class="btn btn-dark bg-error-container bg-opacity-10 text-error border-0 text-xs-caps py-1 px-2" (click)="bulkDelete()" style="font-size: 8px;">
                        DELETE ({{ selectedIds.size }})
                      </button>
                    }
                    <button class="btn btn-primary text-xs-caps py-1 px-2" (click)="startCreate()" style="font-size: 8px;">+ NEW_ENTRY</button>
                  </div>
                </div>
                <div class="p-0 overflow-auto custom-scrollbar" style="max-height: 600px;">
                  @if (listLoading) {
                    <div class="text-center py-5">
                      <div class="spinner-border spinner-border-sm text-primary"></div>
                    </div>
                  }
                  <div class="list-group list-group-flush">
                    @for (b of breaches; track b._id) {
                      <div class="list-group-item bg-transparent border-outline-variant border-opacity-10 p-3 d-flex justify-content-between align-items-start transition-all"
                           [ngClass]="{ 'active-log-item': selectedId === b._id }"
                           (click)="selectBreach(b)" style="cursor: pointer;">
                        <div class="d-flex gap-3 align-items-start">
                          @if (auth.isAdmin()) {
                            <input type="checkbox" class="form-check-input mt-1 bg-surface-container border-outline-variant"
                                   [checked]="selectedIds.has(b._id)" (click)="$event.stopPropagation()" (change)="toggleSelection(b._id)" />
                          }
                          <div>
                            <div class="fw-bold text-on-surface small mb-1">{{ b.title }}</div>
                            <div class="d-flex gap-2 align-items-center">
                              <span class="text-xs-caps" [ngClass]="'text-' + severityColor(b.severity)" style="font-size: 8px;">{{ b.severity }}</span>
                              <span class="text-on-surface-variant opacity-25">•</span>
                              <span class="text-xs-caps text-on-surface-variant" style="font-size: 8px;">{{ b.status }}</span>
                            </div>
                          </div>
                        </div>
                        @if (auth.isAdmin()) {
                          <button class="btn btn-link p-0 text-on-surface-variant hover-text-error border-0" (click)="deleteBreach(b._id, $event)">
                            <span class="material-symbols-outlined fs-6">close</span>
                          </button>
                        }
                      </div>
                    }
                  </div>
                </div>
                <div class="p-3 border-top border-outline-variant border-opacity-10">
                  <app-pagination [currentPage]="page" [totalPages]="totalPages" (pageChange)="onPageChange($event)" />
                </div>
              </div>
            </div>

            <div class="col-lg-7">
              <div class="card border-0 bg-surface-container-low shadow-lg">
                <div class="p-3 border-bottom border-outline-variant border-opacity-10">
                  <span class="text-xs-caps text-on-surface">{{ editingId ? 'Edit_Log_Entry' : 'Initialize_New_Entry' }}</span>
                </div>
                <div class="p-4 p-md-5">
                  @if (formSuccess) { <div class="alert bg-success-container bg-opacity-10 border-success text-success py-2 small mb-4 text-xs-caps">{{ formSuccess }}</div> }
                  @if (formError) { <div class="alert bg-error-container bg-opacity-10 border-error text-error py-2 small mb-4 text-xs-caps">{{ formError }}</div> }

                  <form [formGroup]="breachForm" (ngSubmit)="onSubmit()" class="d-flex flex-column gap-4">
                    <div class="row g-4">
                      <div class="col-12">
                        <label class="text-xs-caps text-on-surface-variant mb-2">Event_Title</label>
                        <input formControlName="title" class="form-control bg-surface-container-high border-0 text-on-surface" [ngClass]="fc('title')" placeholder="ENTER_IDENTIFIER..." />
                      </div>
                      <div class="col-12">
                        <label class="text-xs-caps text-on-surface-variant mb-2">Detailed_Description</label>
                        <textarea formControlName="description" class="form-control bg-surface-container-high border-0 text-on-surface" rows="4" [ngClass]="fc('description')" placeholder="TELEMETRY_DATA_AND_CONTEXT..."></textarea>
                      </div>
                      <div class="col-md-6">
                        <label class="text-xs-caps text-on-surface-variant mb-2">Threat_Level</label>
                        <select formControlName="severity" class="form-select bg-surface-container-high border-0 text-on-surface" [ngClass]="fc('severity')">
                          <option value="">SELECT_LEVEL...</option>
                          @for (s of severities; track s) { <option [value]="s">{{ s | uppercase }}</option> }
                        </select>
                      </div>
                      <div class="col-md-6">
                        <label class="text-xs-caps text-on-surface-variant mb-2">Containment_Status</label>
                        <select formControlName="status" class="form-select bg-surface-container-high border-0 text-on-surface" [ngClass]="fc('status')">
                          <option value="">SELECT_STATUS...</option>
                          @for (s of statuses; track s) { <option [value]="s">{{ s | uppercase }}</option> }
                        </select>
                      </div>
                      <div class="col-md-6">
                        <label class="text-xs-caps text-on-surface-variant mb-2">Industry_Sector</label>
                        <select formControlName="industry" class="form-select bg-surface-container-high border-0 text-on-surface" [ngClass]="fc('industry')">
                          <option value="">SELECT_SECTOR...</option>
                          @for (i of industries; track i) { <option [value]="i">{{ i | uppercase }}</option> }
                        </select>
                      </div>
                      <div class="col-md-6">
                        <label class="text-xs-caps text-on-surface-variant mb-2">Impacted_Records</label>
                        <input formControlName="affected_records_count" type="number" class="form-control bg-surface-container-high border-0 text-on-surface" [ngClass]="fc('affected_records_count')" />
                      </div>
                      <div class="col-md-6">
                        <label class="text-xs-caps text-on-surface-variant mb-2">Incident_Date</label>
                        <input formControlName="breach_date" type="date" class="form-control bg-surface-container-high border-0 text-on-surface" [ngClass]="fc('breach_date')" />
                      </div>
                      <div class="col-md-6">
                        <label class="text-xs-caps text-on-surface-variant mb-2">Discovery_Date</label>
                        <input formControlName="discovered_date" type="date" class="form-control bg-surface-container-high border-0 text-on-surface" [ngClass]="fc('discovered_date')" />
                      </div>
                      <div class="col-md-6">
                        <label class="text-xs-caps text-on-surface-variant mb-2">Risk_Index (0-10)</label>
                        <input formControlName="risk_score" type="number" step="0.1" class="form-control bg-surface-container-high border-0 text-on-surface" [ngClass]="fc('risk_score')" />
                      </div>
                    </div>

                    <div class="d-flex gap-3 mt-2">
                      <button type="submit" class="btn btn-primary px-4 py-3 text-xs-caps flex-grow-1" [disabled]="formLoading">
                        @if (formLoading) { <span class="spinner-border spinner-border-sm me-2"></span> }
                        {{ editingId ? 'UPDATE_TELEMETRY' : 'COMMIT_NEW_ENTRY' }}
                      </button>
                      @if (editingId) {
                        <button type="button" class="btn btn-outline-secondary px-4 py-3 text-xs-caps border-outline-variant border-opacity-25" (click)="cancelEdit()">CANCEL</button>
                      }
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        }

        @case ('bulk') {
          <div class="animate__animated animate__fadeIn">
            <div class="card border-0 bg-surface-container-low shadow-lg overflow-hidden">
              <div class="p-3 border-bottom border-outline-variant border-opacity-10 d-flex justify-content-between">
                <span class="text-xs-caps text-on-surface">Bulk_Import_Processor</span>
                <span class="text-xs-caps text-on-surface-variant" style="font-size: 8px;">JSON_SCHEMA_REQUIRED</span>
              </div>
              <div class="card-body p-4 p-md-5">
                <p class="text-on-surface-variant small mb-4">Initialize large-scale telemetry imports via encrypted data packets.</p>

                <div class="mb-5 p-4 bg-surface-container-high border border-outline-variant border-opacity-10 rounded-3">
                  <label class="text-xs-caps text-on-surface-variant mb-3">Upload_Log_Packet</label>
                  <input type="file" (change)="onFileSelected($event)" accept=".json" class="form-control bg-surface-container border-0 text-on-surface" />
                </div>

                <div class="mb-4">
                  <label class="text-xs-caps text-on-surface-variant mb-3">Manual_Buffer_Entry</label>
                  <textarea #jsonInput class="form-control bg-surface-container-high border-0 font-monospace text-primary"
                            style="font-size: 11px; height: 300px;"
                            placeholder='[ { "title": "Breach_01", ... } ]'></textarea>
                </div>

                @if (bulkSuccess) { <div class="alert bg-success-container bg-opacity-10 border-success text-success py-2 small mb-4 text-xs-caps">{{ bulkSuccess }}</div> }
                @if (bulkError) { <div class="alert bg-error-container bg-opacity-10 border-error text-error py-2 small mb-4 text-xs-caps">{{ bulkError }}</div> }

                <button class="btn btn-primary py-3 px-5 text-xs-caps" (click)="onBulkImport(jsonInput.value)" [disabled]="bulkLoading">
                  @if (bulkLoading) { <span class="spinner-border spinner-border-sm me-2"></span> }
                  PROCESS_IMPORT
                </button>
              </div>
            </div>
          </div>
        }

        @case ('audit') {
          <div class="animate__animated animate__fadeIn">
            <div class="card border-0 bg-surface-container-low shadow-lg overflow-hidden">
              <div class="p-3 border-bottom border-outline-variant border-opacity-10 d-flex justify-content-between align-items-center">
                <span class="text-xs-caps text-on-surface">System_Audit_Trail</span>
                <button class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-1 px-2" style="font-size: 8px;" (click)="loadAuditLogs()">REFRESH_TRAIL</button>
              </div>
              <div class="p-0 table-responsive">
                <table class="table table-hover mb-0 align-middle custom-terminal-table">
                  <thead class="bg-surface-container-low">
                    <tr>
                      <th class="ps-4 text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 8px;">Timestamp</th>
                      <th class="text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 8px;">Operator</th>
                      <th class="text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 8px;">Action</th>
                      <th class="text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 8px;">Resource</th>
                      <th class="text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 8px;">Result</th>
                      <th class="pe-4 text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 8px;">Origin_IP</th>
                    </tr>
                  </thead>
                  <tbody class="border-top-0">
                    @for (log of auditLogs; track log.timestamp) {
                      <tr class="bg-transparent">
                        <td class="ps-4 text-on-surface-variant small font-mono">{{ log.timestamp | date:'short' }}</td>
                        <td><span class="text-primary fw-bold font-mono small">{{ log.user_id }}</span></td>
                        <td><span class="text-xs-caps text-on-surface-variant border border-outline-variant border-opacity-25 px-2 py-1 rounded" style="font-size: 8px;">{{ log.action }}</span></td>
                        <td class="text-on-surface-variant small italic">{{ log.resource }}</td>
                        <td>
                          <span class="text-xs-caps fw-bold" [ngClass]="log.result.startsWith('success') ? 'text-success' : 'text-error'" style="font-size: 8px;">
                            {{ log.result }}
                          </span>
                        </td>
                        <td class="pe-4 text-on-surface-variant font-mono small">{{ log.ip_address }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <div class="p-3 border-top border-outline-variant border-opacity-10">
                <app-pagination [currentPage]="auditPage" [totalPages]="auditTotalPages" (pageChange)="onAuditPageChange($event)" />
              </div>
            </div>
          </div>
        }

        @case ('users') {
          <div class="animate__animated animate__fadeIn pb-5">
            <app-user-management />
          </div>
        }
      }
    }
  `,
  styles: [`
    .text-xs-caps { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; }
    .active-log-item { background-color: rgba(123, 208, 255, 0.05) !important; border-left: 4px solid var(--primary) !important; padding-left: 12px !important; }
    .custom-terminal-table tr { border-bottom: 1px solid rgba(62, 72, 80, 0.1); }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .glow-primary { box-shadow: 0 0 15px rgba(0, 167, 224, 0.1); }
    .glow-error { box-shadow: 0 0 15px rgba(248, 113, 113, 0.1); }
    .text-error { color: var(--error) !important; }
    .border-error { border-color: var(--error) !important; }
    .bg-success-container { background-color: #0a1a10; }
    .border-success { border-color: #4ade80 !important; }
    .text-success { color: #4ade80 !important; }
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
  statuses = ['active', 'investigating', 'contained', 'resolved'];
  industries = ['finance', 'healthcare', 'technology', 'retail', 'education', 'government', 'energy', 'other'];

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
    if (this.auth.isAnalyst()) {
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
        const org: any = b.organisation;
        this.breachForm.patchValue({
          ...b,
          organisation: typeof org === 'string' ? org : (org?.name ?? ''),
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

    const payload: any = { ...this.breachForm.value };
    const orgName = typeof payload.organisation === 'string' ? payload.organisation.trim() : '';
    if (orgName) payload.organisation = { name: orgName };
    else delete payload.organisation;

    // Keep backend required date pair valid when creating/editing from admin UI.
    if (!payload.discovered_date && payload.breach_date) {
      payload.discovered_date = payload.breach_date;
    }

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

  severityColor(s: string): string {
    const colors: any = { critical: 'error', high: 'high', medium: 'medium', low: 'primary', informational: 'on-surface-variant' };
    return colors[s?.toLowerCase()] || 'on-surface-variant';
  }
}
