import {
  Component, OnInit, OnDestroy, inject, Input, ElementRef, ViewChild, effect
} from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { NgClass, DatePipe, DecimalPipe, TitleCasePipe, CommonModule, PercentPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BreachService } from '../../../core/services/breach.service';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { NotificationService } from '../../../core/services/notification.service';
import { HealthService } from '../../../core/services/health.service';
import { Breach, TimelineEvent, RemediationAction, MonitoringAlert, AffectedAccount } from '../../../core/models/models';
import { SeverityBadgeComponent } from '../../../shared/components/severity-badge/severity-badge.component';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';
import { RiskLevelPipe } from '../../../shared/pipes/risk-level.pipe';
import { CompactNumberPipe } from '../../../shared/pipes/compact-number.pipe';
import { CopyClipboardDirective } from '../../../shared/directives/copy-clipboard.directive';
import { RequireRoleDirective } from '../../../shared/directives/require-role.directive';

@Component({
  selector: 'app-breach-detail',
  standalone: true,
  imports: [RouterLink, NgClass, DatePipe, DecimalPipe, TitleCasePipe, SeverityBadgeComponent, CommonModule, FormsModule, PercentPipe, TimeAgoPipe, RiskLevelPipe, CompactNumberPipe, CopyClipboardDirective, RequireRoleDirective],
  template: `
    <!-- Header glass bar -->
    <div class="glass-panel p-3 mb-4 shadow-lg d-flex justify-content-between align-items-center border-0 animate__animated animate__fadeIn">
      <div class="d-flex align-items-center gap-4">
        <a routerLink="/breaches" class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-2 px-3 shadow-sm d-flex align-items-center justify-content-center text-on-surface" style="font-size: 8px; width: 42px; height: 42px; border-radius: 12px;">
          <span class="material-symbols-outlined fs-5">arrow_back</span>
        </a>
        <div class="title-wrapper">
          <h2 class="page-title mb-1" style="font-size: 1.25rem;">
            <span class="material-symbols-outlined text-primary opacity-50 me-2" style="font-size: 24px;">description</span>
            Incident Intel
          </h2>
          <p class="text-xs-caps mb-0 text-on-surface-variant opacity-75" style="font-size: 7px; letter-spacing: 0.1em;">Deep packet analysis and forensic timeline for target event.</p>
        </div>
      </div>
      <div class="d-flex align-items-center gap-3">
        @if (auth.isAnalyst()) {
          <div class="badge py-2 px-3 glass-panel border border-opacity-25 text-on-surface text-xs-caps shadow-sm"
               [ngClass]="health.isBackendReady() ? 'border-primary' : 'border-error'"
               style="font-size: 8px;">
            <span class="p-1 rounded-circle me-2" [ngClass]="health.isBackendReady() ? 'bg-success animate-pulse' : 'bg-error'" style="width: 6px; height: 6px; display: inline-block;"></span>
            ANALYST ACCESS {{ health.isBackendReady() ? '' : '(OFFLINE)' }}
          </div>
        }
        <span class="badge py-2 px-3 glass-panel border border-primary border-opacity-25 text-primary text-xs-caps shadow-sm" style="font-size: 8px;">ID: {{ (id).slice(-8) | uppercase }}</span>
      </div>
    </div>

    @if (loading) {
      <div class="text-center py-5 glass-panel border-0 shadow-lg">
        <div class="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
        <span class="text-on-surface-variant text-xs-caps" style="font-size: 7px;">FETCHING INTELLIGENCE PACKET...</span>
      </div>
    }

    @if (error) {
      <div class="glass-panel p-4 border-error border-start border-4 text-error shadow-lg animate__animated animate__shakeX">
        <span class="material-symbols-outlined fs-4 me-2">warning</span>
        <span class="text-xs-caps fw-bold" style="font-size: 8px;">{{ error | uppercase }}</span>
      </div>
    }

    @if (breach && !loading) {
      <!-- System Parameters Row -->
      <div class="glass-panel p-3 mb-4 shadow-lg border-0 d-flex justify-content-around align-items-center flex-wrap gap-4 animate__animated animate__fadeIn">
        <div class="d-flex align-items-center gap-2">
           <span class="p-1 rounded-circle shadow-sm" [ngClass]="health.isBackendReady() ? 'bg-primary' : 'bg-error'" style="width: 4px; height: 4px;"></span>
           <span class="text-xs-caps fw-bold text-on-surface opacity-75" style="font-size: 6px; letter-spacing: 0.15em;">ENCRYPTION: {{ health.isBackendReady() ? 'AES-GCM' : 'INACTIVE' }}</span>
        </div>
        <div class="d-flex align-items-center gap-2">
           <span class="p-1 rounded-circle shadow-sm" [ngClass]="health.isBackendReady() ? 'bg-secondary' : 'bg-error'" style="width: 4px; height: 4px;"></span>
           <span class="text-xs-caps fw-bold text-on-surface opacity-75" style="font-size: 6px; letter-spacing: 0.15em;">TELEMETRY: {{ health.isBackendReady() ? 'SYNCED' : 'DISCONNECTED' }}</span>
        </div>
        <div class="d-flex align-items-center gap-2">
           <span class="p-1 rounded-circle shadow-sm" [ngClass]="health.isBackendReady() ? 'bg-success' : 'bg-error'" style="width: 4px; height: 4px;"></span>
           <span class="text-xs-caps fw-bold text-on-surface opacity-75" style="font-size: 6px; letter-spacing: 0.15em;">SIGNAL: {{ health.isBackendReady() ? 'NORMAL' : 'LOST' }}</span>
        </div>
      </div>

      <!-- Bento Layout Top -->
      <div class="row g-4 mb-4 animate__animated animate__fadeIn" style="animation-delay: 0.1s;">
        <div class="col-lg-8">
          <div class="glass-panel shadow-lg h-100 position-relative border-0">
            <div class="card-body p-4 p-md-5 d-flex flex-column h-100">
              <div class="d-flex justify-content-between flex-wrap gap-3 mb-4">
                <div class="d-flex gap-2 align-items-center">
                  <app-severity-badge [severity]="breach.severity" />
                  <span class="badge py-1 px-3 glass-panel border border-outline-variant border-opacity-25 text-on-surface-variant text-xs-caps" style="font-size: 7px;">{{ (breach.status || 'LOGGED') | uppercase }}</span>
                  <span class="badge py-1 px-3 glass-panel border border-outline-variant border-opacity-25 text-on-surface-variant text-xs-caps" style="font-size: 7px;">{{ (breach.industry || 'OTHER') | uppercase }}</span>
                </div>
                <ng-container *appRequireRole="['analyst', 'admin']">
                  <a [routerLink]="['/admin']" [queryParams]="{edit: breach._id}" class="btn btn-warning text-on-warning text-xs-caps py-1 px-3 shadow-sm fw-bold" style="font-size: 8px;">
                    EDIT RECORD
                  </a>
                </ng-container>
              </div>
              <h2 class="font-headline fw-extrabold text-on-surface tracking-tight mb-2 fs-2">{{ breach.title }}</h2>
              <p class="text-on-surface-variant small mb-5" style="max-width: 800px; line-height: 1.6;">{{ breach.description }}</p>

              <div class="row g-3 mt-auto">
                <div class="col-6 col-md-3">
                  <div class="p-3 bg-surface-container-low rounded-3 border border-outline-variant border-opacity-10 text-center h-100 shadow-sm transition-all hover-glow">
                    <div class="text-xs-caps text-on-surface-variant mb-1" style="font-size: 6px;">RECORDS</div>
                    <div class="fs-4 fw-bold text-on-surface font-headline">{{ breach.affected_records_count | compactNumber }}</div>
                  </div>
                </div>
                <div class="col-6 col-md-3">
                  <div class="p-3 bg-surface-container-low rounded-3 border border-outline-variant border-opacity-10 text-center h-100 shadow-sm transition-all hover-glow">
                    <div class="text-xs-caps text-on-surface-variant mb-1" style="font-size: 6px;">RISK SCORE</div>
                    <div class="fs-4 fw-bold font-headline" [ngClass]="breach.risk_score | riskLevel:'class'">
                      {{ (breach.risk_score ?? 0) | number:'1.1-1' }}
                    </div>
                  </div>
                </div>
                <div class="col-6 col-md-3">
                  <div class="p-3 bg-surface-container-low rounded-3 border border-outline-variant border-opacity-10 text-center h-100 shadow-sm transition-all hover-glow">
                    <div class="text-xs-caps text-on-surface-variant mb-1" style="font-size: 6px;">EVENT DATE</div>
                    <div class="fw-bold text-on-surface" style="font-size: 11px;">{{ breach.breach_date | date:'MMM dd, yyyy' }}</div>
                  </div>
                </div>
                <div class="col-6 col-md-3">
                  <div class="p-3 bg-surface-container-low rounded-3 border border-outline-variant border-opacity-10 text-center h-100 shadow-sm transition-all hover-glow">
                    <div class="text-xs-caps text-on-surface-variant mb-1" style="font-size: 6px;">DETECTION LAG</div>
                    <div class="fw-bold text-on-surface" style="font-size: 11px;">{{ detectionLag }} DAYS</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="glass-panel shadow-lg h-100 overflow-hidden border-0">
            <div class="p-3 border-bottom border-outline-variant border-opacity-10 d-flex justify-content-between align-items-center bg-surface-container-low">
              <span class="text-xs-caps text-on-surface fw-bold">GEOSPATIAL ORIGIN</span>
              <span class="material-symbols-outlined fs-6 text-primary">location_on</span>
            </div>
            <div class="card-body p-0 position-relative" style="height: calc(100% - 50px);">
              @if (breach.location?.coordinates) {
                <div #mapContainer id="breach-map" style="height: 100%; min-height: 350px;"></div>
              } @else {
                <div class="d-flex flex-column align-items-center justify-content-center h-100 p-5 text-center opacity-25">
                  <span class="material-symbols-outlined fs-1 mb-2 text-on-surface">map_off</span>
                  <div class="text-xs-caps text-on-surface">Coordinates unavailable</div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Parameters & Monitoring Section -->
      <div class="row g-4 mb-4 animate__animated animate__fadeIn" style="animation-delay: 0.2s;">
        <div class="col-lg-6">
          <div class="glass-panel shadow-lg h-100 border-0 overflow-hidden d-flex flex-column">
            <div class="p-3 border-bottom border-outline-variant border-opacity-10 bg-surface-container-low">
              <span class="text-xs-caps text-primary fw-bold" style="font-size: 8px;">INTELLIGENCE PARAMETERS</span>
            </div>
            <div class="card-body p-4">
              <div class="d-flex flex-column gap-3">
                <div class="d-flex justify-content-between border-bottom border-outline-variant border-opacity-10 pb-2">
                  <span class="text-xs-caps text-on-surface-variant" style="font-size: 7px;">ORGANIZATION</span>
                  <span class="fw-bold small text-on-surface">{{ getOrganisationName(breach) | uppercase }}</span>
                </div>
                <div class="d-flex justify-content-between border-bottom border-outline-variant border-opacity-10 pb-2">
                  <span class="text-xs-caps text-on-surface-variant" style="font-size: 7px;">COMPLEXITY</span>
                  <span class="fw-bold small text-on-surface">{{ getOrganisationSize(breach) }}</span>
                </div>
                <div class="d-flex justify-content-between border-bottom border-outline-variant border-opacity-10 pb-2">
                  <span class="text-xs-caps text-on-surface-variant" style="font-size: 7px;">ATTACK VECTOR</span>
                  <span class="fw-bold small text-on-surface">{{ getAttackVectorLabel(breach) }}</span>
                </div>
                <div class="mt-2">
                  <span class="text-xs-caps text-on-surface-variant d-block mb-2" style="font-size: 7px;">EXPOSED DATA TYPES</span>
                  <div class="d-flex flex-wrap gap-2">
                    @for (dt of breach.data_types_exposed; track dt) {
                      <span class="badge py-1 px-2 glass-panel border border-outline-variant border-opacity-25 text-on-surface-variant text-xs-caps shadow-sm" style="font-size: 6px;">{{ dt.split('_').join(' ') | uppercase }}</span>
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-6">
          <div class="glass-panel shadow-lg h-100 border-0 overflow-hidden d-flex flex-column">
            <div class="p-3 border-bottom border-outline-variant border-opacity-10 d-flex justify-content-between align-items-center bg-surface-container-low">
              <span class="text-xs-caps text-primary fw-bold" style="font-size: 8px;">MONITORING ALERTS</span>
              @if (auth.isAnalyst()) {
                <button class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-1 px-2 text-on-surface fw-bold shadow-sm" style="font-size: 7px;" (click)="showAddAlert = !showAddAlert">
                  {{ showAddAlert ? 'CANCEL' : '+ ADD ALERT' }}
                </button>
              }
            </div>

            @if (showAddAlert) {
              <div class="p-3 border-bottom border-outline-variant border-opacity-10 bg-surface-container-high animate__animated animate__fadeIn">
                <div class="row g-2">
                  <div class="col-12">
                    <input [(ngModel)]="newAlert.message" class="form-control" placeholder="Alert details (min 10 chars)..." style="font-size: 11px; height: 32px;" />
                  </div>
                  <div class="col-md-6">
                    <select [(ngModel)]="newAlert.alert_type" class="form-select" style="font-size: 11px; height: 32px;">
                      <option value="new_exposure">NEW EXPOSURE</option>
                      <option value="credential_stuffing">CREDENTIAL STUFFING</option>
                      <option value="dark_web_mention">DARK WEB MENTION</option>
                      <option value="domain_squatting">DOMAIN SQUATTING</option>
                    </select>
                  </div>
                  <div class="col-md-6 text-end">
                    <button class="btn btn-primary px-3 fw-bold text-xs-caps" (click)="addAlert()" [disabled]="!newAlert.message || newAlert.message.length < 10" style="font-size: 8px; height: 32px;">SAVE</button>
                  </div>
                </div>
              </div>
            }

            <div class="p-0 overflow-auto custom-scrollbar-hidden flex-grow-1" style="max-height: 250px;">
              <ul class="list-group list-group-flush">
                @for (alert of alerts; track alert._id) {
                  <li class="list-group-item bg-transparent border-outline-variant border-opacity-10 p-3 hover-bg-surface-container-high transition-all">
                    @if (editingAlertId === alert._id) {
                      <div class="row g-2 animate__animated animate__fadeIn">
                        <div class="col-12">
                          <input [(ngModel)]="editAlertData.message" class="form-control" style="font-size: 10px; height: 28px;" />
                        </div>
                        <div class="col-md-6">
                          <select [(ngModel)]="editAlertData.alert_type" class="form-select" style="font-size: 10px; height: 28px;">
                            <option value="new_exposure">NEW EXPOSURE</option>
                            <option value="credential_stuffing">CREDENTIAL STUFFING</option>
                            <option value="dark_web_mention">DARK WEB MENTION</option>
                            <option value="domain_squatting">DOMAIN SQUATTING</option>
                          </select>
                        </div>
                        <div class="col-md-6 text-end d-flex gap-1">
                          <button class="btn btn-primary px-2 fw-bold text-xs-caps flex-grow-1" (click)="saveEditAlert()" style="font-size: 6px; height: 28px;">SAVE</button>
                          <button class="btn btn-dark py-1 px-2 text-xs-caps flex-grow-1" (click)="editingAlertId = null" style="font-size: 6px; height: 28px;">CANCEL</button>
                        </div>
                      </div>
                    } @else {
                      <div class="d-flex justify-content-between mb-1 gap-3">
                        <span class="text-on-surface small fw-bold" style="font-size: 11px;">{{ getAlertMessage(alert) }}</span>
                        <div class="d-flex gap-1 align-items-center flex-shrink-0">
                          @if (auth.isAnalyst()) {
                            @if (!alert.acknowledged) {
                              <button class="btn btn-primary text-on-primary text-xs-caps py-1 px-2 fw-bold shadow-sm" style="font-size: 6px; line-height: 1;" (click)="toggleAlertAck(alert)">ACKNOWLEDGE</button>
                            } @else {
                              <button class="btn btn-dark bg-surface-container-highest border-0 text-on-surface text-xs-caps py-1 px-2 fw-bold" style="font-size: 6px; line-height: 1;" (click)="toggleAlertAck(alert)">UNDO</button>
                            }
                            <button class="btn btn-ghost p-0 border-0 text-on-surface-variant d-flex text-decoration-none shadow-none" (click)="startEditAlert(alert)"><span class="material-symbols-outlined" style="font-size: 12px;">edit</span></button>
                            <button class="btn-close-tactical" (click)="deleteAlert(alert._id!)"><span class="material-symbols-outlined" style="font-size: 10px;">close</span></button>
                          }
                          <span class="p-1 rounded-circle" [ngClass]="alert.acknowledged ? 'bg-success shadow-sm' : 'bg-error shadow-sm animate-pulse'" style="width: 5px; height: 5px;"></span>
                        </div>
                      </div>
                      <div class="text-xs-caps opacity-50 text-on-surface-variant fw-bold" style="font-size: 6px;">{{ alert.alert_type.split('_').join(' ') | uppercase }} // {{ alert.severity | uppercase }}</div>
                    }
                  </li>
                }
                @if (alerts.length === 0) {
                  <li class="list-group-item bg-transparent text-center py-5 opacity-25 text-xs-caps text-on-surface" style="font-size: 7px;">NO ACTIVE ALERTS</li>
                }
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- INCIDENT TIMELINE SECTION -->
      @if (auth.isAuthenticated()) {
        <div class="row g-4 mb-4 animate__animated animate__fadeIn" style="animation-delay: 0.3s;">
          <!-- Impacted Entities Table (RESTORED) -->
          <div class="col-lg-12" *appRequireRole="['analyst', 'admin']">
            <div class="glass-panel shadow-lg border-0 overflow-hidden mb-4">
              <div class="p-3 border-bottom border-outline-variant border-opacity-10 d-flex justify-content-between align-items-center bg-surface-container-low">
                <span class="text-xs-caps text-primary fw-bold" style="font-size: 8px;">IMPACTED ENTITIES (PII DATA)</span>
                <span class="badge py-1 px-2 glass-panel border border-outline-variant border-opacity-25 text-on-surface-variant text-xs-caps" style="font-size: 7px;">{{ accounts.length }} RECORDS LOADED</span>
              </div>
              <div class="table-responsive custom-scrollbar-hidden" style="max-height: 300px;">
                <table class="table table-hover align-middle mb-0">
                  <thead>
                    <tr class="bg-surface-container-low">
                      <th class="ps-4 text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 7px;">IDENTITY</th>
                      <th class="text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 7px;">EXPOSED DATA</th>
                      <th class="text-xs-caps text-on-surface-variant border-0 py-3" style="font-size: 7px;">STATUS</th>
                      <th class="pe-4 border-0"></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (acc of accounts; track acc._id) {
                      <tr class="bg-transparent border-bottom border-outline-variant border-opacity-5 transition-all hover-bg-surface-container-high">
                        <td class="ps-4">
                          <div class="fw-bold text-on-surface small" style="font-size: 11px;">{{ acc.email || acc.username || 'ANONYMOUS' }}</div>
                          <div class="text-xs-caps opacity-50 font-mono" style="font-size: 6px;">UID: {{ (acc._id || '0x0').slice(-8) | uppercase }}</div>
                        </td>
                        <td>
                          <div class="d-flex flex-wrap gap-1">
                            @for (data of acc.data_exposed; track data) {
                              <span class="badge bg-surface-container-highest text-on-surface-variant border border-outline-variant border-opacity-10" style="font-size: 6px; padding: 2px 4px;">{{ data | uppercase }}</span>
                            }
                          </div>
                        </td>
                        <td>
                          <span class="text-xs-caps fw-bold" [ngClass]="acc.notified ? 'text-success' : 'text-warning'" style="font-size: 7px;">
                            {{ acc.notified ? 'NOTIFIED' : 'PENDING' }}
                          </span>
                        </td>
                        <td class="pe-4 text-end">
                          <button class="btn btn-link p-0 text-primary" [appCopyClipboard]="acc.email || acc.username || ''" title="Copy Identity">
                            <span class="material-symbols-outlined fs-6">content_copy</span>
                          </button>
                        </td>
                      </tr>
                    }
                    @if (accounts.length === 0) {
                      <tr><td colspan="4" class="text-center py-5 opacity-25 text-xs-caps text-on-surface" style="font-size: 8px;">NO PII DATA CAPTURED FOR THIS INCIDENT</td></tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="col-12">
            <div class="glass-panel shadow-lg border-0 p-4 p-md-5">
              <div class="d-flex justify-content-between align-items-center mb-5">
                <h5 class="text-xs-caps text-primary fw-bold m-0" style="font-size: 10px;">INCIDENT TIMELINE</h5>
                @if (auth.isAnalyst()) {
                  <button class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-2 px-3 text-on-surface fw-bold shadow-sm" style="font-size: 8px;" (click)="showAddTimeline = !showAddTimeline">
                    {{ showAddTimeline ? 'CANCEL' : '+ ADD EVENT' }}
                  </button>
                }
              </div>

              @if (showAddTimeline) {
                <div class="glass-panel p-4 mb-5 border-primary border-opacity-20 bg-surface-container-high animate__animated animate__fadeIn">
                  <div class="row g-3">
                    <div class="col-md-6">
                      <select [(ngModel)]="newEvent.event_type" class="form-select" style="font-size: 11px; height: 38px;">
                        <option value="" disabled selected>SELECT EVENT TYPE...</option>
                        <option value="breach_occurred">BREACH OCCURRED</option>
                        <option value="discovered">DISCOVERED</option>
                        <option value="disclosed">DISCLOSED</option>
                        <option value="contained">CONTAINED</option>
                        <option value="resolved">RESOLVED</option>
                      </select>
                    </div>
                    <div class="col-md-6"><input type="datetime-local" [(ngModel)]="newEvent.occurred_at" class="form-control" style="font-size: 11px; height: 38px;" /></div>
                    <div class="col-12"><textarea [(ngModel)]="newEvent.description" class="form-control" rows="2" placeholder="Event description (min 10 chars)..." style="font-size: 11px;"></textarea></div>
                    <div class="col-12 text-end"><button class="btn btn-primary px-3 fw-bold text-xs-caps" (click)="addTimeline()" [disabled]="!newEvent.event_type || !newEvent.description || newEvent.description.length < 10" style="font-size: 8px; height: 38px;">SAVE EVENT</button></div>
                  </div>
                </div>
              }

              <div class="d-flex flex-column gap-5">
                @for (event of timeline; track event._id) {
                  <div class="animate__animated animate__fadeInUp">
                    <div class="text-xs-caps text-primary fw-extrabold mb-2 ps-1" style="font-size: 7px; letter-spacing: 0.15em;">{{ event.event_type.split('_').join(' ') | uppercase }}</div>
                    <div class="glass-panel p-4 shadow-lg border-0 bg-surface-container-low transition-all hover-glow">
                      @if (editingTimelineId === event._id) {
                        <div class="row g-3">
                          <div class="col-md-6">
                            <select [(ngModel)]="editEventData.event_type" class="form-select" style="font-size: 11px; height: 38px;">
                              <option value="breach_occurred">BREACH OCCURRED</option>
                              <option value="discovered">DISCOVERED</option>
                              <option value="disclosed">DISCLOSED</option>
                              <option value="contained">CONTAINED</option>
                              <option value="resolved">RESOLVED</option>
                            </select>
                          </div>
                          <div class="col-md-6"><input type="datetime-local" [(ngModel)]="editEventData.occurred_at" class="form-control" style="font-size: 11px; height: 38px;" /></div>
                          <div class="col-12"><textarea [(ngModel)]="editEventData.description" class="form-control" rows="2" style="font-size: 11px;"></textarea></div>
                          <div class="col-12 text-end d-flex gap-2">
                             <button class="btn btn-primary px-3 fw-bold flex-grow-1 text-xs-caps" (click)="saveEditTimeline()" [disabled]="!editEventData.event_type || !editEventData.description" style="font-size: 8px; height: 38px;">SAVE</button>
                             <button class="btn btn-dark py-1 px-3 flex-grow-1 text-xs-caps" (click)="editingTimelineId = null" style="font-size: 8px; height: 38px;">CANCEL</button>
                          </div>
                        </div>
                      } @else {
                        <div class="d-flex justify-content-between align-items-center mb-3">
                           <span class="text-xs-caps font-mono opacity-50 text-on-surface-variant" style="font-size: 7px;">{{ event.occurred_at | date:'yyyy.MM.dd || HH:mm' }}</span>
                           @if (auth.isAnalyst()) {
                             <div class="d-flex gap-2">
                               <button class="btn btn-ghost p-0 border-0 text-on-surface-variant d-flex text-decoration-none shadow-none" (click)="startEditTimeline(event)"><span class="material-symbols-outlined fs-6" style="font-size: 14px;">edit</span></button>
                               <button class="btn-close-tactical" (click)="deleteTimeline(event._id!)"><span class="material-symbols-outlined" style="font-size: 12px;">close</span></button>
                             </div>
                           }
                        </div>
                        <p class="text-on-surface small mb-4 opacity-100" style="font-size: 0.8rem; line-height: 1.6;">{{ event.description }}</p>
                        @if (event.actor) {
                           <div class="mt-3 pt-3 border-top border-outline-variant border-opacity-10 d-flex align-items-center gap-2">
                              <span class="material-symbols-outlined fs-6 text-primary opacity-75" style="font-size: 12px;">person_outline</span>
                              <span class="text-xs-caps opacity-50 text-on-surface-variant fw-bold" style="font-size: 6px;">OPERATOR: {{ event.actor | uppercase }}</span>
                           </div>
                        }
                      }
                    </div>
                  </div>
                }
                @if (timeline.length === 0) {
                  <div class="p-5 text-center opacity-25 text-xs-caps text-on-surface" style="font-size: 8px;">NO TIMELINE RECORDS CAPTURED</div>
                }
              </div>
            </div>
          </div>
        </div>
      }

      <!-- MITIGATION PROTOCOLS SECTION -->
      @if (auth.isAuthenticated()) {
        <div class="row g-4 mb-5 animate__animated animate__fadeIn" style="animation-delay: 0.4s;">
          <div class="col-12">
            <div class="glass-panel shadow-lg border-0 p-4 p-md-5">
              <div class="d-flex justify-content-between align-items-center mb-5">
                <h5 class="text-xs-caps text-primary fw-bold m-0" style="font-size: 10px;">MITIGATION PROTOCOLS</h5>
                @if (auth.isAnalyst()) {
                  <button class="btn btn-dark bg-surface-container-highest border-0 text-xs-caps py-2 px-3 text-on-surface fw-bold shadow-sm" style="font-size: 8px;" (click)="showAddRemediation = !showAddRemediation">
                    {{ showAddRemediation ? 'CANCEL' : '+ ADD PROTOCOL' }}
                  </button>
                }
              </div>

              @if (showAddRemediation) {
                <div class="glass-panel p-4 mb-5 border-primary border-opacity-20 bg-surface-container-high animate__animated animate__fadeIn">
                  <div class="row g-3">
                    <div class="col-12"><input [(ngModel)]="newAction.action" class="form-control" placeholder="Action description (min 5 chars)..." style="font-size: 11px; height: 38px;" /></div>
                    <div class="col-md-6"><select [(ngModel)]="newAction.status" class="form-select" style="font-size: 11px; height: 38px;"><option value="pending">PENDING</option><option value="in_progress">IN PROGRESS</option><option value="completed">COMPLETED</option></select></div>
                    <div class="col-md-6"><input [(ngModel)]="newAction.assigned_to" class="form-control" placeholder="Assignee..." style="font-size: 11px; height: 38px;" /></div>
                    <div class="col-12 text-end"><button class="btn btn-primary text-xs-caps py-1 px-3 fw-bold" (click)="addRemediation()" [disabled]="!newAction.action || newAction.action.length < 5" style="font-size: 8px; height: 38px;">SAVE</button></div>
                  </div>
                </div>
              }

              <div class="d-flex flex-column gap-3">
                @for (action of remediation; track action._id) {
                  <div class="animate__animated animate__fadeInUp">
                    <div class="text-xs-caps text-primary fw-extrabold mb-2 ps-1" style="font-size: 7px; letter-spacing: 0.15em;">PROTOCOL ENTRY</div>
                    <div class="glass-panel p-4 shadow-lg border-0 d-flex justify-content-between align-items-center bg-surface-container-low transition-all hover-glow">
                      @if (editingRemediationId === action._id) {
                        <div class="row g-2 w-100">
                          <div class="col-md-6"><input [(ngModel)]="editRemediationData.action" class="form-control" style="font-size: 10px; height: 28px;" /></div>
                          <div class="col-md-4"><input [(ngModel)]="editRemediationData.assigned_to" class="form-control" placeholder="OPERATOR" style="font-size: 10px; height: 28px;" /></div>
                          <div class="col-md-2 d-flex gap-1">
                            <button class="btn btn-primary px-1 fw-bold text-xs-caps flex-grow-1" (click)="saveEditRemediation()" style="font-size: 6px; height: 28px;">SAVE</button>
                            <button class="btn btn-dark px-1 text-xs-caps flex-grow-1" (click)="editingRemediationId = null" style="font-size: 6px; height: 28px;">CANCEL</button>
                          </div>
                        </div>
                      } @else {
                        <div class="flex-grow-1 pe-4">
                          <div class="fw-bold text-on-surface small mb-1" style="font-size: 11px;">{{ action.action }}</div>
                          <div class="text-xs-caps opacity-50 text-on-surface-variant d-flex align-items-center gap-2 fw-bold" style="font-size: 6px;">
                             <span class="material-symbols-outlined" style="font-size: 11px;">account_circle</span>
                             {{ action.assigned_to ? (action.assigned_to | uppercase) : 'UNASSIGNED' }}
                          </div>
                        </div>
                        <div class="d-flex gap-2 align-items-center">
                          @if (auth.isAnalyst()) {
                            <button class="btn btn-ghost p-0 border-0 text-on-surface-variant d-flex text-decoration-none shadow-none" (click)="startEditRemediation(action)"><span class="material-symbols-outlined" style="font-size: 12px;">edit</span></button>
                            <select [ngModel]="action.status" (change)="updateRemediationStatus(action, $event)" class="form-select bg-surface-container-low border-0 text-on-surface text-xs-caps py-0 px-2 shadow-sm" style="font-size: 6.5px; height: 24px; width: auto; min-width: 90px;">
                              <option value="pending">PENDING</option><option value="in_progress">IN PROGRESS</option><option value="completed">COMPLETED</option>
                            </select>
                            <button class="btn-close-tactical" (click)="deleteRemediation(action._id!)"><span class="material-symbols-outlined" style="font-size: 10px;">close</span></button>
                          }
                          <span class="badge text-xs-caps py-2 px-3 border shadow-sm fw-bold" [ngClass]="{
                            'bg-success bg-opacity-10 text-success border-success border-opacity-25': action.status === 'completed',
                            'bg-warning bg-opacity-10 text-warning border-warning border-opacity-25': action.status === 'in_progress',
                            'bg-surface-container-highest text-on-surface-variant border-outline-variant': action.status === 'pending'
                          }" style="font-size: 6px; min-width: 80px; text-align: center; letter-spacing: 0.1em;">{{ action.status.split('_').join(' ') | uppercase }}</span>
                        </div>
                      }
                    </div>
                  </div>
                }
                @if (remediation.length === 0) {
                  <div class="p-5 text-center opacity-25 text-xs-caps text-on-surface" style="font-size: 8px;">NO MITIGATION PROTOCOLS LOGGED</div>
                }
              </div>
            </div>
          </div>
        </div>
      }
    }
    <div class="pb-5"></div>
  `,
  styles: [`
    .text-xs-caps { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; }
    .custom-scrollbar::-webkit-scrollbar { width: 3px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--outline-variant); border-radius: 10px; }
    .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
    .shadow-inner { box-shadow: inset 0 2px 4px rgba(0,0,0,0.2); }
  `],
})
export class BreachDetailComponent implements OnInit, OnDestroy {
  @Input() id = '';
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  private breachService = inject(BreachService);
  private themeService = inject(ThemeService);
  private notifications = inject(NotificationService);
  public health = inject(HealthService);
  private route = inject(ActivatedRoute);
  auth = inject(AuthService);

