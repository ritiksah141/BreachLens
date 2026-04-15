import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [NgClass],
  template: `
    <nav class="pagination-wrap" aria-label="Pagination Navigation">
      <ul class="pagination pagination-sm justify-content-center mb-0 align-items-center gap-2">
        <li class="page-item" [ngClass]="{ disabled: currentPage <= 1 }">
          <button
            class="page-link pagination-edge"
            (click)="changePage(currentPage - 1)"
            [disabled]="currentPage <= 1"
            aria-label="Previous page"
          >
            <span class="material-symbols-outlined fs-6">chevron_left</span>
            Prev
          </button>
        </li>
        @for (p of pages; track p) {
          <li class="page-item" [ngClass]="{ active: p === currentPage }">
            <button class="page-link pagination-number" (click)="changePage(p)">{{ p }}</button>
          </li>
        }
        <li class="page-item" [ngClass]="{ disabled: currentPage >= totalPages }">
          <button
            class="page-link pagination-edge"
            (click)="changePage(currentPage + 1)"
            [disabled]="currentPage >= totalPages"
            aria-label="Next page"
          >
            Next
            <span class="material-symbols-outlined fs-6">chevron_right</span>
          </button>
        </li>
      </ul>
    </nav>
  `,
  styles: [`
    .pagination-wrap .pagination {
      --edge-bg: var(--surface-container-high);
      --edge-border: var(--outline-variant);
      --edge-text: var(--on-surface);
    }

    .page-link {
      border-radius: 0.65rem;
      border: 1px solid var(--edge-border) !important;
      background: var(--edge-bg) !important;
      color: var(--edge-text) !important;
      min-width: 2.25rem;
      height: 2.25rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.2rem;
      font-weight: 700;
      transition: all 0.2s ease;
    }

    .pagination-edge {
      padding-inline: 0.75rem;
      min-width: 5.2rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 0.62rem;
    }

    .pagination-number {
      font-size: 0.78rem;
      font-weight: 700;
    }

    .page-link:hover:not(:disabled) {
      transform: translateY(-1px);
      border-color: var(--primary) !important;
      box-shadow: 0 0 12px color-mix(in srgb, var(--primary) 18%, transparent);
      color: var(--on-surface) !important;
    }

    .page-item.active .page-link {
      background: var(--primary-container) !important;
      border-color: var(--primary) !important;
      color: var(--on-primary-container) !important;
      box-shadow: 0 0 14px color-mix(in srgb, var(--primary) 24%, transparent);
    }

    .page-item.disabled .page-link,
    .page-link:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      pointer-events: none;
      box-shadow: none;
    }
  `],
})
export class PaginationComponent {
  @Input() currentPage = 1;
  @Input() totalPages = 1;
  @Output() pageChange = new EventEmitter<number>();

  get pages(): number[] {
    const range = 2;
    const start = Math.max(1, this.currentPage - range);
    const end = Math.min(this.totalPages, this.currentPage + range);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.pageChange.emit(page);
    }
  }
}
