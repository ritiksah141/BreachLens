import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, convertToParamMap, Router } from '@angular/router';
import { of, throwError, Observable } from 'rxjs';
import { breachResolver } from './breach.resolver';
import { BreachService } from '../services/breach.service';
import { NotificationService } from '../services/notification.service';
import { Breach } from '../models/models';

describe('breachResolver', () => {
  let mockBreachService: jasmine.SpyObj<BreachService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockNotifications: jasmine.SpyObj<NotificationService>;

  const fakeBreach: Breach = {
    _id: 'abc123',
    title: 'Test Breach',
    description: 'A test breach',
    severity: 'high',
    status: 'active',
    industry: 'Technology',
    affected_records_count: 5000,
    breach_date: '2025-01-01',
    discovered_date: '2025-01-15',
  };

  function buildRoute(id: string | null): ActivatedRouteSnapshot {
    return {
      paramMap: convertToParamMap(id ? { id } : {}),
    } as unknown as ActivatedRouteSnapshot;
  }

  beforeEach(() => {
    mockBreachService = jasmine.createSpyObj('BreachService', ['getBreach']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockNotifications = jasmine.createSpyObj('NotificationService', ['show']);

    TestBed.configureTestingModule({
      providers: [
        { provide: BreachService, useValue: mockBreachService },
        { provide: Router, useValue: mockRouter },
        { provide: NotificationService, useValue: mockNotifications },
      ],
    });
  });

  it('should resolve a breach successfully', (done) => {
    mockBreachService.getBreach.and.returnValue(of({ status: 'success', data: fakeBreach }));

    const result$ = TestBed.runInInjectionContext(() =>
      breachResolver(buildRoute('abc123'), {} as any)
    ) as Observable<Breach | null>;

    result$.subscribe((breach) => {
      expect(breach).toEqual(fakeBreach);
      expect(mockBreachService.getBreach).toHaveBeenCalledWith('abc123');
      done();
    });
  });

  it('should pass the route param id to BreachService.getBreach', (done) => {
    mockBreachService.getBreach.and.returnValue(of({ status: 'success', data: fakeBreach }));

    const result$ = TestBed.runInInjectionContext(() =>
      breachResolver(buildRoute('xyz789'), {} as any)
    ) as Observable<Breach | null>;

    result$.subscribe(() => {
      expect(mockBreachService.getBreach).toHaveBeenCalledWith('xyz789');
      done();
    });
  });

  it('should use empty string when route param id is missing', (done) => {
    mockBreachService.getBreach.and.returnValue(of({ status: 'success', data: fakeBreach }));

    const result$ = TestBed.runInInjectionContext(() =>
      breachResolver(buildRoute(null), {} as any)
    ) as Observable<Breach | null>;

    result$.subscribe(() => {
      expect(mockBreachService.getBreach).toHaveBeenCalledWith('');
      done();
    });
  });

  it('should return null and show error notification on API error', (done) => {
    mockBreachService.getBreach.and.returnValue(throwError(() => new Error('Not found')));

    const result$ = TestBed.runInInjectionContext(() =>
      breachResolver(buildRoute('bad-id'), {} as any)
    ) as Observable<Breach | null>;

    result$.subscribe((breach) => {
      expect(breach).toBeNull();
      expect(mockNotifications.show).toHaveBeenCalledWith(
        'Breach not found.',
        'error',
        3000
      );
      done();
    });
  });

  it('should navigate to /breaches on error', (done) => {
    mockBreachService.getBreach.and.returnValue(throwError(() => new Error('Server error')));

    const result$ = TestBed.runInInjectionContext(() =>
      breachResolver(buildRoute('err-id'), {} as any)
    ) as Observable<Breach | null>;

    result$.subscribe(() => {
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/breaches']);
      done();
    });
  });

  it('should extract data from the response wrapper', (done) => {
    const rawResponse = { status: 'success', data: fakeBreach, meta: {} };
    mockBreachService.getBreach.and.returnValue(of(rawResponse));

    const result$ = TestBed.runInInjectionContext(() =>
      breachResolver(buildRoute('abc123'), {} as any)
    ) as Observable<Breach | null>;

    result$.subscribe((breach) => {
      expect(breach).toEqual(fakeBreach);
      expect((breach as any).status).not.toBe('success'); // not the wrapper
      done();
    });
  });

  it('should handle network error gracefully', (done) => {
    mockBreachService.getBreach.and.returnValue(
      throwError(() => ({ status: 0, statusText: 'Unknown Error' }))
    );

    const result$ = TestBed.runInInjectionContext(() =>
      breachResolver(buildRoute('abc123'), {} as any)
    ) as Observable<Breach | null>;

    result$.subscribe((breach) => {
      expect(breach).toBeNull();
      expect(mockNotifications.show).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/breaches']);
      done();
    });
  });

  it('should not call notification or router on success', (done) => {
    mockBreachService.getBreach.and.returnValue(of({ status: 'success', data: fakeBreach }));

    const result$ = TestBed.runInInjectionContext(() =>
      breachResolver(buildRoute('abc123'), {} as any)
    ) as Observable<Breach | null>;

    result$.subscribe(() => {
      expect(mockNotifications.show).not.toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
      done();
    });
  });
});