  private map: any;
  private tileLayer: any;

  private _themeWatcher = effect(() => {
    this.themeService.theme();
    if (this.map) this.updateTileLayer();
  });

  breach: Breach | null = null;
  timeline: TimelineEvent[] = [];
  remediation: RemediationAction[] = [];
  alerts: MonitoringAlert[] = [];
  accounts: AffectedAccount[] = [];
  loading = false;
  error = '';

  showAddTimeline = false;
  newEvent: Partial<TimelineEvent> = { event_type: '', description: '', occurred_at: new Date().toISOString().slice(0, 16) };
  editingTimelineId: string | null = null;
  editEventData: Partial<TimelineEvent> = {};

  showAddRemediation = false;
  newAction: Partial<RemediationAction> = { action: '', status: 'pending', assigned_to: '' };
  editingRemediationId: string | null = null;
  editRemediationData: Partial<RemediationAction> = {};

  showAddAlert = false;
  newAlert: Partial<MonitoringAlert> = { message: '', alert_type: 'new_exposure', severity: 'medium', acknowledged: false };
  editingAlertId: string | null = null;
  editAlertData: Partial<MonitoringAlert> = {};

  get detectionLag(): number {
    if (!this.breach?.breach_date || !this.breach?.discovered_date) return 0;
    const start = new Date(this.breach.breach_date);
    const end = new Date(this.breach.discovered_date);
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  ngOnInit(): void {
    const resolved = this.route.snapshot.data['breach'];
    if (resolved) {
      this.applyBreach(resolved);
    } else {
      this.loadBreach();
    }
  }

  private applyBreach(data: any): void {
    this.breach = data;
    this.timeline = this.normalizeTimeline(this.breach?.timeline);
    this.remediation = Array.isArray(this.breach?.remediation) ? this.breach!.remediation! : [];
    this.alerts = this.normalizeAlerts((this.breach as any)?.monitoring_alerts);
    this.loading = false;
    if (this.auth.isAuthenticated()) {
      this.loadSubDocuments();
    }
    setTimeout(() => this.initMap(), 100);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  loadBreach(): void {
    this.loading = true;
    this.breachService.getBreach(this.id).subscribe({
      next: (res: any) => {
        this.breach = res.data;
        this.applyBreach(this.breach);
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'Breach not found.';
        this.loading = false;
        this.notifications.show(this.error, 'error', 5000);
      },
    });
  }

  loadSubDocuments(): void {
    this.breachService.getTimeline(this.id).subscribe({
      next: (res: any) => {
        const normalized = this.normalizeTimeline(res.data);
        this.timeline = normalized.length ? normalized : this.timeline;
      },
    });
    this.breachService.getRemediation(this.id).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res.data) ? res.data : [];
        this.remediation = data.length ? data : this.remediation;
      },
    });
    this.breachService.getAlerts(this.id).subscribe({
      next: (res: any) => {
        const normalized = this.normalizeAlerts(res.data);
        this.alerts = normalized.length ? normalized : this.alerts;
      },
    });
    if (this.auth.isAnalyst()) {
      this.breachService.getAffectedAccounts(this.id).subscribe({
        next: (res: any) => (this.accounts = res.data ?? []),
      });
    }
  }

  addTimeline(): void {
    const eventDate = this.newEvent.occurred_at || new Date().toISOString();
    const payload: any = {
      event_date: eventDate,
      event_type: this.normalizeEventType(this.newEvent.event_type),
      description: this.newEvent.description,
    };

    this.breachService.addTimelineEvent(this.id, payload).subscribe({
      next: () => {
        this.loadSubDocuments();
        this.showAddTimeline = false;
        this.newEvent = { event_type: '', description: '', occurred_at: new Date().toISOString().slice(0, 16) };
        this.notifications.show('Timeline event added.', 'success', 2500);
      },
      error: (err) => this.notifyApiError(err, 'Failed to add timeline event.'),
    });
  }

  deleteTimeline(eventId: string): void {
    if (!confirm('Permanently remove this timeline event?')) return;
    this.breachService.deleteTimelineEvent(this.id, eventId).subscribe({
      next: () => {
        this.loadSubDocuments();
        this.notifications.show('Timeline event removed.', 'info', 2500);
      },
      error: (err) => this.notifyApiError(err, 'Failed to remove event')
    });
  }

  startEditTimeline(event: TimelineEvent): void {
    this.editingTimelineId = event._id!;
    this.editEventData = { ...event, occurred_at: new Date(event.occurred_at!).toISOString().slice(0, 16) };
  }

  saveEditTimeline(): void {
    this.breachService.updateTimelineEvent(this.id, this.editingTimelineId!, this.editEventData).subscribe({
      next: () => {
        this.loadSubDocuments();
        this.editingTimelineId = null;
        this.notifications.show('Timeline event updated.', 'success', 2500);
      },
      error: (err) => this.notifyApiError(err, 'Failed to update event')
    });
  }

  startEditRemediation(action: RemediationAction): void {
    this.editingRemediationId = action._id!;
    this.editRemediationData = { ...action };
  }

  saveEditRemediation(): void {
    this.breachService.updateRemediation(this.id, this.editingRemediationId!, this.editRemediationData).subscribe({
      next: () => {
        this.loadSubDocuments();
        this.editingRemediationId = null;
        this.notifications.show('Remediation protocol updated.', 'success', 2500);
      },
      error: (err) => this.notifyApiError(err, 'Failed to update protocol')
    });
  }

  startEditAlert(alert: MonitoringAlert): void {
    this.editingAlertId = alert._id!;
    this.editAlertData = { ...alert, message: this.getAlertMessage(alert) };
  }

  saveEditAlert(): void {
    const payload = {
      alert_type: this.editAlertData.alert_type,
      severity: this.editAlertData.severity,
      details: this.editAlertData.message
    };
    this.breachService.updateAlert(this.id, this.editingAlertId!, payload).subscribe({
      next: () => {
        this.loadSubDocuments();
        this.editingAlertId = null;
        this.notifications.show('Monitoring alert updated.', 'success', 2500);
      },
      error: (err) => this.notifyApiError(err, 'Failed to update alert')
    });
  }

  addRemediation(): void {
    const payload: any = {
      action: this.newAction.action,
      status: this.newAction.status,
      assigned_to: this.newAction.assigned_to,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    this.breachService.addRemediation(this.id, payload).subscribe({
      next: () => {
        this.loadSubDocuments();
        this.showAddRemediation = false;
        this.newAction = { action: '', status: 'pending', assigned_to: '' };
        this.notifications.show('Remediation protocol added.', 'success', 2500);
      },
      error: (err) => this.notifyApiError(err, 'Failed to add remediation protocol.'),
    });
  }

  updateRemediationStatus(action: RemediationAction, event: any): void {
    const newStatus = event.target.value;
    this.breachService.updateRemediation(this.id, action._id!, { status: newStatus }).subscribe({
      next: () => {
        this.loadSubDocuments();
        this.notifications.show('Remediation status updated.', 'info', 2200);
      },
      error: (err) => this.notifyApiError(err, 'Failed to update remediation status.'),
    });
  }

  deleteRemediation(actionId: string): void {
    if (!confirm('Permanently remove this mitigation protocol?')) return;
    this.breachService.deleteRemediation(this.id, actionId).subscribe({
      next: () => {
        this.loadSubDocuments();
        this.notifications.show('Mitigation protocol removed.', 'info', 2500);
      },
      error: (err) => this.notifyApiError(err, 'Failed to remove protocol')
    });
  }

  addAlert(): void {
    const payload: any = {
      alert_type: this.normalizeAlertType(this.newAlert.alert_type),
      severity: this.newAlert.severity,
      details: this.newAlert.message,
      acknowledged: false,
    };

    this.breachService.addAlert(this.id, payload).subscribe({
      next: () => {
        this.loadSubDocuments();
        this.showAddAlert = false;
        this.newAlert = { message: '', alert_type: 'new_exposure', severity: 'medium', acknowledged: false };
        this.notifications.show('Monitoring alert added.', 'success', 2500);
      },
      error: (err) => this.notifications.show('Alert addition failed', 'error'),
    });
  }

  toggleAlertAck(alert: MonitoringAlert): void {
    this.breachService.updateAlert(this.id, alert._id!, { acknowledged: !alert.acknowledged }).subscribe({
      next: () => {
        this.loadSubDocuments();
        this.notifications.show('Alert acknowledgement updated.', 'info', 2200);
      },
      error: (err) => this.notifyApiError(err, 'Update failed'),
    });
  }

  deleteAlert(alertId: string): void {
    if (!confirm('Permanently remove this monitoring alert?')) return;
    this.breachService.deleteAlert(this.id, alertId).subscribe({
      next: () => {
        this.loadSubDocuments();
        this.notifications.show('Monitoring alert removed.', 'info', 2500);
      },
      error: (err) => this.notifyApiError(err, 'Failed to remove alert')
    });
  }

  private notifyApiError(err: any, fallback: string): void {
    const message = err?.error?.message ?? fallback;
    this.notifications.show(message, 'error', 5000);
  }

  private async initMap(): Promise<void> {
    if (!this.breach?.location?.coordinates) return;
    if (!this.mapContainer?.nativeElement) return;

    const L = await import('leaflet' as any);
    const [lng, lat] = this.breach.location.coordinates;
    if (this.map) this.map.remove();

    this.map = L.map(this.mapContainer.nativeElement, { zoomControl: false }).setView([lat, lng], 10);
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    this.updateTileLayer();

    const icon = L.divIcon({
      html: `<div style="background:var(--severity-critical); width:16px; height:16px; border-radius:50%; border:2px solid #fff; box-shadow: 0 0 10px rgba(248, 113, 113, 0.8);"></div>`,
      className: '', iconSize: [16, 16], iconAnchor: [8, 8],
    });

    L.marker([lat, lng], { icon }).addTo(this.map);
  }

  private async updateTileLayer() {
    const L = await import('leaflet' as any);
    if (this.tileLayer) this.map.removeLayer(this.tileLayer);
    const isDark = this.themeService.theme() === 'dark';
    const url = isDark ? 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png' : 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png';
    this.tileLayer = L.tileLayer(url, { attribution: '&copy; Stadia Maps', maxZoom: 20 }).addTo(this.map);
  }

  getAttackVectorLabel(breach: Breach | null): string {
    const vector = (breach as any)?.attack_vector || 'UNSPECIFIED';
    return vector.replace(/_/g, ' ').toUpperCase();
  }

  normalizeTimeline(data: any): TimelineEvent[] {
    if (!Array.isArray(data)) return [];
    return data.map((item: any) => ({ ...item, occurred_at: item?.occurred_at ?? item?.event_date ?? item?.created_at }));
  }

  normalizeAlerts(data: any): MonitoringAlert[] {
    if (!Array.isArray(data)) return [];
    return data.map((item: any) => ({ ...item, message: item?.message ?? item?.details ?? item?.alert_type ?? 'Alert', created_at: item?.created_at ?? item?.triggered_at, acknowledged: Boolean(item?.acknowledged) }));
  }

  getAlertMessage(alert: MonitoringAlert): string {
    const msg = (alert as any)?.message ?? (alert as any)?.details;
    return typeof msg === 'string' && msg.trim() ? msg : 'NO ALERT MESSAGE';
  }

  getAlertTimestamp(alert: MonitoringAlert): string | undefined {
    const ts = (alert as any)?.created_at ?? (alert as any)?.triggered_at;
    return ts;
  }

  normalizeEventType(eventType?: string): string {
    const value = (eventType || '').toLowerCase().trim();
    const allowed = new Set(['breach_occurred', 'discovered', 'disclosed', 'contained', 'resolved']);
    return allowed.has(value) ? value : 'discovered';
  }

  normalizeAlertType(alertType?: string): string {
    const value = (alertType || '').toLowerCase().trim();
    const allowed = new Set(['new_exposure', 'credential_stuffing', 'dark_web_mention', 'domain_squatting']);
    return allowed.has(value) ? value : 'new_exposure';
  }

  getOrganisationName(breach: Breach | null): string {
    const org: any = breach?.organisation;
    if (typeof org === 'string' && org.trim()) return org;
    if (org && typeof org.name === 'string') return org.name;
    return org?.name || 'UNSPECIFIED';
  }

  getOrganisationSize(breach: Breach | null): string {
    const direct = (breach as any)?.organisation_size;
    if (typeof direct === 'string' && direct.trim()) return direct;

    const nested = (breach?.organisation as any)?.size;
    if (typeof nested === 'string' && nested.trim()) return nested.toUpperCase();

    const affected = Number((breach as any)?.affected_records_count ?? 0);
    if (Number.isFinite(affected) && affected > 0) {
      if (affected >= 1_000_000) return 'ENTERPRISE';
      if (affected >= 100_000) return 'LARGE';
      if (affected >= 10_000) return 'MID';
      return 'SMALL';
    }

    return 'UNSPECIFIED';
  }

  severityColor(s: string): string {
    const sev = s?.toLowerCase() ?? 'info';
    if (sev === 'informational' || sev === 'info') return 'severity-info';
    return `severity-${sev}`;
  }
}
