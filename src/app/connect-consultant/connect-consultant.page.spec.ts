import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConsultantPage } from './connect-consultant.page';

describe('ConsultantPage', () => {
  let component: ConsultantPage;
  let fixture: ComponentFixture<ConsultantPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ConsultantPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
