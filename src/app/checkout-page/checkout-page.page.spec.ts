import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CheckoutPagePage } from './checkout-page.page';

describe('CheckoutPagePage', () => {
  let component: CheckoutPagePage;
  let fixture: ComponentFixture<CheckoutPagePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CheckoutPagePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
