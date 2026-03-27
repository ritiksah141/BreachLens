import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [NgClass],
  template: `
    <nav>
      <ul class="pagination pagination-sm justify-content-center mb-0">
        <li class="page-item" [ngClass]="{ disabled: currentPage <= 1 }">
          <button class="page-link" (click)="changePage(currentPage - 1)">‹ Prev</button>
        </li>
        @for (p of pages; track p) {
          <li class="page-item" [ngClass]="{ active: p === currentPage }">
            <button class="page-link" (click)="changePage(p)">{{ p }}</button>
          </li>
        }
        <li class="page-item" [ngClass]="{ disabled: currentPage >= totalPages }">
          <button class="page-link" (click)="changePage(currentPage + 1)">Next ›</button>
        </li>
      </ul>
    </nav>
  `,
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
