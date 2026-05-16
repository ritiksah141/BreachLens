import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DefenseHubComponent } from './defense-hub.component';
import { BreachService } from '../../core/services/breach.service';
import { AuthService } from '../../core/services/auth.service';
import { HealthService } from '../../core/services/health.service';
import { NotificationService } from '../../core/services/notification.service';
import { of, throwError } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { signal } from '@angular/core';

describe('DefenseHubComponent', () => {
  let component: DefenseHubComponent;
  let fixture: ComponentFixture<DefenseHubComponent>;
  let breachService: jasmine.SpyObj<BreachService>;
  let authService: jasmine.SpyObj<AuthService>;

  const mockExposureData = {
    exposed: true,
    aggregated_risk_score: 7.5,
    breach_count: 3,
    risk_genome: {
      identity: ['email', 'phone'],
      credentials: ['password'],
      financial: [],
      technical: []
    },
    defense_playbook: [
      { action: 'CREDENTIAL ROTATION', priority: 'critical', details: 'Reset passwords.' }
    ]
  };

  beforeEach(async () => {
    const breachSpy = jasmine.createSpyObj('BreachService', ['checkExposure']);
    const authSpy = jasmine.createSpyObj('AuthService', ['currentUser']);

    // Setup initial mock returns
    authSpy.currentUser.and.returnValue({ email: 'test@example.com', username: 'testuser' });
    breachSpy.checkExposure.and.returnValue(of({ status: 'success', data: mockExposureData }));

    await TestBed.configureTestingModule({
      imports: [
        DefenseHubComponent,
        RouterTestingModule,
        HttpClientTestingModule
      ],
      providers: [
        { provide: BreachService, useValue: breachSpy },
        { provide: AuthService, useValue: authSpy },
        {
          provide: HealthService,
          useValue: {
            isBackendReady: signal(true),
            isOnline: signal(true)
          }
        },
        {
          provide: NotificationService,
          useValue: jasmine.createSpyObj('NotificationService', ['show'])
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DefenseHubComponent);
    component = fixture.componentInstance;
    breachService = TestBed.inject(BreachService) as jasmine.SpyObj<BreachService>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load exposure data on init', () => {
    fixture.detectChanges(); // Trigger ngOnInit
    expect(authService.currentUser).toHaveBeenCalled();
    expect(breachService.checkExposure).toHaveBeenCalledWith('test@example.com');
    expect(component.exposureData).toEqual(mockExposureData);
  });

  it('should display "CRITICAL EXPOSURE DETECTED" when data is exposed', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('CRITICAL EXPOSURE DETECTED');
    expect(compiled.textContent).toContain('7.5');
  });

  it('should show nominal status when not exposed', () => {
    const nominalData = { exposed: false, aggregated_risk_score: 0, breach_count: 0, risk_genome: {}, defense_playbook: [] };
    breachService.checkExposure.and.returnValue(of({ status: 'success', data: nominalData }));

    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('SYSTEMS NORMAL');
    expect(compiled.textContent).toContain('0.0');
  });

  it('should handle service errors gracefully', () => {
    const notifyService = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;
    breachService.checkExposure.and.returnValue(throwError(() => new Error('API Error')));

    fixture.detectChanges();

    expect(component.loading).toBeFalse();
    expect(notifyService.show).toHaveBeenCalledWith('FAILED TO LOAD DEFENSE PROFILE', 'error');
  });

  it('should format category icons correctly', () => {
    expect(component.getCategoryIcon('identity')).toBe('fingerprint');
    expect(component.getCategoryIcon('financial')).toBe('payments');
    expect(component.getCategoryIcon('unknown')).toBe('data_object');
  });
});
