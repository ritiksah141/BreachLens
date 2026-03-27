// -----------------------------------------------------------------------
// Models — mirrors BreachLens Flask/MongoDB backend schemas exactly
// -----------------------------------------------------------------------

export interface GeoJsonPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface TimelineEvent {
  _id?: string;
  event_type: string;
  description: string;
  occurred_at: string;
  actor?: string;
}

export interface RemediationAction {
  _id?: string;
  action: string;
  status: 'pending' | 'in_progress' | 'completed';
  assigned_to?: string;
  due_date?: string;
  completed_at?: string;
}

export interface MonitoringAlert {
  _id?: string;
  alert_type: string;
  message: string;
  severity: string;
  acknowledged: boolean;
  created_at?: string;
}

export interface AffectedAccount {
  _id?: string;
  email?: string;
  username?: string;
  data_types_exposed?: string[];
  notified?: boolean;
}

export interface Breach {
  _id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
  industry: string;
  organisation?: string;
  organisation_size?: string;
  affected_records_count: number;
  breach_date: string;
  discovered_date: string;
  risk_score?: number;
  data_types_exposed?: string[];
  attack_vector?: string;
  location?: GeoJsonPoint;
  source_url?: string;
  timeline?: TimelineEvent[];
  remediation?: RemediationAction[];
  alerts?: MonitoringAlert[];
  affected_accounts?: AffectedAccount[];
  created_at?: string;
  updated_at?: string;
}

export interface BreachListResponse {
  data: Breach[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ApiResponse<T> {
  status: string;
  data: T;
  meta?: any;
  message?: string;
}

// -----------------------------------------------------------------------
// Auth models
// -----------------------------------------------------------------------

export interface LoginCredentials {
  email?: string;
  username?: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  role?: string;
}

export interface AuthToken {
  token: string;
  expires_in?: number;
}

export interface User {
  _id: string;
  username: string;
  email: string;
  role: 'guest' | 'analyst' | 'admin';
  admin: boolean;
  is_active: boolean;
  created_at?: string;
  last_login?: string;
}

// -----------------------------------------------------------------------
// Analytics models
// -----------------------------------------------------------------------

export interface SeverityBreakdown {
  severity: string;       // backend projects severity: "$_id"
  breach_count: number;   // backend uses breach_count not count
  total_records: number;
}

export interface MonthlyTrend {
  year: number;
  month: number;
  count: number;
}

export interface RiskByIndustry {
  industry: string;        // backend projects industry: "$_id"
  avg_risk_score: number;  // backend uses avg_risk_score not avg_risk
  breach_count: number;
}

export interface DataTypeFrequency {
  data_type: string;  // backend projects data_type: "$_id"
  count: number;
}

export interface AnalyticsSummary {
  total_breaches: number;
  total_records_exposed: number;  // actual field name from backend
  avg_risk_score: number;
  active_breaches: number;        // actual field name (not open_breaches)
  resolved_breaches: number;
  open_alerts: number;
  industries_affected: number;
}

// -----------------------------------------------------------------------
// Filter / pagination params
// -----------------------------------------------------------------------

export interface BreachFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  severity?: string;
  status?: string;
  industry?: string;
  sort_by?: string;
  order?: 'asc' | 'desc';
  min_risk?: number;
  max_risk?: number;
}
