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
  event_date?: string;
  occurred_at?: string;
  actor?: string;
}

export interface RemediationAction {
  _id?: string;
  action: string;
  status: 'pending' | 'in_progress' | 'completed';
  assigned_to?: string;
  due_date?: string;
  completed_date?: string;
  completed_at?: string;
}

export interface MonitoringAlert {
  _id?: string;
  alert_type: string;
  details?: string;
  message?: string;
  severity: string;
  acknowledged: boolean;
  triggered_at?: string;
  created_at?: string;
}

export interface AffectedAccount {
  _id?: string;
  email?: string;
  username?: string;
  data_exposed?: string[];
  data_types_exposed?: string[];
  notified?: boolean;
  notification_date?: string;
}

export interface Breach {
  _id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  status: 'active' | 'investigating' | 'contained' | 'resolved' | 'open' | 'closed';
  industry: string;
  organisation?: string | {
    name?: string;
    domain?: string;
    country?: string;
    size?: string;
  };
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
  monitoring_alerts?: MonitoringAlert[];
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
  facets?: BreachFacets;
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
  severity: string;
  breach_count: number;
  total_records: number;
}

export interface MonthlyTrend {
  year: number;
  month: number;
  count: number;
}

export interface RiskByIndustry {
  industry: string;
  avg_risk_score: number;
  breach_count: number;
  total_records_exposed: number;
}

export interface DataTypeFrequency {
  data_type: string;
  count: number;
}

export interface AnalyticsSummary {
  total_breaches: number;
  total_records_exposed: number;
  avg_risk_score: number;
  active_breaches: number;
  resolved_breaches: number;
  open_alerts: number;
  industries_affected: number;
}

export interface SystemStats {
  users: {
    total: number;
    by_role: { admin: number; analyst: number; guest: number };
    active: number;
    inactive: number;
  };
  breaches: {
    total: number;
    by_status: Record<string, number>;
    by_severity: Record<string, number>;
  };
  alerts: {
    total: number;
    unacknowledged: number;
  };
}

export interface AuditLog {
  timestamp: string;
  user_id: string;
  action: string;
  resource: string;
  method: string;
  ip_address: string;
  user_agent: string;
  result: string;
  details: any;
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
  data_type?: string;
  sort_by?: string;
  order?: 'asc' | 'desc';
  min_risk?: number;
  max_risk?: number;
}

export interface AdvancedSearchParams {
  page?: number;
  limit?: number;
  sort_by?: 'breach_date' | 'risk_score' | 'affected_records_count' | 'title' | 'created_at';
  order?: 'asc' | 'desc';
  q?: string;
  severities?: string[];
  statuses?: string[];
  industries?: string[];
  data_types?: string[];
  from_date?: string;
  to_date?: string;
  min_risk?: number;
  max_risk?: number;
  min_records?: number;
  max_records?: number;
  has_location?: boolean;
  include_facets?: boolean;
}

export interface FilterCountItem {
  value?: string;
  count: number;
  notified?: boolean;
}

export interface FacetItem {
  _id: string;
  count: number;
}

export interface BreachFacets {
  severity: FacetItem[];
  industry: FacetItem[];
}

export interface BreachFilterOptions {
  severities: string[];
  statuses: string[];
  industries: string[];
  data_types: FilterCountItem[];
  ranges: {
    min_risk: number;
    max_risk: number;
    min_records: number;
    max_records: number;
  };
}

export interface SubdocumentQueryParams {
  page?: number;
  limit?: number;
  sort_by?: 'risk_score' | 'breach_date' | 'affected_records_count' | 'created_at';
  order?: 'asc' | 'desc';
  timeline_event_types?: string[];
  timeline_from?: string;
  timeline_to?: string;
  remediation_statuses?: string[];
  alert_severities?: string[];
  alert_acknowledged?: boolean;
  account_notified?: boolean;
  exposed_data_types?: string[];
}

export interface SubdocumentQueryFacets {
  timeline_event_types?: FilterCountItem[];
  remediation_statuses?: FilterCountItem[];
  alert_severities?: FilterCountItem[];
  account_notified_mix?: FilterCountItem[];
}

export interface AttackSurfaceProfile {
  overview: {
    breach_count: number;
    avg_risk_score: number;
    total_records_exposed: number;
    avg_records_per_breach: number;
  };
  severity_mix: Array<{ severity: string; count: number }>;
  top_data_types: Array<{ data_type: string; count: number }>;
  industry_risk_ranking: Array<{
    industry: string;
    breach_count: number;
    avg_risk_score: number;
    total_records_exposed: number;
  }>;
  alert_pressure: {
    total_alerts: number;
    unacknowledged_alerts: number;
    unacknowledged_rate: number;
  };
}
