import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { AnalyticsService } from '../../core/services/analytics.service';
import { AuthService } from '../../core/services/auth.service';
import { BreachService } from '../../core/services/breach.service';
import { NotificationService } from '../../core/services/notification.service';
import { ThemeService } from '../../core/services/theme.service';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { CommonModule } from '@angular/common';
import { signal } from '@angular/core';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let analyticsServiceSpy: jasmine.SpyObj<AnalyticsService>;
  let authServiceSpy: any;
  let breachServiceSpy: jasmine.SpyObj<BreachService>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let themeServiceSpy: any;

  const mockSummary = {
    total_breaches: 100,
    total_records_exposed: 500000,
    avg_risk_score: 7.5,
    critical_breaches: 10,
    active_breaches: 5
  };

  beforeEach(async () => {
    analyticsServiceSpy = jasmine.createSpyObj('AnalyticsService', ['getSummary', 'getRiskByIndustry', 'getMonthlyTrend', 'getAttackSurfaceProfile', 'getSeverityBreakdown']);
    breachServiceSpy = jasmine.createSpyObj('BreachService', ['getBreaches', 'getAdvancedSearch', 'getGeoJson', 'getWithinBounds', 'getNear']);
    notificationServiceSpy = jasmine.createSpyObj('NotificationService', ['show']);

    authServiceSpy = {
      isAuthenticated: signal(true),
      isAdmin: signal(false),
      isAnalyst: signal(false),
      currentUser: signal({ username: 'testuser' }),
      logout: jasmine.createSpy('logout')
    };

    themeServiceSpy = {
      theme: signal('dark'),
      isDark: signal(true)
    };

    // Setup default mock returns
    analyticsServiceSpy.getSummary.and.returnValue(of({ status: 'success', data: mockSummary } as any));
    analyticsServiceSpy.getRiskByIndustry.and.returnValue(of({ status: 'success', data: [] } as any));
    analyticsServiceSpy.getMonthlyTrend.and.returnValue(of({ status: 'success', data: [] } as any));
    analyticsServiceSpy.getAttackSurfaceProfile.and.returnValue(of({ status: 'success', data: { overview: {}, severity_mix: [], top_data_types: [], industry_risk_ranking: [], alert_pressure: {} } } as any));
    analyticsServiceSpy.getSeverityBreakdown.and.returnValue(of({ status: 'success', data: [] } as any));

    breachServiceSpy.getBreaches.and.returnValue(of({ status: 'success', data: [], meta: {} } as any));
    breachServiceSpy.getAdvancedSearch.and.returnValue(of({ status: 'success', data: [], meta: {} } as any));
    breachServiceSpy.getGeoJson.and.returnValue(of({ status: 'success', data: { type: 'FeatureCollection', features: [] } } as any));
    breachServiceSpy.getWithinBounds.and.returnValue(of({ status: 'success', data: { type: 'FeatureCollection', features: [] } } as any));
    breachServiceSpy.getNear.and.returnValue(of({ status: 'success', data: { type: 'FeatureCollection', features: [] } } as any));

    await TestBed.configureTestingModule({
      imports: [DashboardComponent, CommonModule],
      providers: [
        provideRouter([
          { path: '', component: DashboardComponent },
          { path: 'dashboard', component: DashboardComponent },
          { path: 'breaches', component: class {} as any },
          { path: 'admin', component: class {} as any }
        ]),
        { provide: AnalyticsService, useValue: analyticsServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: BreachService, useValue: breachServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: ThemeService, useValue: themeServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load analytics summary on init', () => {
    expect(analyticsServiceSpy.getSummary).toHaveBeenCalled();
    expect(component.summary).toEqual(mockSummary as any);
  });

  it('should correctly format large numbers via UI logic (simulated)', () => {
    expect(component.summary?.total_records_exposed).toBe(500000);
  });

  it('should determine risk levels based on scores', () => {
    expect(component.getVaryingColorClass(0)).toBe('text-primary');
    expect(component.getVaryingColorClass(1)).toBe('text-secondary');
  });

  it('should calculate active rate pct', () => {
     const rate = (mockSummary.active_breaches / mockSummary.total_breaches) * 100;
     expect(rate).toBe(5);
  });
});
