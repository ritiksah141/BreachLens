import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BreachListComponent } from './breach-list.component';
import { BreachService } from '../../../core/services/breach.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

describe('BreachListComponent', () => {
  let component: BreachListComponent;
  let fixture: ComponentFixture<BreachListComponent>;
  let breachServiceSpy: jasmine.SpyObj<BreachService>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;

  const mockBreachResponse = {
    status: 'success',
    data: [
      { _id: '1', title: 'Test Breach', severity: 'critical', industry: 'finance', affected_records_count: 1000, breach_date: '2023-01-01', organisation: { name: 'Test Org' } }
    ],
    meta: { total: 1, total_pages: 1, page: 1, limit: 15 },
    facets: {
      severity: [{ _id: 'critical', count: 1 }],
      industry: [{ _id: 'finance', count: 1 }]
    }
  };

  beforeEach(async () => {
    breachServiceSpy = jasmine.createSpyObj('BreachService', ['getBreaches']);
    notificationServiceSpy = jasmine.createSpyObj('NotificationService', ['show']);

    await TestBed.configureTestingModule({
      imports: [BreachListComponent, FormsModule, CommonModule],
      providers: [
        { provide: BreachService, useValue: breachServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: { queryParams: of({}) }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BreachListComponent);
    component = fixture.componentInstance;
    breachServiceSpy.getBreaches.and.returnValue(of(mockBreachResponse as any));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load breaches on init', () => {
    expect(breachServiceSpy.getBreaches).toHaveBeenCalled();
    expect(component.breaches.length).toBe(1);
    expect(component.total).toBe(1);
  });

  it('should handle API errors with notification', () => {
    breachServiceSpy.getBreaches.and.returnValue(throwError(() => new Error('API Error')));
    component.loadBreaches();
    expect(notificationServiceSpy.show).toHaveBeenCalledWith(jasmine.any(String), 'error');
    expect(component.loading).toBeFalse();
  });

  it('should apply filters and reset to page 1', () => {
    component.filters.severity = 'high';
    component.applyFilters();
    expect(component.filters.page).toBe(1);
    expect(breachServiceSpy.getBreaches).toHaveBeenCalled();
  });

  it('should reset filters correctly', () => {
    component.filters.search = 'test';
    component.showSubdocQuery = true;
    component.resetFilters();
    expect(component.filters.search).toBe('');
    expect(component.showSubdocQuery).toBeFalse();
    expect(notificationServiceSpy.show).toHaveBeenCalledWith('ALL FILTERS RESET', 'info', 2000);
  });

  it('should convert comma-separated advanced filters to arrays', () => {
    component.showSubdocQuery = true;
    // Set values as strings (as ngModel would do from a text input, though we use selects now,
    // the logic still supports string-to-array transformation for robustness)
    (component.subdocFilters as any).timeline_event_types = 'found, fixed';

    component.loadBreaches();

    const callArgs = breachServiceSpy.getBreaches.calls.mostRecent().args[0] as any;
    expect(callArgs).toBeDefined();
    expect(Array.isArray(callArgs.timeline_event_types)).toBeTrue();
    expect(callArgs.timeline_event_types).toEqual(['found', 'fixed']);
  });

  it('should toggle sort order', () => {
    const initialOrder = component.filters.order;
    component.toggleOrder();
    expect(component.filters.order).not.toBe(initialOrder);
    expect(breachServiceSpy.getBreaches).toHaveBeenCalled();
  });

  it('should show feedback when refreshing logs', () => {
    component.refreshLogs();
    expect(notificationServiceSpy.show).toHaveBeenCalledWith('SYNCHRONIZING THREAT INTELLIGENCE...', 'info', 2000);
  });
});
