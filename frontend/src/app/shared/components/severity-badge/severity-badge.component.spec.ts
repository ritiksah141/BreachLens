/// <reference types="jasmine" />

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SeverityBadgeComponent } from './severity-badge.component';

describe('SeverityBadgeComponent', () => {
  let component: SeverityBadgeComponent;
  let fixture: ComponentFixture<SeverityBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeverityBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SeverityBadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  // ---------------------------------------------------------------
  // badgeClass() logic
  // ---------------------------------------------------------------

  it('should return "badge-critical" for severity "critical"', () => {
    component.severity = 'critical';
    expect(component.badgeClass()).toBe('badge-critical');
  });

  it('should return "badge-high" for severity "high"', () => {
    component.severity = 'high';
    expect(component.badgeClass()).toBe('badge-high');
  });

  it('should return "badge-medium" for severity "medium"', () => {
    component.severity = 'medium';
    expect(component.badgeClass()).toBe('badge-medium');
  });

  it('should return "badge-low" for severity "low"', () => {
    component.severity = 'low';
    expect(component.badgeClass()).toBe('badge-low');
  });

  it('should return "badge-informational" for severity "informational"', () => {
    component.severity = 'informational';
    expect(component.badgeClass()).toBe('badge-informational');
  });

  it('should be case-insensitive (e.g. "CRITICAL" maps to badge-critical)', () => {
    component.severity = 'CRITICAL';
    expect(component.badgeClass()).toBe('badge-critical');
  });

  it('should handle mixed-case input (e.g. "High")', () => {
    component.severity = 'High';
    expect(component.badgeClass()).toBe('badge-high');
  });

  it('should fall back to "badge-informational" for an empty string', () => {
    component.severity = '';
    expect(component.badgeClass()).toBe('badge-informational');
  });

  it('should fall back to "badge-informational" for an unrecognized severity', () => {
    component.severity = 'unknown';
    expect(component.badgeClass()).toBe('badge-informational');
  });

  // ---------------------------------------------------------------
  // CSS class applied in the DOM
  // ---------------------------------------------------------------

  it('should apply the correct CSS class to the badge span element', () => {
    component.severity = 'high';
    fixture.detectChanges();

    const badge = fixture.debugElement.query(By.css('span.badge'));
    expect(badge.nativeElement.classList).toContain('badge-high');
  });

  it('should switch CSS class when severity input changes', () => {
    component.severity = 'low';
    fixture.detectChanges();
    let badge = fixture.debugElement.query(By.css('span.badge'));
    expect(badge.nativeElement.classList).toContain('badge-low');

    component.severity = 'critical';
    fixture.detectChanges();
    badge = fixture.debugElement.query(By.css('span.badge'));
    expect(badge.nativeElement.classList).toContain('badge-critical');
    expect(badge.nativeElement.classList).not.toContain('badge-low');
  });

  // ---------------------------------------------------------------
  // Uppercase pipe in template
  // ---------------------------------------------------------------

  it('should render severity text in uppercase via the uppercase pipe', () => {
    component.severity = 'medium';
    fixture.detectChanges();

    const badge = fixture.debugElement.query(By.css('span.badge'));
    expect(badge.nativeElement.textContent.trim()).toBe('MEDIUM');
  });

  it('should render empty text when severity is an empty string', () => {
    component.severity = '';
    fixture.detectChanges();

    const badge = fixture.debugElement.query(By.css('span.badge'));
    expect(badge.nativeElement.textContent.trim()).toBe('');
  });
});
