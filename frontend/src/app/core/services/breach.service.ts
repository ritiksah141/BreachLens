import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  Breach,
  BreachListResponse,
  BreachFilterParams,
  AffectedAccount,
  TimelineEvent,
  RemediationAction,
  MonitoringAlert,
} from '../models/models';

@Injectable({ providedIn: 'root' })
export class BreachService {
  private readonly base = `${environment.apiUrl}/breaches`;

  constructor(private http: HttpClient) {}

  // ------------------------------------------------------------------
  // List + filter  (GET with query string params)
  // ------------------------------------------------------------------

  getBreaches(filters: BreachFilterParams = {}): Observable<BreachListResponse> {
    let params = new HttpParams();
    if (filters.page)     params = params.set('page',     filters.page);
    if (filters.limit)    params = params.set('limit',    filters.limit);
    if (filters.search)   params = params.set('search',   filters.search);
    if (filters.severity) params = params.set('severity', filters.severity);
    if (filters.status)   params = params.set('status',   filters.status);
    if (filters.industry) params = params.set('industry', filters.industry);
    if (filters.sort_by)  params = params.set('sort_by',  filters.sort_by);
    if (filters.order)    params = params.set('order',    filters.order);
    if (filters.min_risk != null) params = params.set('min_risk', filters.min_risk);
    if (filters.max_risk != null) params = params.set('max_risk', filters.max_risk);

    return this.http.get<BreachListResponse>(`${this.base}/`, { params });
  }

  // ------------------------------------------------------------------
  // Single breach  (GET)
  // ------------------------------------------------------------------

  getBreach(id: string): Observable<ApiResponse<Breach>> {
    return this.http.get<ApiResponse<Breach>>(`${this.base}/${id}`);
  }

  // ------------------------------------------------------------------
  // Create  (POST) — requires analyst or admin role
  // ------------------------------------------------------------------

  createBreach(payload: Partial<Breach>): Observable<ApiResponse<Breach>> {
    return this.http.post<ApiResponse<Breach>>(`${this.base}/`, payload);
  }

  // ------------------------------------------------------------------
  // Full replace  (PUT) — requires analyst or admin role
  // ------------------------------------------------------------------

  updateBreach(id: string, payload: Partial<Breach>): Observable<ApiResponse<Breach>> {
    return this.http.put<ApiResponse<Breach>>(`${this.base}/${id}`, payload);
  }

  // ------------------------------------------------------------------
  // Partial update  (PATCH) — requires analyst or admin role
  // ------------------------------------------------------------------

  patchBreach(id: string, payload: Partial<Breach>): Observable<ApiResponse<Breach>> {
    return this.http.patch<ApiResponse<Breach>>(`${this.base}/${id}`, payload);
  }

  // ------------------------------------------------------------------
  // Delete  (DELETE) — requires admin role
  // ------------------------------------------------------------------

  deleteBreach(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // ------------------------------------------------------------------
  // Exposure check  (GET with query params)
  // ------------------------------------------------------------------

  checkExposure(email?: string, domain?: string): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (email)  params = params.set('email',  email);
    if (domain) params = params.set('domain', domain);
    return this.http.get<ApiResponse<any>>(`${this.base}/exposure-check`, { params });
  }

  // ------------------------------------------------------------------
  // Geospatial endpoints
  // ------------------------------------------------------------------

  getGeoJson(severity?: string, industry?: string): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (severity) params = params.set('severity', severity);
    if (industry) params = params.set('industry', industry);
    return this.http.get<ApiResponse<any>>(`${this.base}/geo/geojson`, { params });
  }

  getNear(lng: number, lat: number, radius = 50000): Observable<ApiResponse<any>> {
    const params = new HttpParams()
      .set('longitude', lng)
      .set('latitude',  lat)
      .set('radius',    radius);
    return this.http.get<ApiResponse<any>>(`${this.base}/geo/near`, { params });
  }

  // ------------------------------------------------------------------
  // Sub-documents: affected accounts
  // ------------------------------------------------------------------

  getAffectedAccounts(breachId: string): Observable<ApiResponse<AffectedAccount[]>> {
    return this.http.get<ApiResponse<AffectedAccount[]>>(`${this.base}/${breachId}/affected-accounts`);
  }

  addAffectedAccount(breachId: string, account: Partial<AffectedAccount>): Observable<ApiResponse<AffectedAccount>> {
    return this.http.post<ApiResponse<AffectedAccount>>(`${this.base}/${breachId}/affected-accounts`, account);
  }

  deleteAffectedAccount(breachId: string, accountId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${breachId}/affected-accounts/${accountId}`);
  }

  // ------------------------------------------------------------------
  // Sub-documents: timeline
  // ------------------------------------------------------------------

  getTimeline(breachId: string): Observable<ApiResponse<TimelineEvent[]>> {
    return this.http.get<ApiResponse<TimelineEvent[]>>(`${this.base}/${breachId}/timeline`);
  }

  addTimelineEvent(breachId: string, event: Partial<TimelineEvent>): Observable<ApiResponse<TimelineEvent>> {
    return this.http.post<ApiResponse<TimelineEvent>>(`${this.base}/${breachId}/timeline`, event);
  }

  deleteTimelineEvent(breachId: string, eventId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${breachId}/timeline/${eventId}`);
  }

  // ------------------------------------------------------------------
  // Sub-documents: remediation
  // ------------------------------------------------------------------

  getRemediation(breachId: string): Observable<ApiResponse<RemediationAction[]>> {
    return this.http.get<ApiResponse<RemediationAction[]>>(`${this.base}/${breachId}/remediation`);
  }

  addRemediation(breachId: string, action: Partial<RemediationAction>): Observable<ApiResponse<RemediationAction>> {
    return this.http.post<ApiResponse<RemediationAction>>(`${this.base}/${breachId}/remediation`, action);
  }

  // ------------------------------------------------------------------
  // Sub-documents: monitoring alerts
  // ------------------------------------------------------------------

  getAlerts(breachId: string): Observable<ApiResponse<MonitoringAlert[]>> {
    return this.http.get<ApiResponse<MonitoringAlert[]>>(`${this.base}/${breachId}/alerts`);
  }
}
