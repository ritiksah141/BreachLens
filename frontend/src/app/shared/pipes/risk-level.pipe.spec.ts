import { RiskLevelPipe } from './risk-level.pipe';

describe('RiskLevelPipe', () => {
  let pipe: RiskLevelPipe;

  beforeEach(() => {
    pipe = new RiskLevelPipe();
  });

  // ── null / undefined (label mode) ────────────────────────────────

  it('should return "N/A" for null in label mode', () => {
    expect(pipe.transform(null)).toBe('N/A');
  });

  it('should return "N/A" for undefined in label mode', () => {
    expect(pipe.transform(undefined)).toBe('N/A');
  });

  it('should return "N/A" for null when mode is explicitly "label"', () => {
    expect(pipe.transform(null, 'label')).toBe('N/A');
  });

  // ── null / undefined (class mode) ────────────────────────────────

  it('should return empty string for null in class mode', () => {
    expect(pipe.transform(null, 'class')).toBe('');
  });

  it('should return empty string for undefined in class mode', () => {
    expect(pipe.transform(undefined, 'class')).toBe('');
  });

  // ── label mode — all thresholds ──────────────────────────────────

  it('should return "MINIMAL" for score 0', () => {
    expect(pipe.transform(0)).toBe('MINIMAL');
  });

  it('should return "MINIMAL" for score 0.5', () => {
    expect(pipe.transform(0.5)).toBe('MINIMAL');
  });

  it('should return "LOW" for score 1', () => {
    expect(pipe.transform(1)).toBe('LOW');
  });

  it('should return "LOW" for score 2.9', () => {
    expect(pipe.transform(2.9)).toBe('LOW');
  });

  it('should return "MODERATE" for score 3', () => {
    expect(pipe.transform(3)).toBe('MODERATE');
  });

  it('should return "MODERATE" for score 4.9', () => {
    expect(pipe.transform(4.9)).toBe('MODERATE');
  });

  it('should return "ELEVATED" for score 5', () => {
    expect(pipe.transform(5)).toBe('ELEVATED');
  });

  it('should return "ELEVATED" for score 6.9', () => {
    expect(pipe.transform(6.9)).toBe('ELEVATED');
  });

  it('should return "HIGH" for score 7', () => {
    expect(pipe.transform(7)).toBe('HIGH');
  });

  it('should return "HIGH" for score 8.9', () => {
    expect(pipe.transform(8.9)).toBe('HIGH');
  });

  it('should return "CRITICAL" for score 9', () => {
    expect(pipe.transform(9)).toBe('CRITICAL');
  });

  it('should return "CRITICAL" for score 10', () => {
    expect(pipe.transform(10)).toBe('CRITICAL');
  });

  // ── class mode — all thresholds ──────────────────────────────────

  it('should return "text-severity-info" for score 0 in class mode', () => {
    expect(pipe.transform(0, 'class')).toBe('text-severity-info');
  });

  it('should return "text-severity-info" for score 1.9 in class mode', () => {
    expect(pipe.transform(1.9, 'class')).toBe('text-severity-info');
  });

  it('should return "text-severity-low" for score 2 in class mode', () => {
    expect(pipe.transform(2, 'class')).toBe('text-severity-low');
  });

  it('should return "text-severity-low" for score 3.9 in class mode', () => {
    expect(pipe.transform(3.9, 'class')).toBe('text-severity-low');
  });

  it('should return "text-severity-medium" for score 4 in class mode', () => {
    expect(pipe.transform(4, 'class')).toBe('text-severity-medium');
  });

  it('should return "text-severity-medium" for score 5.9 in class mode', () => {
    expect(pipe.transform(5.9, 'class')).toBe('text-severity-medium');
  });

  it('should return "text-severity-high" for score 6 in class mode', () => {
    expect(pipe.transform(6, 'class')).toBe('text-severity-high');
  });

  it('should return "text-severity-high" for score 7.9 in class mode', () => {
    expect(pipe.transform(7.9, 'class')).toBe('text-severity-high');
  });

  it('should return "text-severity-critical" for score 8 in class mode', () => {
    expect(pipe.transform(8, 'class')).toBe('text-severity-critical');
  });

  it('should return "text-severity-critical" for score 10 in class mode', () => {
    expect(pipe.transform(10, 'class')).toBe('text-severity-critical');
  });

  // ── boundary / edge values ────────────────────────────────────────

  it('should default to label mode when mode is omitted', () => {
    expect(pipe.transform(5)).toBe('ELEVATED');
  });

  it('should handle negative score in label mode', () => {
    expect(pipe.transform(-1)).toBe('MINIMAL');
  });

  it('should handle negative score in class mode', () => {
    expect(pipe.transform(-1, 'class')).toBe('text-severity-info');
  });

  it('should handle very large score in label mode', () => {
    expect(pipe.transform(100)).toBe('CRITICAL');
  });

  it('should handle very large score in class mode', () => {
    expect(pipe.transform(100, 'class')).toBe('text-severity-critical');
  });
});
