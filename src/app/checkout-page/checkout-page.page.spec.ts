import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CheckoutPage } from './checkout-page.page';
<<<<<<< HEAD
=======
import { CheckoutPageModule } from './checkout-page.module';
>>>>>>> 054354e84264c9224e3ecea50e387a3a6e1bdfa4

describe('CheckoutPage', () => {
  let component: CheckoutPage;
  let fixture: ComponentFixture<CheckoutPage>;

<<<<<<< HEAD
  beforeEach(() => {
=======
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CheckoutPageModule] }).compileComponents();
>>>>>>> 054354e84264c9224e3ecea50e387a3a6e1bdfa4
    fixture = TestBed.createComponent(CheckoutPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
