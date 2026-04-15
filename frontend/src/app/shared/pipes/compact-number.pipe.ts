import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'compactNumber', standalone: true })
export class CompactNumberPipe implements PipeTransform {
  transform(value: number | null | undefined, decimals: number = 1): string {
    if (value == null) return '0';
    if (value === 0) return '0';

    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (abs >= 1_000_000_000) return sign + this.format(abs / 1_000_000_000, decimals) + 'B';
    if (abs >= 1_000_000) return sign + this.format(abs / 1_000_000, decimals) + 'M';
    if (abs >= 1_000) return sign + this.format(abs / 1_000, decimals) + 'K';
    return sign + abs.toString();
  }

  private format(n: number, decimals: number): string {
    const fixed = n.toFixed(decimals);
    return fixed.endsWith('0'.repeat(decimals)) ? n.toFixed(0) : fixed;
  }
}
