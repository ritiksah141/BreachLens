/// <reference types="jasmine" />

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PaginationComponent } from './pagination.component';

describe('PaginationComponent', () => {
  let component: PaginationComponent;
  let fixture: ComponentFixture<PaginationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PaginationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  // ---------------------------------------------------------------
  // Page range calculation (pages getter)
  // ---------------------------------------------------------------

  it('should generate correct pages array when totalPages is 1', () => {
    component.currentPage = 1;
    component.totalPages = 1;
    expect(component.pages).toEqual([1]);
  });

  it('should generate pages within range of 2 around currentPage', () => {
    component.currentPage = 5;
    component.totalPages = 10;
    expect(component.pages).toEqual([3, 4, 5, 6, 7]);
  });

  it('should clamp page range start to 1 when currentPage is near the beginning', () => {
    component.currentPage = 1;
    component.totalPages = 10;
    expect(component.pages).toEqual([1, 2, 3]);
  });

  it('should clamp page range end to totalPages when currentPage is near the end', () => {
    component.currentPage = 10;
    component.totalPages = 10;
    expect(component.pages).toEqual([8, 9, 10]);
  });

  it('should handle small total pages correctly (totalPages = 3, currentPage = 2)', () => {
    component.currentPage = 2;
    component.totalPages = 3;
    expect(component.pages).toEqual([1, 2, 3]);
  });

  // ---------------------------------------------------------------
  // Page rendering in the DOM
  // ---------------------------------------------------------------

  it('should render the correct number of page buttons', () => {
    component.currentPage = 3;
    component.totalPages = 8;
    fixture.detectChanges();

    const pageButtons = fixture.debugElement.queryAll(By.css('.pagination-number'));
    // range = 2 around page 3 => pages [1,2,3,4,5]
    expect(pageButtons.length).toBe(5);
  });

  it('should mark the current page as active', () => {
    component.currentPage = 3;
    component.totalPages = 8;
    fixture.detectChanges();

    const activeItem = fixture.debugElement.query(By.css('.page-item.active'));
    expect(activeItem).toBeTruthy();
    const activeButton = activeItem.query(By.css('.pagination-number'));
    expect(activeButton.nativeElement.textContent.trim()).toBe('3');
  });

  // ---------------------------------------------------------------
  // Prev / Next buttons & disabled states
  // ---------------------------------------------------------------

  it('should disable the Prev button when currentPage is 1', () => {
    component.currentPage = 1;
    component.totalPages = 5;
    fixture.detectChanges();

    const prevButton = fixture.debugElement.query(
      By.css('button[aria-label="Previous page"]')
    );
    expect(prevButton.nativeElement.disabled).toBeTrue();
  });

  it('should enable the Prev button when currentPage is greater than 1', () => {
    component.currentPage = 3;
    component.totalPages = 5;
    fixture.detectChanges();

    const prevButton = fixture.debugElement.query(
      By.css('button[aria-label="Previous page"]')
    );
    expect(prevButton.nativeElement.disabled).toBeFalse();
  });

  it('should disable the Next button when currentPage equals totalPages', () => {
    component.currentPage = 5;
    component.totalPages = 5;
    fixture.detectChanges();

    const nextButton = fixture.debugElement.query(
      By.css('button[aria-label="Next page"]')
    );
    expect(nextButton.nativeElement.disabled).toBeTrue();
  });

  it('should enable the Next button when currentPage is less than totalPages', () => {
    component.currentPage = 3;
    component.totalPages = 5;
    fixture.detectChanges();

    const nextButton = fixture.debugElement.query(
      By.css('button[aria-label="Next page"]')
    );
    expect(nextButton.nativeElement.disabled).toBeFalse();
  });

  // ---------------------------------------------------------------
  // pageChange EventEmitter
  // ---------------------------------------------------------------

  it('should emit pageChange with previous page when Prev is clicked', () => {
    component.currentPage = 3;
    component.totalPages = 5;
    fixture.detectChanges();

    spyOn(component.pageChange, 'emit');

    const prevButton = fixture.debugElement.query(
      By.css('button[aria-label="Previous page"]')
    );
    prevButton.nativeElement.click();

    expect(component.pageChange.emit).toHaveBeenCalledWith(2);
  });

  it('should emit pageChange with next page when Next is clicked', () => {
    component.currentPage = 3;
    component.totalPages = 5;
    fixture.detectChanges();

    spyOn(component.pageChange, 'emit');

    const nextButton = fixture.debugElement.query(
      By.css('button[aria-label="Next page"]')
    );
    nextButton.nativeElement.click();

    expect(component.pageChange.emit).toHaveBeenCalledWith(4);
  });

  it('should emit pageChange with the clicked page number', () => {
    component.currentPage = 3;
    component.totalPages = 8;
    fixture.detectChanges();

    spyOn(component.pageChange, 'emit');

    const pageButtons = fixture.debugElement.queryAll(By.css('.pagination-number'));
    // pages = [1, 2, 3, 4, 5] — click on index 0 which is page 1
    pageButtons[0].nativeElement.click();

    expect(component.pageChange.emit).toHaveBeenCalledWith(1);
  });

  // ---------------------------------------------------------------
  // changePage() guard logic
  // ---------------------------------------------------------------

  it('should not emit when changePage is called with page < 1', () => {
    component.currentPage = 1;
    component.totalPages = 5;
    spyOn(component.pageChange, 'emit');

    component.changePage(0);
    component.changePage(-1);

    expect(component.pageChange.emit).not.toHaveBeenCalled();
  });

  it('should not emit when changePage is called with page > totalPages', () => {
    component.currentPage = 5;
    component.totalPages = 5;
    spyOn(component.pageChange, 'emit');

    component.changePage(6);
    component.changePage(100);

    expect(component.pageChange.emit).not.toHaveBeenCalled();
  });

  it('should emit when changePage is called with valid boundary pages', () => {
    component.currentPage = 3;
    component.totalPages = 5;
    spyOn(component.pageChange, 'emit');

    component.changePage(1);
    expect(component.pageChange.emit).toHaveBeenCalledWith(1);

    component.changePage(5);
    expect(component.pageChange.emit).toHaveBeenCalledWith(5);
  });
});
