import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CheckoutPage } from './checkout-page.page';
import { CheckoutPageModule } from './checkout-page.module';

describe('CheckoutPage', () => {
  let component: CheckoutPage;
  let fixture: ComponentFixture<CheckoutPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CheckoutPageModule] }).compileComponents();
    fixture = TestBed.createComponent(CheckoutPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
