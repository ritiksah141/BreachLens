import { CompactNumberPipe } from './compact-number.pipe';

describe('CompactNumberPipe', () => {
  let pipe: CompactNumberPipe;

  beforeEach(() => {
    pipe = new CompactNumberPipe();
  });

  // ── null / undefined / zero ───────────────────────────────────────

  it('should return "0" for null', () => {
    expect(pipe.transform(null)).toBe('0');
  });

  it('should return "0" for undefined', () => {
    expect(pipe.transform(undefined)).toBe('0');
  });

  it('should return "0" for 0', () => {
    expect(pipe.transform(0)).toBe('0');
  });

  // ── values below 1,000 (no suffix) ───────────────────────────────

  it('should return plain number for 1', () => {
    expect(pipe.transform(1)).toBe('1');
  });

  it('should return plain number for 999', () => {
    expect(pipe.transform(999)).toBe('999');
  });

  it('should return plain number for 42', () => {
    expect(pipe.transform(42)).toBe('42');
  });

  // ── thousands (K) ────────────────────────────────────────────────

  it('should return "1K" for 1000', () => {
    expect(pipe.transform(1000)).toBe('1K');
  });

  it('should return "1.5K" for 1500', () => {
    expect(pipe.transform(1500)).toBe('1.5K');
  });

  it('should return "10K" for 10000', () => {
    expect(pipe.transform(10000)).toBe('10K');
  });

  it('should return "999.9K" for 999900', () => {
    expect(pipe.transform(999900)).toBe('999.9K');
  });

  it('should return "1.2K" for 1234', () => {
    expect(pipe.transform(1234)).toBe('1.2K');
  });

  // ── millions (M) ─────────────────────────────────────────────────

  it('should return "1M" for 1000000', () => {
    expect(pipe.transform(1000000)).toBe('1M');
  });

  it('should return "2.5M" for 2500000', () => {
    expect(pipe.transform(2500000)).toBe('2.5M');
  });

  it('should return "999.9M" for 999900000', () => {
    expect(pipe.transform(999900000)).toBe('999.9M');
  });

  // ── billions (B) ─────────────────────────────────────────────────

  it('should return "1B" for 1000000000', () => {
    expect(pipe.transform(1000000000)).toBe('1B');
  });

  it('should return "3.5B" for 3500000000', () => {
    expect(pipe.transform(3500000000)).toBe('3.5B');
  });

  it('should return "1.2B" for 1234567890', () => {
    expect(pipe.transform(1234567890)).toBe('1.2B');
  });

  // ── negative numbers ─────────────────────────────────────────────

  it('should handle negative thousands', () => {
    expect(pipe.transform(-1500)).toBe('-1.5K');
  });

  it('should handle negative millions', () => {
    expect(pipe.transform(-2500000)).toBe('-2.5M');
  });

  it('should handle negative billions', () => {
    expect(pipe.transform(-1000000000)).toBe('-1B');
  });

  it('should handle small negative number (no suffix)', () => {
    expect(pipe.transform(-42)).toBe('-42');
  });

  // ── custom decimals parameter ─────────────────────────────────────

  it('should respect decimals=0 for thousands', () => {
    expect(pipe.transform(1500, 0)).toBe('2K');
  });

  it('should respect decimals=2 for thousands', () => {
    expect(pipe.transform(1234, 2)).toBe('1.23K');
  });

  it('should respect decimals=2 for millions', () => {
    expect(pipe.transform(1234567, 2)).toBe('1.23M');
  });

  it('should strip trailing zeroes when result is whole', () => {
    // 2000 -> 2.0K with 1 decimal -> trailing zero stripped -> "2K"
    expect(pipe.transform(2000)).toBe('2K');
  });

  it('should strip trailing zeroes for decimals=2 when whole', () => {
    // 3000000 -> 3.00M -> stripped -> "3M"
    expect(pipe.transform(3000000, 2)).toBe('3M');
  });

  it('should NOT strip if not all trailing decimals are zero', () => {
    // 1100 -> 1.1K (decimals=1) -> last char is not '0' -> "1.1K"
    expect(pipe.transform(1100)).toBe('1.1K');
  });

  // ── edge: very large number ──────────────────────────────────────

  it('should handle very large billions', () => {
    expect(pipe.transform(100_000_000_000)).toBe('100B');
  });
});
