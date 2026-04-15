import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { BreachListComponent } from './breach-list.component';
import { BreachService } from '../../../core/services/breach.service';

const mockResponse = {
  data: [
    {
      _id: '1', title: 'Test Breach', severity: 'critical',
      status: 'open', industry: 'Finance', description: 'desc',
      affected_records_count: 1000, breach_date: '2024-01-01',
      discovered_date: '2024-01-02', risk_score: 9,
    },
  ],
  meta: { page: 1, limit: 12, total: 1, total_pages: 1 },
};

describe('BreachListComponent', () => {
  let component: BreachListComponent;
  let fixture: ComponentFixture<BreachListComponent>;
  let breachServiceSpy: jasmine.SpyObj<BreachService>;

  beforeEach(async () => {
    breachServiceSpy = jasmine.createSpyObj('BreachService', [
      'getAdvancedSearch',
      'getFilterOptions',
      'querySubdocuments',
    ]);
    breachServiceSpy.getAdvancedSearch.and.returnValue(of(mockResponse as any));
    breachServiceSpy.getFilterOptions.and.returnValue(of({
      data: {
        severities: ['critical', 'high'],
        statuses: ['active', 'resolved'],
        industries: ['finance', 'technology'],
        data_types: [],
        ranges: { min_risk: 0, max_risk: 10, min_records: 0, max_records: 1000 },
      }
    } as any));
    breachServiceSpy.querySubdocuments.and.returnValue(of({
      data: mockResponse.data,
      meta: {
        ...mockResponse.meta,
        facets: {
          timeline_event_types: [{ value: 'discovered', count: 2 }],
        },
      },
    } as any));

    await TestBed.configureTestingModule({
      imports: [BreachListComponent, HttpClientTestingModule, RouterTestingModule],
      providers: [{ provide: BreachService, useValue: breachServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(BreachListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load breaches on init', () => {
    expect(breachServiceSpy.getAdvancedSearch).toHaveBeenCalled();
    expect(component.breaches.length).toBe(1);
    expect(component.total).toBe(1);
  });

  it('should display breach title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Test Breach');
  });

  it('should reset page to 1 when applying filters', () => {
    component.filters.page = 3;
    component.applyFilters();
    expect(component.filters.page).toBe(1);
    expect(breachServiceSpy.getAdvancedSearch).toHaveBeenCalledTimes(2);
  });

  it('should show error when service fails', () => {
    breachServiceSpy.getAdvancedSearch.and.returnValue(
      throwError(() => ({ error: { message: 'Server error' } }))
    );
    component.loadBreaches();
    expect(component.error).toBe('Server error');
  });

  it('should save filters to sessionStorage', () => {
    component.filters.severity = 'high';
    component.loadBreaches();
    const saved = JSON.parse(sessionStorage.getItem('bl_breach_filters') ?? '{}');
    expect(saved.severity).toBe('high');
  });

  it('should load filter options from backend metadata', () => {
    expect(component.severities).toContain('critical');
    expect(component.statuses).toContain('resolved');
    expect(component.industries).toContain('finance');
  });

  it('should run deep subdocument query and store facets', () => {
    component.subdocFilters.timeline_event_types = 'discovered';
    component.runSubdocumentQuery();
    expect(breachServiceSpy.querySubdocuments).toHaveBeenCalled();
    expect(component.subdocFacets).toBeTruthy();
  });

  it('resetFilters() should clear all filters', () => {
    component.filters.severity = 'critical';
    component.filters.search = 'hack';
    component.resetFilters();
    expect(component.filters.severity).toBe('');
    expect(component.filters.search).toBe('');
    expect(component.filters.page).toBe(1);
  });
});
