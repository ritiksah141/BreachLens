import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NotificationService, NotificationLevel } from './notification.service';

describe( 'NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with an empty notifications list', () => {
    expect(service.notifications()).toEqual([]);
  });

  it('should add a notification via show() and return its id', () => {
    const id = service.show('Hello', 'info', 0);
    expect(id).toBeGreaterThan(0);
    expect(service.notifications().length).toBe(1);
    expect(service.notifications()[0]).toEqual(
      jasmine.objectContaining({ id, message: 'Hello', level: 'info' })
    );
  });

  it('should default to info level when no level is supplied', () => {
    service.show('Default level', undefined as any, 0);
    expect(service.notifications()[0].level).toBe('info');
  });

  it('should assign unique incrementing ids to each notification', () => {
    const id1 = service.show('A', 'info', 0);
    const id2 = service.show('B', 'warning', 0);
    const id3 = service.show('C', 'error', 0);
    expect(id2).toBeGreaterThan(id1);
    expect(id3).toBeGreaterThan(id2);
    expect(service.notifications().length).toBe(3);
  });

  it('should support all notification levels', () => {
    const levels: NotificationLevel[] = ['info', 'success', 'warning', 'error'];
    levels.forEach((level) => service.show(`msg-${level}`, level, 0));
    const stored = service.notifications();
    expect(stored.length).toBe(4);
    levels.forEach((level, i) => {
      expect(stored[i].level).toBe(level);
    });
  });

  it('should dismiss a specific notification by id', () => {
    const id1 = service.show('First', 'info', 0);
    const id2 = service.show('Second', 'success', 0);
    service.dismiss(id1);
    const remaining = service.notifications();
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe(id2);
  });

  it('should do nothing when dismissing a non-existent id', () => {
    service.show('Only one', 'info', 0);
    service.dismiss(9999);
    expect(service.notifications().length).toBe(1);
  });

  it('should clear all notifications via clearHistory()', () => {
    service.show('A', 'info', 0);
    service.show('B', 'warning', 0);
    service.show('C', 'error', 0);
    service.clearHistory();
    expect(service.notifications()).toEqual([]);
    expect(service.history()).toEqual([]);
  });

  it('should auto-dismiss after the specified duration', fakeAsync(() => {
    const id = service.show('Auto dismiss', 'info', 2000);
    expect(service.notifications().length).toBe(1);

    tick(1999);
    expect(service.notifications().length).toBe(1);

    tick(1);
    expect(service.notifications().length).toBe(0);
  }));

  it('should not auto-dismiss when durationMs is 0', fakeAsync(() => {
    service.show('Persistent', 'info', 0);
    tick(10000);
    expect(service.notifications().length).toBe(1);
  }));

  it('should use the default 4000ms duration when not specified', fakeAsync(() => {
    service.show('Default duration', 'info');
    expect(service.notifications().length).toBe(1);

    tick(3999);
    expect(service.notifications().length).toBe(1);

    tick(1);
    expect(service.notifications().length).toBe(0);
  }));

  it('should expose a readonly signal that reflects internal state', () => {
    expect(service.notifications()).toEqual([]);
    service.show('A', 'info', 0);
    expect(service.notifications().length).toBe(1);
    service.show('B', 'error', 0);
    expect(service.notifications().length).toBe(2);
    service.clearHistory();
    expect(service.notifications().length).toBe(0);
  });
});
