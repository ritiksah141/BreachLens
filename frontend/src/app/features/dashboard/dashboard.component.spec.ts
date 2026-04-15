/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DashboardComponent } from './dashboard.component';
import { AnalyticsService } from '../../core/services/analytics.service';
import { BreachService } from '../../core/services/breach.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { ThemeService } from '../../core/services/theme.service';

describe('DashboardComponent', () => {
  let analyticsSpy: jasmine.SpyObj<AnalyticsService>;
  let breachSpy: jasmine.SpyObj<BreachService>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let notificationSpy: jasmine.SpyObj<NotificationService>;
  let themeSpy: jasmine.SpyObj<ThemeService>;

  beforeEach(async () => {
    analyticsSpy = jasmine.createSpyObj('AnalyticsService', [
      'getSummary',
      'getSeverityBreakdown',
      'getMonthlyTrend',
      'getDataTypesFrequency',
      'getRiskScores',
      'getTopOrganisations',
      'getRemediationRate',
      'getIndustryYearTrend',
      'getAttackSurfaceProfile',
    ]);

    breachSpy = jasmine.createSpyObj('BreachService', ['checkExposure']);
    authSpy = jasmine.createSpyObj('AuthService', ['isAnalyst']);
    notificationSpy = jasmine.createSpyObj('NotificationService', ['show']);
    themeSpy = jasmine.createSpyObj('ThemeService', ['theme']);

    analyticsSpy.getSummary.and.returnValue(of({
      data: {
        total_breaches: 12,
        total_records_exposed: 50000,
        avg_risk_score: 7.2,
        active_breaches: 6,
        resolved_breaches: 3,
        open_alerts: 4,
        industries_affected: 3,
      },
    } as any));
    analyticsSpy.getSeverityBreakdown.and.returnValue(of({ data: [] } as any));
    analyticsSpy.getMonthlyTrend.and.returnValue(of({ data: [{ year: 2025, month: 1, count: 3 }] } as any));
    analyticsSpy.getDataTypesFrequency.and.returnValue(of({ data: [] } as any));
    analyticsSpy.getRiskScores.and.returnValue(of({ data: [] } as any));
    analyticsSpy.getTopOrganisations.and.returnValue(of({ data: [] } as any));
    analyticsSpy.getRemediationRate.and.returnValue(of({ data: [] } as any));
    analyticsSpy.getIndustryYearTrend.and.returnValue(of({ data: [] } as any));
    analyticsSpy.getAttackSurfaceProfile.and.returnValue(of({
      data: {
        overview: { breach_count: 12, avg_risk_score: 7.2, total_records_exposed: 50000, avg_records_per_breach: 4000 },
        severity_mix: [],
        top_data_types: [],
        industry_risk_ranking: [],
        alert_pressure: { total_alerts: 20, unacknowledged_alerts: 5, unacknowledged_rate: 25 },
      },
    } as any));

    breachSpy.checkExposure.and.returnValue(of({ data: { exposed: false, breach_count: 0 } } as any));

    authSpy.isAnalyst.and.returnValue(true);
    themeSpy.theme.and.returnValue('dark');

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: AnalyticsService, useValue: analyticsSpy },
        { provide: BreachService, useValue: breachSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: NotificationService, useValue: notificationSpy },
        { provide: ThemeService, useValue: themeSpy },
      ],
    }).compileComponents();
  });

  it('loads attack surface profile for analyst users', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;

    component.ngOnInit();

    expect(analyticsSpy.getAttackSurfaceProfile).toHaveBeenCalled();
    expect(component.attackSurfaceProfile).toBeTruthy();
  });

  it('updates system health when attack surface profile is present', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;

    component.ngOnInit();

    expect(component.systemHealthPct).toBeGreaterThanOrEqual(40);
    expect(component.systemHealthPct).toBeLessThanOrEqual(100);
  });
});
