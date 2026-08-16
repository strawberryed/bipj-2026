import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthPage } from './auth.page';
import { AuthPageModule } from './auth.module';

describe('AuthPage', () => {
  let component: AuthPage;
  let fixture: ComponentFixture<AuthPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AuthPageModule] }).compileComponents();

    fixture = TestBed.createComponent(AuthPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
