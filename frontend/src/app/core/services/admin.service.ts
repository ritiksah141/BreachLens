import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, SystemStats, User, Breach } from '../models/models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly adminBase = `${environment.apiUrl}/admin`;
  private readonly breachBase = `${environment.apiUrl}/breaches`;

  constructor(private http: HttpClient) {}

  getSystemStats(): Observable<ApiResponse<SystemStats>> {
    return this.http.get<ApiResponse<SystemStats>>(`${this.adminBase}/stats`);
  }

  listAllUsers(page = 1, limit = 20): Observable<ApiResponse<User[]>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.http.get<ApiResponse<User[]>>(`${this.adminBase}/users`, { params });
  }

  changeUserRole(userId: string, role: string): Observable<ApiResponse<User>> {
    return this.http.patch<ApiResponse<User>>(`${this.adminBase}/users/${userId}/role`, { role });
  }

  activateUser(userId: string): Observable<ApiResponse<User>> {
    return this.http.patch<ApiResponse<User>>(`${this.adminBase}/users/${userId}/activate`, {});
  }

  deactivateUser(userId: string): Observable<ApiResponse<User>> {
    return this.http.patch<ApiResponse<User>>(`${this.adminBase}/users/${userId}/deactivate`, {});
  }

  createBreach(data: any): Observable<ApiResponse<Breach>> {
    return this.http.post<ApiResponse<Breach>>(`${this.breachBase}`, data);
  }

  updateBreach(id: string, data: any): Observable<ApiResponse<Breach>> {
    return this.http.put<ApiResponse<Breach>>(`${this.breachBase}/${id}`, data);
  }

  deleteBreach(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.breachBase}/${id}`);
  }

  bulkDeleteBreaches(ids: string[]): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.breachBase}/bulk`, { body: { ids } });
  }

  bulkImport(breaches: any[]): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.breachBase}/bulk`, { breaches });
  }

  getAuditLogs(page = 1, limit = 20): Observable<ApiResponse<any[]>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.http.get<ApiResponse<any[]>>(`${this.adminBase}/audit-logs`, { params });
  }
}
