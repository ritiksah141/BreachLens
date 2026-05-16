import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AttackSurfaceProfile,
  ApiResponse,
  AnalyticsSummary,
  SeverityBreakdown,
  MonthlyTrend,
  RiskByIndustry,
  DataTypeFrequency,
} from '../models/models';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly base = `${environment.apiUrl}/analytics`;

  constructor(private http: HttpClient) {}

  getSummary(): Observable<ApiResponse<AnalyticsSummary>> {
    return this.http.get<ApiResponse<AnalyticsSummary>>(`${this.base}/summary`);
  }

  getSeverityBreakdown(): Observable<ApiResponse<SeverityBreakdown[]>> {
    return this.http.get<ApiResponse<SeverityBreakdown[]>>(`${this.base}/severity-breakdown`);
  }

  getMonthlyTrend(year?: number): Observable<ApiResponse<MonthlyTrend[]>> {
    let params = new HttpParams();
    if (year) params = params.set('year', year);
    return this.http.get<ApiResponse<MonthlyTrend[]>>(`${this.base}/monthly-trend`, { params });
  }

  getRiskByIndustry(): Observable<ApiResponse<RiskByIndustry[]>> {
    return this.http.get<ApiResponse<RiskByIndustry[]>>(`${this.base}/risk-by-industry`);
  }

  getDataTypesFrequency(): Observable<ApiResponse<DataTypeFrequency[]>> {
    return this.http.get<ApiResponse<DataTypeFrequency[]>>(`${this.base}/data-types-frequency`);
  }

  getRemediationRate(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.base}/remediation-rate`);
  }

  getTopOrganisations(limit = 10): Observable<ApiResponse<any>> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<ApiResponse<any>>(`${this.base}/top-organisations`, { params });
  }

  getAlertAcknowledgement(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.base}/alert-acknowledgement`);
  }

  getIndustryYearTrend(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.base}/industry-year-trend`);
  }

  getRiskScores(bins = 10): Observable<ApiResponse<any>> {
    const params = new HttpParams().set('bins', bins.toString());
    return this.http.get<ApiResponse<any>>(`${this.base}/risk-scores`, { params });
  }

  getAttackSurfaceProfile(industry?: string): Observable<ApiResponse<AttackSurfaceProfile>> {
    let params = new HttpParams();
    if (industry) {
      params = params.set('industry', industry);
    }
    return this.http.get<ApiResponse<AttackSurfaceProfile>>(`${this.base}/attack-surface-profile`, { params });
  }

  checkHealth(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/health/live`);
  }
}
