import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConnectConsultantPage } from './connect-consultant.page';

describe('ConnectConsultantPage', () => {
  let component: ConnectConsultantPage;
  let fixture: ComponentFixture<ConnectConsultantPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ConnectConsultantPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
