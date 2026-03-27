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
    breachServiceSpy = jasmine.createSpyObj('BreachService', ['getBreaches']);
    breachServiceSpy.getBreaches.and.returnValue(of(mockResponse as any));

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
    expect(breachServiceSpy.getBreaches).toHaveBeenCalledOnceWith(component.filters);
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
    expect(breachServiceSpy.getBreaches).toHaveBeenCalledTimes(2);
  });

  it('should show error when service fails', () => {
    breachServiceSpy.getBreaches.and.returnValue(
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

  it('resetFilters() should clear all filters', () => {
    component.filters.severity = 'critical';
    component.filters.search = 'hack';
    component.resetFilters();
    expect(component.filters.severity).toBe('');
    expect(component.filters.search).toBe('');
    expect(component.filters.page).toBe(1);
  });
});
