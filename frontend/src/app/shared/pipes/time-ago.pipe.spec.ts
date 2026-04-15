import { TimeAgoPipe } from './time-ago.pipe';

describe('TimeAgoPipe', () => {
  let pipe: TimeAgoPipe;

  beforeEach(() => {
    pipe = new TimeAgoPipe();
  });

  // ── null / undefined / empty ──────────────────────────────────────

  it('should return empty string for null', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });

  it('should return empty string for empty string', () => {
    expect(pipe.transform('')).toBe('');
  });

  // ── invalid date ──────────────────────────────────────────────────

  it('should return empty string for an invalid date string', () => {
    expect(pipe.transform('not-a-date')).toBe('');
  });

  it('should return empty string for an invalid Date object', () => {
    expect(pipe.transform(new Date('invalid'))).toBe('');
  });

  // ── "just now" (< 5 seconds) ─────────────────────────────────────

  it('should return "just now" for a date less than 5 seconds ago', () => {
    const date = new Date(Date.now() - 2_000);
    expect(pipe.transform(date)).toBe('just now');
  });

  it('should return "just now" for the current moment', () => {
    expect(pipe.transform(new Date())).toBe('just now');
  });

  // ── seconds (5–59s) ──────────────────────────────────────────────

  it('should return seconds ago for 10 seconds', () => {
    const date = new Date(Date.now() - 10_000);
    expect(pipe.transform(date)).toBe('10s ago');
  });

  it('should return seconds ago for exactly 5 seconds', () => {
    const date = new Date(Date.now() - 5_000);
    expect(pipe.transform(date)).toBe('5s ago');
  });

  it('should return seconds ago for 59 seconds', () => {
    const date = new Date(Date.now() - 59_000);
    expect(pipe.transform(date)).toBe('59s ago');
  });

  // ── minutes (1–59 min) ───────────────────────────────────────────

  it('should return minutes ago for 1 minute', () => {
    const date = new Date(Date.now() - 60_000);
    expect(pipe.transform(date)).toBe('1m ago');
  });

  it('should return minutes ago for 45 minutes', () => {
    const date = new Date(Date.now() - 45 * 60_000);
    expect(pipe.transform(date)).toBe('45m ago');
  });

  // ── hours (1–23 h) ───────────────────────────────────────────────

  it('should return hours ago for 1 hour', () => {
    const date = new Date(Date.now() - 3_600_000);
    expect(pipe.transform(date)).toBe('1h ago');
  });

  it('should return hours ago for 23 hours', () => {
    const date = new Date(Date.now() - 23 * 3_600_000);
    expect(pipe.transform(date)).toBe('23h ago');
  });

  // ── days (1–6 d) ─────────────────────────────────────────────────

  it('should return days ago for 1 day', () => {
    const date = new Date(Date.now() - 86_400_000);
    expect(pipe.transform(date)).toBe('1d ago');
  });

  it('should return days ago for 6 days', () => {
    const date = new Date(Date.now() - 6 * 86_400_000);
    expect(pipe.transform(date)).toBe('6d ago');
  });

  // ── weeks (1–4 w) ────────────────────────────────────────────────

  it('should return weeks ago for 7 days (1 week)', () => {
    const date = new Date(Date.now() - 7 * 86_400_000);
    expect(pipe.transform(date)).toBe('1w ago');
  });

  it('should return weeks ago for 4 weeks (28 days)', () => {
    const date = new Date(Date.now() - 28 * 86_400_000);
    expect(pipe.transform(date)).toBe('4w ago');
  });

  // ── months (1–11 mo) ─────────────────────────────────────────────

  it('should return months ago for ~35 days (1 month by 30-day calc)', () => {
    // 35 days -> diffWeek = 5 (>= 5 so falls through), diffMonth = 1
    const date = new Date(Date.now() - 35 * 86_400_000);
    expect(pipe.transform(date)).toBe('1mo ago');
  });

  it('should return months ago for ~180 days (6 months)', () => {
    const date = new Date(Date.now() - 180 * 86_400_000);
    expect(pipe.transform(date)).toBe('6mo ago');
  });

  it('should return months ago for ~330 days (11 months)', () => {
    const date = new Date(Date.now() - 330 * 86_400_000);
    expect(pipe.transform(date)).toBe('11mo ago');
  });

  // ── years ─────────────────────────────────────────────────────────

  it('should return years ago for 365 days', () => {
    const date = new Date(Date.now() - 365 * 86_400_000);
    expect(pipe.transform(date)).toBe('1y ago');
  });

  it('should return years ago for ~730 days (2 years)', () => {
    const date = new Date(Date.now() - 730 * 86_400_000);
    expect(pipe.transform(date)).toBe('2y ago');
  });

  // ── string input ──────────────────────────────────────────────────

  it('should accept an ISO date string', () => {
    const date = new Date(Date.now() - 3_600_000).toISOString();
    expect(pipe.transform(date)).toBe('1h ago');
  });

  it('should accept a non-ISO parseable date string', () => {
    const date = new Date(Date.now() - 2 * 86_400_000).toString();
    expect(pipe.transform(date)).toBe('2d ago');
  });

  // ── Date object input ─────────────────────────────────────────────

  it('should accept a Date object', () => {
    const date = new Date(Date.now() - 120_000);
    expect(pipe.transform(date)).toBe('2m ago');
  });
});
