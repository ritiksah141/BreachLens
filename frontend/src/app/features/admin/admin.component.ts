import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  ReactiveFormsModule, FormBuilder, Validators, FormGroup,
} from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { NgClass, DecimalPipe, UpperCasePipe, TitleCasePipe, KeyValuePipe, DatePipe, CommonModule } from '@angular/common';
import { BreachService } from '../../core/services/breach.service';
import { AdminService } from '../../core/services/admin.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { Breach, SystemStats, AuditLog } from '../../core/models/models';
import { SeverityBadgeComponent } from '../../shared/components/severity-badge/severity-badge.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { UserManagementComponent } from './user-management/user-management.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink, NgClass, DecimalPipe, UpperCasePipe, TitleCasePipe, KeyValuePipe, DatePipe,
    SeverityBadgeComponent, PaginationComponent, UserManagementComponent, CommonModule, FormsModule,
  ],
  template: `
    <!-- Page Header -->
    <div class="glass-panel p-4 mb-4 shadow-lg d-flex justify-content-between align-items-center border-0">
      <div>
        <h2 class="font-headline fw-extrabold text-on-surface tracking-tight page-title mb-1">Command Center</h2>
        <p class="page-subtitle mb-0 opacity-75">System Administration Terminal</p>
      </div>
      <div class="d-flex gap-3 align-items-center">
        <button class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-2 px-3 shadow-sm text-on-surface" (click)="refreshStats()">
          <span class="material-symbols-outlined fs-6 me-1">refresh</span> SYNC DATA
        </button>
        <span class="badge py-2 px-3 glass-panel border border-primary border-opacity-25 text-primary text-xs-caps shadow-sm">{{ (auth.currentUser()?.role || 'operator') | uppercase }} ACCESS</span>
      </div>
    </div>

    @if (!auth.isAdmin()) {
      <div class="glass-panel p-4 border-error border-start border-4 shadow-lg animate__animated animate__shakeX">
        <div class="d-flex align-items-center gap-3">
          <span class="material-symbols-outlined fs-2 text-error">security</span>
          <div>
            <div class="fw-bold text-xs-caps text-error mb-1">Access Denied</div>
            <div class="small opacity-75 text-on-surface">Elevated privileges required for terminal access. Please <a routerLink="/auth/login" class="text-error fw-bold">Login</a>.</div>
          </div>
        </div>
      </div>
    }

    @if (auth.isAdmin()) {
      <!-- System Stats Row -->
      @if (stats) {
        <div class="row g-4 mb-4">
          <div class="col-md-4">
            <div class="glass-panel p-4 border-0 border-start border-primary border-4 shadow-lg">
              <div class="text-xs-caps text-on-surface-variant mb-2" style="font-size: 8px;">OPERATOR NETWORK</div>
              <div class="d-flex justify-content-between align-items-end">
                <h3 class="mb-0 fw-bold font-headline text-on-surface">{{ stats.users.total }}</h3>
                <div class="text-xs-caps" style="font-size: 8px;">
                  <span class="text-success">{{ stats.users.active }} ACTIVE</span> •
                  <span class="text-error opacity-50">{{ stats.users.inactive }} OFFLINE</span>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="glass-panel p-4 border-0 border-start border-secondary border-4 shadow-lg">
              <div class="text-xs-caps text-on-surface-variant mb-2" style="font-size: 8px;">INTELLIGENCE REPOSITORY</div>
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
            <div class="glass-panel p-4 border-0 border-start border-error border-4 shadow-lg">
              <div class="text-xs-caps text-on-surface-variant mb-2" style="font-size: 8px;">CRITICAL ALERTS</div>
              <div class="d-flex justify-content-between align-items-end">
                <h3 class="mb-0 fw-bold font-headline text-error">{{ stats.alerts.unacknowledged }}</h3>
                <div class="text-xs-caps text-error opacity-75 d-flex align-items-center gap-2" style="font-size: 8px;">
                  <span class="p-1 bg-success rounded-circle animate-pulse" style="width: 6px; height: 6px;"></span>
                  UNACKNOWLEDGED EVENTS
                </div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Tab Navigation - Full Width -->
      <div class="glass-panel p-1 mb-4 d-flex border border-outline-variant border-opacity-10 shadow-sm" style="border-radius: 999px;">
        <button class="btn text-xs-caps py-2 px-4 rounded-pill transition-all flex-grow-1"
                [ngClass]="activeTab === 'manage' ? 'btn-primary text-on-primary shadow-sm' : 'btn-link text-on-surface-variant text-decoration-none'"
          (click)="activeTab = 'manage'">MANAGE LOGS</button>
        <button class="btn text-xs-caps py-2 px-4 rounded-pill transition-all flex-grow-1"
                [ngClass]="activeTab === 'bulk' ? 'btn-primary text-on-primary shadow-sm' : 'btn-link text-on-surface-variant text-decoration-none'"
          (click)="activeTab = 'bulk'">BULK IMPORT</button>
        <button class="btn text-xs-caps py-2 px-4 rounded-pill transition-all flex-grow-1"
                [ngClass]="activeTab === 'audit' ? 'btn-primary text-on-primary shadow-sm' : 'btn-link text-on-surface-variant text-decoration-none'"
          (click)="loadAuditLogs(); activeTab = 'audit'">AUDIT TRAIL</button>
        <button class="btn text-xs-caps py-2 px-4 rounded-pill transition-all flex-grow-1"
                [ngClass]="activeTab === 'health' ? 'btn-primary text-on-primary shadow-sm' : 'btn-link text-on-surface-variant text-decoration-none'"
                (click)="loadHealthData(); activeTab = 'health'">HEALTH</button>
        <button class="btn text-xs-caps py-2 px-4 rounded-pill transition-all flex-grow-1"
                [ngClass]="activeTab === 'users' ? 'btn-primary text-on-primary shadow-sm' : 'btn-link text-on-surface-variant text-decoration-none'"
                (click)="activeTab = 'users'">OPERATORS</button>
      </div>

      @switch (activeTab) {
        @case ('health') {
          <div class="animate__animated animate__fadeIn">
             <div class="row g-4">
                <div class="col-md-6">
                   <div class="glass-panel p-4 shadow-lg border-0 h-100">
                      <h5 class="text-xs-caps text-primary mb-4">SYSTEM READINESS</h5>
                      @if (healthReady) {
                         <div class="d-flex flex-column gap-3">
                            <div class="p-3 bg-surface-container-high rounded d-flex justify-content-between align-items-center">
                               <span class="text-xs-caps opacity-75">DATABASE CONNECTION</span>
                               <span class="badge" [ngClass]="healthReady.checks.database === 'ok' ? 'bg-success' : 'bg-error'">{{ healthReady.checks.database | uppercase }}</span>
                            </div>
                            <div class="p-3 bg-surface-container-high rounded d-flex justify-content-between align-items-center">
                               <span class="text-xs-caps opacity-75">OVERALL STATUS</span>
                               <span class="badge" [ngClass]="healthReady.status === 'ok' ? 'bg-success' : 'bg-error'">{{ healthReady.status | uppercase }}</span>
                            </div>
                         </div>
                      }
                   </div>
                </div>
                <div class="col-md-6">
                   <div class="glass-panel p-4 shadow-lg border-0 h-100">
                      <h5 class="text-xs-caps text-secondary mb-4">API METADATA</h5>
                      @if (healthInfo) {
                         <div class="d-flex flex-column gap-2">
                            <div class="d-flex justify-content-between border-bottom border-outline-variant border-opacity-10 pb-2">
                               <span class="text-xs-caps opacity-50">APPLICATION</span>
                               <span class="text-on-surface fw-bold small">{{ healthInfo.application }}</span>
                            </div>
                            <div class="d-flex justify-content-between border-bottom border-outline-variant border-opacity-10 pb-2">
                               <span class="text-xs-caps opacity-50">PYTHON VERSION</span>
                               <span class="text-on-surface font-mono small">{{ healthInfo.python_version }}</span>
                            </div>
                            <div class="d-flex justify-content-between border-bottom border-outline-variant border-opacity-10 pb-2">
                               <span class="text-xs-caps opacity-50">UPTIME</span>
                               <span class="text-on-surface fw-bold small">{{ healthInfo.uptime_seconds }} SECONDS</span>
                            </div>
                         </div>
                      }
                   </div>
                </div>
             </div>
          </div>
        }
        @case ('manage') {
          <div class="row g-4 animate__animated animate__fadeIn align-items-stretch">
            <!-- Table Side -->
            <div class="col-lg-7 d-flex">
              <div class="glass-panel flex-grow-1 shadow-lg overflow-hidden border-0 d-flex flex-column">
                <div class="p-3 border-bottom border-outline-variant border-opacity-10 d-flex justify-content-between align-items-center bg-surface-container-low">
                  <span class="text-xs-caps text-on-surface fw-bold">Active Investigation Log</span>
                  <div class="d-flex gap-2">
                    @if (selectedIds.size > 0 && auth.isAdmin()) {
                      <button class="btn btn-dark bg-error-container bg-opacity-10 text-error border-0 text-xs-caps py-1 px-2 fw-bold" (click)="bulkDelete()" style="font-size: 8px;">
                        DELETE ({{ selectedIds.size }})
                      </button>
                    }
                    <button class="btn btn-primary text-on-primary text-xs-caps py-1 px-2 fw-bold" (click)="startCreate()" style="font-size: 8px;">+ NEW ENTRY</button>
                  </div>
                </div>

                <!-- Filters Grid -->
                <div class="p-3 border-bottom border-outline-variant border-opacity-10 bg-surface-container-high">
                  <div class="row g-2 align-items-end">
                    <div class="col-md-3">
                      <label class="text-xs-caps text-on-surface-variant mb-1 d-block" style="font-size: 7px;">QUERY</label>
                      <input class="form-control bg-surface-container-low border-0 text-on-surface text-xs-caps" style="font-size: 10px; height: 32px;" placeholder="Title or source..." [(ngModel)]="adminFilters.q" (input)="onAdminSearchChange()" (keyup.enter)="applyAdminFilters()" />
                    </div>
                    <div class="col-md-2">
                      <label class="text-xs-caps text-on-surface-variant mb-1 d-block" style="font-size: 7px;">LEVEL</label>
                      <select class="form-select bg-surface-container-low border-0 text-on-surface text-xs-caps" style="font-size: 10px; height: 32px;" [(ngModel)]="adminFilters.severity" (change)="applyAdminFilters()">
                        <option value="">ALL SEVERITY</option>
                        @for (s of severities; track s) { <option [value]="s">{{ s | uppercase }}</option> }
                      </select>
                    </div>
                    <div class="col-md-2">
                      <label class="text-xs-caps text-on-surface-variant mb-1 d-block" style="font-size: 7px;">STATUS</label>
                      <select class="form-select bg-surface-container-low border-0 text-on-surface text-xs-caps" style="font-size: 10px; height: 32px;" [(ngModel)]="adminFilters.status" (change)="applyAdminFilters()">
                        <option value="">ALL STATUS</option>
                        @for (s of statuses; track s) { <option [value]="s">{{ s | uppercase }}</option> }
                      </select>
                    </div>
                    <div class="col-md-2">
                      <label class="text-xs-caps text-on-surface-variant mb-1 d-block" style="font-size: 7px;">MIN RISK</label>
                      <input type="number" min="0" max="10" step="0.1" class="form-control bg-surface-container-low border-0 text-on-surface text-xs-caps text-center" style="font-size: 10px; height: 32px;" placeholder="0.0" [(ngModel)]="adminFilters.min_risk" (change)="applyAdminFilters()" />
                    </div>
                    <div class="col-md-3 d-flex gap-2">
                      <button class="btn btn-primary text-on-primary text-xs-caps py-1 flex-grow-1 fw-bold" style="font-size: 8px; height: 32px;" (click)="applyAdminFilters()">QUERY</button>
                      <button class="btn btn-dark bg-surface-container-highest border-0 text-on-surface text-xs-caps py-1 flex-grow-1 fw-bold" style="font-size: 8px; height: 32px;" (click)="resetAdminFilters()">RESET</button>
                    </div>
                  </div>
                  <!-- Filter Chips -->
                  <div class="d-flex flex-wrap gap-2 mt-3" *ngIf="adminFilterChips.length">
                    @for (chip of adminFilterChips; track chip.key) {
                      <div class="badge glass-panel border border-outline-variant border-opacity-25 text-on-surface py-1 px-2 d-flex align-items-center gap-2">
                        <span style="font-size: 7px;">{{ chip.label | uppercase }}</span>
                        <button class="btn btn-link p-0 text-on-surface-variant border-0 d-flex align-items-center" (click)="clearAdminFilter(chip.key)">
                          <span class="btn-close-tactical" style="width: 14px; height: 14px;"><span class="material-symbols-outlined" style="font-size: 9px !important;">close</span></span>
                        </button>
                      </div>
                    }
                  </div>
                </div>

                <div class="p-0 overflow-auto custom-scrollbar flex-grow-1" style="max-height: 550px;">
                  @if (listLoading) {
                    <div class="text-center py-5"><div class="spinner-border spinner-border-sm text-primary"></div></div>
                  }
                  <div class="list-group list-group-flush">
                    @for (b of breaches; track b._id) {
                      <div class="list-group-item bg-transparent border-outline-variant border-opacity-10 p-3 d-flex justify-content-between align-items-start transition-all hover-bg-surface-container-high"
                           [ngClass]="{ 'active-log-item': selectedId === b._id }"
                           (click)="selectBreach(b)" style="cursor: pointer;">
                        <div class="d-flex gap-3 align-items-start">
                          <input type="checkbox" class="form-check-input mt-1" [checked]="selectedIds.has(b._id)" (click)="$event.stopPropagation()" (change)="toggleSelection(b._id)" />
                          <div>
                            <div class="fw-bold text-on-surface small mb-1">{{ b.title }}</div>
                            <div class="d-flex gap-2 align-items-center">
                              <span class="text-xs-caps" [ngClass]="'text-' + severityColor(b.severity)" style="font-size: 8px;">{{ b.severity | uppercase }}</span>
                              <span class="text-on-surface-variant opacity-25">•</span>
                              <span class="text-xs-caps text-on-surface-variant" style="font-size: 8px;">{{ (b.status || 'LOGGED') | uppercase }}</span>
                            </div>
                          </div>
                        </div>
                        <button class="btn-close-tactical ms-2" (click)="deleteBreach(b._id, $event)">
                          <span class="material-symbols-outlined">close</span>
                        </button>
                      </div>
                    }
                  </div>
                </div>
                <div class="p-3 border-top border-outline-variant border-opacity-10 bg-surface-container-low mt-auto">
                  <app-pagination [currentPage]="page" [totalPages]="totalPages" (pageChange)="onPageChange($event)" />
                </div>
              </div>
            </div>

            <!-- Form Side -->
            <div class="col-lg-5 d-flex">
              <div class="glass-panel flex-grow-1 shadow-lg border-0 d-flex flex-column">
                <div class="p-3 border-bottom border-outline-variant border-opacity-10 bg-surface-container-low" style="border-radius: 1.25rem 1.25rem 0 0;">
                  <span class="text-xs-caps text-on-surface fw-bold">{{ editingId ? 'EDIT LOG ENTRY' : 'CREATE NEW ENTRY' }}</span>
                </div>
                <div class="p-4 d-flex flex-column flex-grow-1 overflow-auto custom-scrollbar" style="max-height: 750px;">
                  @if (formSuccess) { <div class="alert bg-success-container bg-opacity-10 border-success text-success py-2 small mb-4 text-xs-caps border-0 border-start border-4">{{ formSuccess | uppercase }}</div> }
                  @if (formError) { <div class="alert bg-error-container bg-opacity-10 border-error text-error py-2 small mb-4 text-xs-caps border-0 border-start border-4">{{ formError | uppercase }}</div> }

                  <form [formGroup]="breachForm" (ngSubmit)="onSubmit()" class="d-flex flex-column flex-grow-1">
                    <div class="row g-3">
                      <!-- Primary Intelligence -->
                      <div class="col-12">
                        <label class="text-xs-caps text-on-surface-variant mb-1 d-block" style="font-size: 8px;">EVENT TITLE</label>
                        <input formControlName="title" class="form-control bg-surface-container-high border-0 text-on-surface" [ngClass]="fc('title')" placeholder="Enter event title..." />
                      </div>
                      <div class="col-12">
                        <label class="text-xs-caps text-on-surface-variant mb-1 d-block" style="font-size: 8px;">DESCRIPTION</label>
                        <textarea formControlName="description" class="form-control bg-surface-container-high border-0 text-on-surface" rows="3" [ngClass]="fc('description')" placeholder="Telemetry details..."></textarea>
                      </div>

                      <!-- Classification -->
                      <div class="col-md-6">
                        <label class="text-xs-caps text-on-surface-variant mb-1 d-block" style="font-size: 8px;">THREAT LEVEL</label>
                        <select formControlName="severity" class="form-select bg-surface-container-high border-0 text-on-surface" [ngClass]="fc('severity')">
                          @for (s of severities; track s) { <option [value]="s">{{ s | uppercase }}</option> }
                        </select>
                      </div>
                      <div class="col-md-6">
                        <label class="text-xs-caps text-on-surface-variant mb-1 d-block" style="font-size: 8px;">STATUS</label>
                        <select formControlName="status" class="form-select bg-surface-container-high border-0 text-on-surface" [ngClass]="fc('status')">
                          @for (s of statuses; track s) { <option [value]="s">{{ s | uppercase }}</option> }
                        </select>
                      </div>

                      <!-- Operational Metadata -->
                      <div class="col-md-6">
                        <label class="text-xs-caps text-on-surface-variant mb-1 d-block" style="font-size: 8px;">BREACH DATE</label>
                        <input formControlName="breach_date" type="date" class="form-control bg-surface-container-high border-0 text-on-surface" [ngClass]="fc('breach_date')" />
                      </div>
                      <div class="col-md-6">
                        <label class="text-xs-caps text-on-surface-variant mb-1 d-block" style="font-size: 8px;">DISCOVERED DATE</label>
                        <input formControlName="discovered_date" type="date" class="form-control bg-surface-container-high border-0 text-on-surface" [ngClass]="fc('discovered_date')" />
                      </div>

                      <div class="col-md-6">
                        <label class="text-xs-caps text-on-surface-variant mb-1 d-block" style="font-size: 8px;">RISK SCORE</label>
                        <input formControlName="risk_score" type="number" step="0.1" class="form-control bg-surface-container-high border-0 text-on-surface" [ngClass]="fc('risk_score')" />
                      </div>
                      <div class="col-md-6">
                        <label class="text-xs-caps text-on-surface-variant mb-1 d-block" style="font-size: 8px;">RECORDS IMPACTED</label>
                        <input formControlName="affected_records_count" type="number" class="form-control bg-surface-container-high border-0 text-on-surface" [ngClass]="fc('affected_records_count')" />
                      </div>

                      <!-- Target Organization -->
                      <div class="col-12 mt-2 pt-2 border-top border-outline-variant border-opacity-10">
                        <label class="text-xs-caps text-primary mb-2 d-block fw-bold" style="font-size: 8px;">TARGET ORGANIZATION</label>
                      </div>
                      <div class="col-md-8" formGroupName="organisation">
                        <label class="text-xs-caps text-on-surface-variant mb-1 d-block" style="font-size: 8px;">ORG NAME</label>
                        <input formControlName="name" class="form-control bg-surface-container-high border-0 text-on-surface" placeholder="Organization name..." />
                      </div>
                      <div class="col-md-4">
                        <label class="text-xs-caps text-on-surface-variant mb-1 d-block" style="font-size: 8px;">INDUSTRY</label>
                        <select formControlName="industry" class="form-select bg-surface-container-high border-0 text-on-surface" [ngClass]="fc('industry')">
                          @for (i of industries; track i) { <option [value]="i">{{ i | uppercase }}</option> }
                        </select>
                      </div>
                      <div class="col-md-7" formGroupName="organisation">
                        <label class="text-xs-caps text-on-surface-variant mb-1 d-block" style="font-size: 8px;">PRIMARY DOMAIN</label>
                        <input formControlName="domain" class="form-control bg-surface-container-high border-0 text-on-surface" placeholder="domain.com" />
                      </div>
                      <div class="col-md-5" formGroupName="organisation">
                        <label class="text-xs-caps text-on-surface-variant mb-1 d-block" style="font-size: 8px;">ORG SIZE</label>
                        <select formControlName="size" class="form-select bg-surface-container-high border-0 text-on-surface">
                          <option value="small">SMALL</option>
                          <option value="mid">MID-MARKET</option>
                          <option value="large">LARGE</option>
                          <option value="enterprise">ENTERPRISE</option>
                        </select>
                      </div>

                      <!-- Technical Context -->
                      <div class="col-12 mt-2 pt-2 border-top border-outline-variant border-opacity-10">
                        <label class="text-xs-caps text-primary mb-2 d-block fw-bold" style="font-size: 8px;">TECHNICAL CONTEXT</label>
                      </div>
                      <div class="col-12">
                        <label class="text-xs-caps text-on-surface-variant mb-1 d-block" style="font-size: 8px;">SOURCE INTEL URL</label>
                        <input formControlName="source_url" class="form-control bg-surface-container-high border-0 text-on-surface" placeholder="https://..." />
                      </div>
                      <div class="col-12">
                        <label class="text-xs-caps text-on-surface-variant mb-1 d-block" style="font-size: 8px;">EXPOSED DATA TYPES (COMMA SEPARATED)</label>
                        <input formControlName="data_types_input" class="form-control bg-surface-container-high border-0 text-on-surface" placeholder="email, passwords, addresses..." />
                      </div>
                    </div>

                    <div class="d-flex gap-2 mt-auto pt-4">
                      <button type="submit" class="btn btn-primary text-on-primary px-4 py-2 text-xs-caps flex-grow-1 fw-bold" [disabled]="formLoading" style="height: 48px;">
                        {{ editingId ? 'UPDATE RECORD' : 'CREATE RECORD' }}
                      </button>
                      @if (editingId) {
                        <button type="button" class="btn btn-dark bg-surface-container-highest border-0 text-on-surface px-4 py-2 text-xs-caps" (click)="cancelEdit()" style="height: 48px;">CANCEL</button>
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
            <div class="glass-panel shadow-lg overflow-hidden border-0">
              <div class="p-3 border-bottom border-outline-variant border-opacity-10 d-flex justify-content-between bg-surface-container-low">
                <span class="text-xs-caps text-on-surface fw-bold">Bulk Import Processor</span>
                <span class="text-xs-caps opacity-50 text-on-surface-variant" style="font-size: 8px;">JSON SCHEMA REQUIRED</span>
              </div>
              <div class="card-body p-4 p-md-5">
                <div class="mb-5 p-4 bg-surface-container-high border border-outline-variant border-opacity-10 rounded-3">
                  <label class="text-xs-caps text-on-surface-variant mb-3 d-block">UPLOAD LOG PACKET</label>
                  <input type="file" (change)="onFileSelected($event)" accept=".json" class="form-control bg-surface-container border-0 text-on-surface" />
                </div>

                <label class="text-xs-caps text-on-surface-variant mb-3 d-block">MANUAL DATA BUFFER</label>
                <textarea #jsonInput class="form-control bg-surface-container-high border-0 font-monospace text-primary mb-4"
                          style="font-size: 11px; height: 300px;"
                          placeholder='[ { "title": "Breach Event", ... } ]'></textarea>

                @if (bulkSuccess) { <div class="alert bg-success-container bg-opacity-10 border-success text-success py-2 small mb-4 text-xs-caps border-0 border-start border-4">{{ bulkSuccess | uppercase }}</div> }
                @if (bulkError) { <div class="alert bg-error-container bg-opacity-10 border-error text-error py-2 small mb-4 text-xs-caps border-0 border-start border-4">{{ bulkError | uppercase }}</div> }

                <button class="btn btn-primary text-on-primary py-3 px-5 text-xs-caps fw-bold" (click)="onBulkImport(jsonInput.value)" [disabled]="bulkLoading">
                   PROCESS IMPORT
                </button>
              </div>
            </div>
          </div>
        }

        @case ('audit') {
          <div class="animate__animated animate__fadeIn">
            <div class="glass-panel shadow-lg overflow-hidden border-0">
              <div class="p-3 border-bottom border-outline-variant border-opacity-10 d-flex justify-content-between align-items-center bg-surface-container-low">
                <span class="text-xs-caps text-on-surface fw-bold">System Audit Trail</span>
                <button class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-1 px-2 text-on-surface" style="font-size: 8px;" (click)="loadAuditLogs()">REFRESH TRAIL</button>
              </div>
              <div class="p-0 table-responsive">
                <table class="table table-hover mb-0 align-middle">
                  <thead>
                    <tr class="bg-surface-container-low">
                      <th class="ps-4 text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 8px;">TIMESTAMP</th>
                      <th class="text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 8px;">OPERATOR</th>
                      <th class="text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 8px;">ACTION</th>
                      <th class="text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 8px;">RESOURCE</th>
                      <th class="text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 8px;">RESULT</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (log of auditLogs; track log.timestamp) {
                      <tr class="bg-transparent border-bottom border-outline-variant border-opacity-5">
                        <td class="ps-4 text-on-surface-variant small font-mono">{{ log.timestamp | date:'MM.dd HH:mm:ss' }}</td>
                        <td><span class="text-primary fw-bold font-mono small">{{ log.user_id }}</span></td>
                        <td><span class="text-xs-caps opacity-75 border border-outline-variant border-opacity-25 px-2 py-1 rounded text-on-surface" style="font-size: 8px;">{{ log.action | uppercase }}</span></td>
                        <td class="text-on-surface-variant small text-on-surface">{{ log.resource }}</td>
                        <td><span class="text-xs-caps fw-bold" [ngClass]="log.result.startsWith('success') ? 'text-success' : 'text-error'" style="font-size: 8px;">{{ log.result | uppercase }}</span></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <div class="p-3 border-top border-outline-variant border-opacity-10 bg-surface-container-low">
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
    .custom-scrollbar::-webkit-scrollbar { width: 3px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--outline-variant); border-radius: 10px; }

    /* Tactical Input Refinements */
    .form-control, .form-select {
      font-size: 11px !important;
      padding: 0.5rem 0.75rem !important;
      letter-spacing: 0.02em;
    }
    textarea.form-control {
      font-size: 11px !important;
      line-height: 1.5;
    }
    .form-control::placeholder {
      font-size: 10px;
      opacity: 0.5;
    }
  `],
})
export class AdminComponent implements OnInit {
  private breachService = inject(BreachService);
  private adminService = inject(AdminService);
  auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private notifications = inject(NotificationService);
  private route = inject(ActivatedRoute);

