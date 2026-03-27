import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { BreachService } from './breach.service';
import { environment } from '../../../environments/environment';

describe('BreachService', () => {
  let service: BreachService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/breaches`;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(BreachService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getBreaches() should send GET with query params', () => {
    service.getBreaches({ page: 2, limit: 10, severity: 'critical', search: 'hack' }).subscribe();

    const req = http.expectOne((r) => r.url === `${base}/`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('severity')).toBe('critical');
    expect(req.request.params.get('search')).toBe('hack');
    req.flush({ data: [], meta: { page: 2, limit: 10, total: 0, total_pages: 0 } });
  });

  it('getBreach() should GET single breach by id', () => {
    service.getBreach('abc123').subscribe();
    const req = http.expectOne(`${base}/abc123`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: { _id: 'abc123', title: 'Test' } });
  });

  it('createBreach() should POST to /breaches/', () => {
    const payload = { title: 'New breach', severity: 'high' };
    service.createBreach(payload).subscribe();
    const req = http.expectOne(`${base}/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ data: { _id: '999', ...payload } });
  });

  it('updateBreach() should PUT to /breaches/:id', () => {
    const payload = { title: 'Updated' };
    service.updateBreach('abc123', payload).subscribe();
    const req = http.expectOne(`${base}/abc123`);
    expect(req.request.method).toBe('PUT');
    req.flush({ data: { _id: 'abc123', ...payload } });
  });

  it('patchBreach() should PATCH to /breaches/:id', () => {
    service.patchBreach('abc123', { status: 'resolved' }).subscribe();
    const req = http.expectOne(`${base}/abc123`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ data: {} });
  });

  it('deleteBreach() should DELETE /breaches/:id', () => {
    service.deleteBreach('abc123').subscribe();
    const req = http.expectOne(`${base}/abc123`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('checkExposure() should send email as query param', () => {
    service.checkExposure('test@example.com').subscribe();
    const req = http.expectOne((r) => r.url.includes('exposure-check'));
    expect(req.request.params.get('email')).toBe('test@example.com');
    req.flush({ data: { exposed: false } });
  });

  it('getGeoJson() should GET geo/geojson endpoint', () => {
    service.getGeoJson('critical').subscribe();
    const req = http.expectOne((r) => r.url.includes('geo/geojson'));
    expect(req.request.params.get('severity')).toBe('critical');
    req.flush({ data: { type: 'FeatureCollection', features: [] } });
  });
});
