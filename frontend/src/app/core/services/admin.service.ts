import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, SystemStats, User } from '../models/models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly base = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  getSystemStats(): Observable<ApiResponse<SystemStats>> {
    return this.http.get<ApiResponse<SystemStats>>(`${this.base}/stats`);
  }

  listAllUsers(page = 1, limit = 20): Observable<ApiResponse<User[]>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.http.get<ApiResponse<User[]>>(`${this.base}/users`, { params });
  }

  changeUserRole(userId: string, role: string): Observable<ApiResponse<User>> {
    return this.http.patch<ApiResponse<User>>(`${this.base}/users/${userId}/role`, { role });
  }

  activateUser(userId: string): Observable<ApiResponse<User>> {
    return this.http.patch<ApiResponse<User>>(`${this.base}/users/${userId}/activate`, {});
  }

  deactivateUser(userId: string): Observable<ApiResponse<User>> {
    return this.http.patch<ApiResponse<User>>(`${this.base}/users/${userId}/deactivate`, {});
  }

  bulkDeleteBreaches(ids: string[]): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.base}/breaches/bulk`, { body: { ids } });
  }

  getAuditLogs(page = 1, limit = 20): Observable<ApiResponse<any[]>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.http.get<ApiResponse<any[]>>(`${this.base}/audit-logs`, { params });
  }
}
