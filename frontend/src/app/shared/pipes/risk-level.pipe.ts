import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'riskLevel', standalone: true })
export class RiskLevelPipe implements PipeTransform {
  transform(score: number | null | undefined, mode: 'label' | 'class' = 'label'): string {
    if (score == null) return mode === 'label' ? 'N/A' : '';

    if (mode === 'class') {
      if (score >= 8) return 'text-severity-critical';
      if (score >= 6) return 'text-severity-high';
      if (score >= 4) return 'text-severity-medium';
      if (score >= 2) return 'text-severity-low';
      return 'text-severity-info';
    }

    if (score >= 9) return 'CRITICAL';
    if (score >= 7) return 'HIGH';
    if (score >= 5) return 'ELEVATED';
    if (score >= 3) return 'MODERATE';
    if (score >= 1) return 'LOW';
    return 'MINIMAL';
  }
}
