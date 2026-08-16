import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConsultantPage } from './connect-consultant.page';
import { ConnectConsultantPageModule } from './connect-consultant.module';

describe('ConsultantPage', () => {
  let component: ConsultantPage;
  let fixture: ComponentFixture<ConsultantPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ConnectConsultantPageModule] }).compileComponents();

    fixture = TestBed.createComponent(ConsultantPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
