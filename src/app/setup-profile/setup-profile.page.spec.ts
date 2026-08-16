import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SetupProfilePage } from './setup-profile.page';
import { SetupProfilePageModule } from './setup-profile.module';

describe('SetupProfilePage', () => {
  let component: SetupProfilePage;
  let fixture: ComponentFixture<SetupProfilePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SetupProfilePageModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SetupProfilePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