  activeTab = 'manage';
  breaches: Breach[] = [];
  stats: SystemStats | null = null;
  auditLogs: AuditLog[] = [];
  selectedIds = new Set<string>();
  selectedId: string | null = null;

  // Pagination
  page = 1;
  totalPages = 1;
  auditPage = 1;
  auditTotalPages = 1;

  healthReady: any = null;
  healthInfo: any = null;

  // Form State
  breachForm: FormGroup;
  editingId: string | null = null;
  formLoading = false;
  listLoading = false;
  bulkLoading = false;
  formError = '';
  formSuccess = '';
  bulkError = '';
  bulkSuccess = '';

  severities = ['critical', 'high', 'medium', 'low', 'informational'];
  statuses = ['active', 'investigating', 'contained', 'resolved'];
  industries = ['finance', 'healthcare', 'technology', 'retail', 'education', 'government', 'energy', 'other'];

  adminFilters = { q: '', severity: '', status: '', min_risk: null as number | null };
  private adminSearchTimer: any;

  constructor() {
    this.breachForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required]],
      severity: ['medium', [Validators.required]],
      status: ['active', [Validators.required]],
      industry: ['technology', [Validators.required]],
      affected_records_count: [0, [Validators.required, Validators.min(0)]],
      risk_score: [5.0, [Validators.required, Validators.min(0), Validators.max(10)]],
      breach_date: [new Date().toISOString().split('T')[0], [Validators.required]],
      discovered_date: [new Date().toISOString().split('T')[0], [Validators.required]],
      source_url: [''],
      data_types_input: [''], // Will be processed on submit
      organisation: this.fb.group({
        name: [''],
        domain: [''],
        size: ['mid'],
      }),
      location: this.fb.group({
        type: ['Point'],
        coordinates: [[0, 0]],
      }),
    });
  }

  ngOnInit(): void {
    this.loadStats();
    this.loadBreaches();
    this.route.queryParams.subscribe((params) => {
      if (params['edit']) this.loadForEdit(params['edit']);
    });
  }

  loadStats(): void {
    this.adminService.getSystemStats().subscribe({
      next: (res) => (this.stats = res.data),
    });
  }

  refreshStats(): void {
    this.loadStats();
    this.loadBreaches();
    this.notifications.show('System telemetry synchronized.', 'info', 2000);
  }

  loadBreaches(): void {
    this.listLoading = true;
    const params = {
      page: this.page,
      limit: 10,
      q: this.adminFilters.q,
      severity: this.adminFilters.severity || undefined,
      status: this.adminFilters.status || undefined,
      min_risk: this.adminFilters.min_risk !== null ? this.adminFilters.min_risk : undefined
    };

    this.breachService.getBreaches(params).subscribe({
      next: (res: any) => {
        this.breaches = res.data;
        this.totalPages = res.meta.total_pages;
        this.listLoading = false;
      },
      error: () => (this.listLoading = false),
    });
  }

  applyAdminFilters(): void {
    this.page = 1;
    this.loadBreaches();
  }

  onAdminSearchChange(): void {
    clearTimeout(this.adminSearchTimer);
    this.adminSearchTimer = setTimeout(() => this.applyAdminFilters(), 300);
  }

  resetAdminFilters(): void {
    this.adminFilters = {
      q: '',
      severity: '',
      status: '',
      min_risk: null
    };
    this.applyAdminFilters();
  }

  get adminFilterChips(): Array<{ key: string; label: string }> {
    const chips: Array<{ key: string; label: string }> = [];
    if (this.adminFilters.q.trim()) {
      chips.push({ key: 'q', label: `Search: ${this.adminFilters.q.trim()}` });
    }
    if (this.adminFilters.severity) {
      chips.push({ key: 'severity', label: `Severity: ${this.adminFilters.severity}` });
    }
    if (this.adminFilters.status) {
      chips.push({ key: 'status', label: `Status: ${this.adminFilters.status}` });
    }
    if (this.adminFilters.min_risk !== null) {
      chips.push({ key: 'min_risk', label: `Min Risk: ${this.adminFilters.min_risk}` });
    }
    return chips;
  }

  clearAdminFilter(key: string): void {
    if (key === 'q') this.adminFilters.q = '';
    if (key === 'severity') this.adminFilters.severity = '';
    if (key === 'status') this.adminFilters.status = '';
    if (key === 'min_risk') this.adminFilters.min_risk = null;
    this.applyAdminFilters();
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
        const data = res.data;
        this.breachForm.patchValue({
          title: data.title,
          description: data.description,
          severity: data.severity,
          status: data.status || 'active',
          industry: data.industry,
          affected_records_count: data.affected_records_count,
          risk_score: data.risk_score,
          breach_date: data.breach_date ? new Date(data.breach_date).toISOString().split('T')[0] : '',
          discovered_date: data.discovered_date ? new Date(data.discovered_date).toISOString().split('T')[0] : '',
          source_url: data.source_url || '',
          data_types_input: (data.data_types_exposed || []).join(', '),
          organisation: {
            name: data.organisation?.name || '',
            domain: data.organisation?.domain || '',
            size: data.organisation?.size || 'mid',
          }
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    });
  }

  startCreate(): void {
    this.editingId = null;
    this.selectedId = null;
    this.breachForm.reset({
      severity: 'medium',
      status: 'active',
      industry: 'technology',
      affected_records_count: 0,
      risk_score: 5.0,
      breach_date: new Date().toISOString().split('T')[0],
      discovered_date: new Date().toISOString().split('T')[0],
      source_url: '',
      data_types_input: '',
      organisation: {
        name: '',
        domain: '',
        size: 'mid',
      },
      location: {
        type: 'Point',
        coordinates: [0, 0],
      },
    });
  }

  cancelEdit(): void {
    this.startCreate();
  }

  onSubmit(): void {
    if (this.breachForm.invalid) {
      this.notifications.show('VALIDATION FAILED. CHECK REQUIRED FIELDS.', 'warning', 3000);
      this.breachForm.markAllAsTouched();
      return;
    }
    this.formLoading = true;
    this.formError = '';

    // Process data types exposed
    const rawVal = this.breachForm.value;
    const dataTypes = (rawVal.data_types_input || '')
      .split(',')
      .map((s: string) => s.trim().toLowerCase())
      .filter(Boolean);

    const payload = {
      ...rawVal,
      data_types_exposed: dataTypes
    };
    delete payload.data_types_input;

    const obs = this.editingId
      ? this.adminService.updateBreach(this.editingId, payload)
      : this.adminService.createBreach(payload);

    obs.subscribe({
      next: () => {
        this.formLoading = false;
        this.formSuccess = this.editingId ? 'Record updated.' : 'Record created.';
        this.startCreate();
        this.loadBreaches();
        this.loadStats();
        setTimeout(() => (this.formSuccess = ''), 3000);
      },
      error: (err: any) => {
        this.formLoading = false;
        this.formError = err.error?.message || 'Operation failed.';
      },
    });
  }

  deleteBreach(id: string, event: Event): void {
    event.stopPropagation();
    if (!confirm('Confirm permanent deletion of this intelligence record?')) return;
    this.adminService.deleteBreach(id).subscribe({
      next: () => {
        this.loadBreaches();
        this.loadStats();
        this.notifications.show('Record purged from repository.', 'info', 2500);
      },
    });
  }

  toggleSelection(id: string): void {
    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else this.selectedIds.add(id);
  }

  bulkDelete(): void {
    if (!confirm(`Purge ${this.selectedIds.size} selected records?`)) return;
    const ids = Array.from(this.selectedIds);
    this.adminService.bulkDeleteBreaches(ids).subscribe({
      next: () => {
        this.selectedIds.clear();
        this.loadBreaches();
        this.loadStats();
        this.notifications.show('Bulk purge operation complete.', 'info', 3000);
      },
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = JSON.parse(e.target.result);
        (document.querySelector('textarea') as HTMLTextAreaElement).value = JSON.stringify(data, null, 2);
      } catch (err) {
        this.notifications.show('Invalid JSON file.', 'error');
      }
    };
    reader.readAsText(file);
  }

  onBulkImport(jsonStr: string): void {
    try {
      const data = JSON.parse(jsonStr);
      this.bulkLoading = true;
      this.adminService.bulkImport(data).subscribe({
        next: (res: any) => {
          this.bulkLoading = false;
          this.bulkSuccess = `Import complete: ${res.data?.inserted_count || 0} records processed.`;
          this.loadBreaches();
          this.loadStats();
          setTimeout(() => (this.bulkSuccess = ''), 5000);
        },
        error: (err: any) => {
          this.bulkLoading = false;
          this.bulkError = err.error?.message || 'Bulk import failed.';
        },
      });
    } catch (err) {
      this.notifications.show('Invalid JSON input.', 'error');
    }
  }

  loadAuditLogs(): void {
    this.adminService.getAuditLogs(this.auditPage, 15).subscribe({
      next: (res: any) => {
        this.auditLogs = res.data;
        this.auditTotalPages = res.meta.total_pages;
      },
    });
  }

  onAuditPageChange(p: number): void {
    this.auditPage = p;
    this.loadAuditLogs();
  }

  loadHealthData(): void {
    this.adminService.getHealthReady().subscribe({
      next: (res) => this.healthReady = res,
      error: (err) => this.healthReady = err.error
    });
    this.adminService.getHealthInfo().subscribe({
      next: (res) => this.healthInfo = res
    });
  }

  severityColor(s: string): string {
    const colors: any = { critical: 'error', high: 'high', medium: 'medium', low: 'primary', informational: 'on-surface-variant' };
    return colors[s?.toLowerCase()] || 'on-surface-variant';
  }

  fc(name: string): any {
    const ctrl = this.breachForm.get(name);
    return { 'is-invalid': ctrl?.invalid && ctrl?.touched };
  }
}
