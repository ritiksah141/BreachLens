import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  ReactiveFormsModule, FormBuilder, Validators, FormGroup,
} from '@angular/forms';
import { NgClass, DecimalPipe, UpperCasePipe, TitleCasePipe } from '@angular/common';
import { BreachService } from '../../core/services/breach.service';
import { AuthService } from '../../core/services/auth.service';
import { Breach } from '../../core/models/models';
import { SeverityBadgeComponent } from '../../shared/components/severity-badge/severity-badge.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink, NgClass, DecimalPipe, UpperCasePipe, TitleCasePipe,
    SeverityBadgeComponent, PaginationComponent,
  ],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h2 class="fw-bold mb-0">
        <span class="text-warning">⚙</span> Admin Panel
      </h2>
      <span class="badge bg-warning text-dark">{{ auth.currentUser()?.role | uppercase }}</span>
    </div>

    @if (!auth.isAnalyst()) {
      <div class="alert alert-danger">
        You need analyst or admin privileges to access this page.
        <a routerLink="/auth/login" class="alert-link">Login</a>
      </div>
    }

    @if (auth.isAnalyst()) {
      <div class="row g-4">

        <!-- LEFT: Breach list -->
        <div class="col-lg-5">
          <div class="card bg-dark border-secondary">
            <div class="card-header border-secondary d-flex justify-content-between">
              <strong class="text-light">All Breaches</strong>
              <button class="btn btn-sm btn-danger" (click)="startCreate()">+ New</button>
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
                    <div>
                      <div class="text-light small fw-semibold">{{ b.title }}</div>
                      <div class="d-flex gap-1 mt-1">
                        <app-severity-badge [severity]="b.severity" />
                        <span class="badge bg-secondary">{{ b.status }}</span>
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

        <!-- RIGHT: Form -->
        <div class="col-lg-7">
          <div class="card bg-dark border-secondary">
            <div class="card-header border-secondary">
              <strong class="text-light">
                {{ editingId ? 'Edit breach' : 'New breach' }}
              </strong>
              @if (editingId) {
                <button class="btn btn-sm btn-outline-secondary ms-2" (click)="startCreate()">
                  + New instead
                </button>
              }
            </div>
            <div class="card-body">

              @if (formSuccess) {
                <div class="alert alert-success py-2 small">{{ formSuccess }}</div>
              }
              @if (formError) {
                <div class="alert alert-danger py-2 small">{{ formError }}</div>
              }

              <form [formGroup]="breachForm" (ngSubmit)="onSubmit()">
                <div class="row g-3">

                  <div class="col-12">
                    <label class="form-label text-muted small">Title *</label>
                    <input formControlName="title"
                      class="form-control form-control-sm bg-dark text-light border-secondary"
                      [ngClass]="fc('title')"
                      placeholder="e.g. Acme Corp Database Breach" />
                    @if (invalid('title')) {
                      <div class="invalid-feedback">Title required.</div>
                    }
                  </div>

                  <div class="col-12">
                    <label class="form-label text-muted small">Description *</label>
                    <textarea formControlName="description"
                      class="form-control form-control-sm bg-dark text-light border-secondary"
                      rows="3"
                      [ngClass]="fc('description')"
                      placeholder="Brief description of the breach..."></textarea>
                    @if (invalid('description')) {
                      <div class="invalid-feedback">Description required.</div>
                    }
                  </div>

                  <div class="col-md-6">
                    <label class="form-label text-muted small">Severity *</label>
                    <select formControlName="severity"
                      class="form-select form-select-sm bg-dark text-light border-secondary"
                      [ngClass]="fc('severity')">
                      <option value="">Select...</option>
                      @for (s of severities; track s) {
                        <option [value]="s">{{ s | titlecase }}</option>
                      }
                    </select>
                    @if (invalid('severity')) {
                      <div class="invalid-feedback">Severity required.</div>
                    }
                  </div>

                  <div class="col-md-6">
                    <label class="form-label text-muted small">Status *</label>
                    <select formControlName="status"
                      class="form-select form-select-sm bg-dark text-light border-secondary"
                      [ngClass]="fc('status')">
                      <option value="">Select...</option>
                      @for (s of statuses; track s) {
                        <option [value]="s">{{ s | titlecase }}</option>
                      }
                    </select>
                    @if (invalid('status')) {
                      <div class="invalid-feedback">Status required.</div>
                    }
                  </div>

                  <div class="col-md-6">
                    <label class="form-label text-muted small">Industry *</label>
                    <select formControlName="industry"
                      class="form-select form-select-sm bg-dark text-light border-secondary"
                      [ngClass]="fc('industry')">
                      <option value="">Select...</option>
                      @for (i of industries; track i) {
                        <option [value]="i">{{ i }}</option>
                      }
                    </select>
                    @if (invalid('industry')) {
                      <div class="invalid-feedback">Industry required.</div>
                    }
                  </div>

                  <div class="col-md-6">
                    <label class="form-label text-muted small">Affected records *</label>
                    <input formControlName="affected_records_count" type="number"
                      class="form-control form-control-sm bg-dark text-light border-secondary"
                      [ngClass]="fc('affected_records_count')"
                      placeholder="0" />
                    @if (invalid('affected_records_count')) {
                      <div class="invalid-feedback">Must be ≥ 0.</div>
                    }
                  </div>

                  <div class="col-md-6">
                    <label class="form-label text-muted small">Breach date *</label>
                    <input formControlName="breach_date" type="date"
                      class="form-control form-control-sm bg-dark text-light border-secondary"
                      [ngClass]="fc('breach_date')" />
                    @if (invalid('breach_date')) {
                      <div class="invalid-feedback">Required.</div>
                    }
                  </div>

                  <div class="col-md-6">
                    <label class="form-label text-muted small">Discovered date *</label>
                    <input formControlName="discovered_date" type="date"
                      class="form-control form-control-sm bg-dark text-light border-secondary"
                      [ngClass]="fc('discovered_date')" />
                    @if (invalid('discovered_date')) {
                      <div class="invalid-feedback">Required.</div>
                    }
                  </div>

                  <div class="col-md-6">
                    <label class="form-label text-muted small">Organisation</label>
                    <input formControlName="organisation"
                      class="form-control form-control-sm bg-dark text-light border-secondary"
                      placeholder="Company name" />
                  </div>

                  <div class="col-md-6">
                    <label class="form-label text-muted small">Risk score (0–10)</label>
                    <input formControlName="risk_score" type="number" min="0" max="10" step="0.1"
                      class="form-control form-control-sm bg-dark text-light border-secondary"
                      [ngClass]="fc('risk_score')"
                      placeholder="0.0 – 10.0" />
                    @if (invalid('risk_score')) {
                      <div class="invalid-feedback">Must be 0–10.</div>
                    }
                  </div>

                  <div class="col-12">
                    <label class="form-label text-muted small">Source URL</label>
                    <input formControlName="source_url" type="url"
                      class="form-control form-control-sm bg-dark text-light border-secondary"
                      placeholder="https://..." />
                  </div>

                </div>

                <div class="d-flex gap-2 mt-4">
                  <button
                    type="submit"
                    class="btn btn-danger btn-sm"
                    [disabled]="formLoading"
                  >
                    @if (formLoading) {
                      <span class="spinner-border spinner-border-sm me-1"></span>
                    }
                    {{ editingId ? 'Save changes' : 'Create breach' }}
                  </button>
                  @if (editingId) {
                    <button type="button" class="btn btn-sm btn-outline-secondary" (click)="cancelEdit()">
                      Cancel
                    </button>
                  }
                </div>
              </form>
            </div>
          </div>
        </div>

      </div>
    }
  `,
  styles: [`
    .active-item { background-color: rgba(220,53,69,0.1) !important; border-left: 3px solid #dc3545 !important; }
  `],
})
export class AdminComponent implements OnInit {
  private breachService = inject(BreachService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  auth = inject(AuthService);

  breaches: Breach[] = [];
  page = 1;
  totalPages = 1;
  listLoading = false;
  selectedId = '';
  editingId = '';

  formLoading = false;
  formSuccess = '';
  formError = '';

  severities = ['critical', 'high', 'medium', 'low', 'informational'];
  statuses = ['open', 'investigating', 'contained', 'resolved', 'closed'];
  industries = [
    'Finance', 'Healthcare', 'Technology', 'Retail', 'Education',
    'Government', 'Energy', 'Telecommunications', 'Legal', 'Other',
  ];

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
    source_url:             [''],
  });

  ngOnInit(): void {
    this.loadBreaches();
    // Support deep-link: /admin?edit=<id>
    this.route.queryParams.subscribe((p) => {
      if (p['edit']) this.loadForEdit(p['edit']);
    });
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

  selectBreach(b: Breach): void {
    this.selectedId = b._id;
    this.loadForEdit(b._id);
  }

  loadForEdit(id: string): void {
    this.editingId = id;
    this.breachService.getBreach(id).subscribe({
      next: (res: any) => {
        const b: Breach = res.data;
        this.breachForm.patchValue({
          ...b,
          breach_date:     b.breach_date?.slice(0, 10),
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
        this.formSuccess = this.editingId
          ? 'Breach updated successfully.'
          : 'Breach created successfully.';
        this.loadBreaches();
        if (!this.editingId) this.breachForm.reset({ affected_records_count: 0 });
      },
      error: (err) => {
        this.formLoading = false;
        const detail = err?.error?.details?.errors?.join(', ');
        this.formError = detail ?? err?.error?.message ?? 'Operation failed.';
      },
    });
  }

  deleteBreach(id: string, event: Event): void {
    event.stopPropagation();
    if (!confirm('Delete this breach? This cannot be undone.')) return;

    this.breachService.deleteBreach(id).subscribe({
      next: () => {
        this.formSuccess = 'Breach deleted.';
        if (this.editingId === id) this.startCreate();
        this.loadBreaches();
      },
      error: (err) => {
        this.formError = err?.error?.message ?? 'Delete failed.';
      },
    });
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
