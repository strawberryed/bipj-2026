import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OnboardingPage } from './onboarding.page';
import { OnboardingPageModule } from './onboarding.module';

describe('OnboardingPage', () => {
  let component: OnboardingPage;
  let fixture: ComponentFixture<OnboardingPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OnboardingPageModule],
    }).compileComponents();

    fixture = TestBed.createComponent(OnboardingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
