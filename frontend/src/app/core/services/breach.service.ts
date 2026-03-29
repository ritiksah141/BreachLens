import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  Breach,
  BreachFilterParams,
  BreachListResponse,
  AffectedAccount,
  TimelineEvent,
  RemediationAction,
  MonitoringAlert
} from '../models/models';

@Injectable({ providedIn: 'root' })
export class BreachService {
  private readonly base = `${environment.apiUrl}/breaches`;

  constructor(private http: HttpClient) {}

  // ------------------------------------------------------------------
  // Basic CRUD
  // ------------------------------------------------------------------

  getBreaches(params: BreachFilterParams = {}): Observable<BreachListResponse> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return this.http.get<BreachListResponse>(`${this.base}`, { params: httpParams });
  }

  getBreach(id: string): Observable<ApiResponse<Breach>> {
    return this.http.get<ApiResponse<Breach>>(`${this.base}/${id}`);
  }

  createBreach(payload: Partial<Breach>): Observable<ApiResponse<Breach>> {
    return this.http.post<ApiResponse<Breach>>(`${this.base}`, payload);
  }

  updateBreach(id: string, payload: Partial<Breach>): Observable<ApiResponse<Breach>> {
    return this.http.put<ApiResponse<Breach>>(`${this.base}/${id}`, payload);
  }

  patchBreach(id: string, payload: Partial<Breach>): Observable<ApiResponse<Breach>> {
    return this.http.patch<ApiResponse<Breach>>(`${this.base}/${id}`, payload);
  }

  deleteBreach(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // ------------------------------------------------------------------
  // Bulk operations
  // ------------------------------------------------------------------

  bulkImport(breaches: Partial<Breach>[]): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.base}/bulk`, { breaches });
  }

  bulkDelete(ids: string[]): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.base}/bulk`, { body: { ids } });
  }

  // ------------------------------------------------------------------
  // Exposure check
  // ------------------------------------------------------------------

  checkExposure(email?: string, domain?: string): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (email)  params = params.set('email',  email);
    if (domain) params = params.set('domain', domain);
    return this.http.get<ApiResponse<any>>(`${this.base}/exposure-check`, { params });
  }

  // ------------------------------------------------------------------
  // Geospatial
  // ------------------------------------------------------------------

  getGeoJson(severity?: string, industry?: string): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (severity) params = params.set('severity', severity);
    if (industry) params = params.set('industry', industry);
    return this.http.get<ApiResponse<any>>(`${this.base}/geo/geojson`, { params });
  }

  getNear(lng: number, lat: number, radius = 100000): Observable<ApiResponse<any>> {
    const params = new HttpParams()
      .set('longitude', lng.toString())
      .set('latitude',  lat.toString())
      .set('max_distance', radius.toString());
    return this.http.get<ApiResponse<any>>(`${this.base}/geo/near`, { params });
  }

  // ------------------------------------------------------------------
  // Sub-documents
  // ------------------------------------------------------------------

  getAffectedAccounts(breachId: string): Observable<ApiResponse<AffectedAccount[]>> {
    return this.http.get<ApiResponse<AffectedAccount[]>>(`${this.base}/${breachId}/affected-accounts`);
  }

  addAffectedAccount(breachId: string, account: Partial<AffectedAccount>): Observable<ApiResponse<AffectedAccount>> {
    return this.http.post<ApiResponse<AffectedAccount>>(`${this.base}/${breachId}/affected-accounts`, account);
  }

  updateAffectedAccount(breachId: string, accountId: string, payload: Partial<AffectedAccount>): Observable<ApiResponse<AffectedAccount>> {
    return this.http.patch<ApiResponse<AffectedAccount>>(`${this.base}/${breachId}/affected-accounts/${accountId}`, payload);
  }

  deleteAffectedAccount(breachId: string, accountId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${breachId}/affected-accounts/${accountId}`);
  }

  getTimeline(breachId: string): Observable<ApiResponse<TimelineEvent[]>> {
    return this.http.get<ApiResponse<TimelineEvent[]>>(`${this.base}/${breachId}/timeline`);
  }

  addTimelineEvent(breachId: string, event: Partial<TimelineEvent>): Observable<ApiResponse<TimelineEvent>> {
    return this.http.post<ApiResponse<TimelineEvent>>(`${this.base}/${breachId}/timeline`, event);
  }

  updateTimelineEvent(breachId: string, eventId: string, payload: Partial<TimelineEvent>): Observable<ApiResponse<TimelineEvent>> {
    return this.http.patch<ApiResponse<TimelineEvent>>(`${this.base}/${breachId}/timeline/${eventId}`, payload);
  }

  deleteTimelineEvent(breachId: string, eventId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${breachId}/timeline/${eventId}`);
  }

  getRemediation(breachId: string): Observable<ApiResponse<RemediationAction[]>> {
    return this.http.get<ApiResponse<RemediationAction[]>>(`${this.base}/${breachId}/remediation`);
  }

  addRemediation(breachId: string, action: Partial<RemediationAction>): Observable<ApiResponse<RemediationAction>> {
    return this.http.post<ApiResponse<RemediationAction>>(`${this.base}/${breachId}/remediation`, action);
  }

  updateRemediation(breachId: string, actionId: string, payload: Partial<RemediationAction>): Observable<ApiResponse<RemediationAction>> {
    return this.http.patch<ApiResponse<RemediationAction>>(`${this.base}/${breachId}/remediation/${actionId}`, payload);
  }

  deleteRemediation(breachId: string, actionId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${breachId}/remediation/${actionId}`);
  }

  getAlerts(breachId: string): Observable<ApiResponse<MonitoringAlert[]>> {
    return this.http.get<ApiResponse<MonitoringAlert[]>>(`${this.base}/${breachId}/alerts`);
  }

  addAlert(breachId: string, alert: Partial<MonitoringAlert>): Observable<ApiResponse<MonitoringAlert>> {
    return this.http.post<ApiResponse<MonitoringAlert>>(`${this.base}/${breachId}/alerts`, alert);
  }

  updateAlert(breachId: string, alertId: string, payload: Partial<MonitoringAlert>): Observable<ApiResponse<MonitoringAlert>> {
    return this.http.patch<ApiResponse<MonitoringAlert>>(`${this.base}/${breachId}/alerts/${alertId}`, payload);
  }

  deleteAlert(breachId: string, alertId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${breachId}/alerts/${alertId}`);
  }
}
