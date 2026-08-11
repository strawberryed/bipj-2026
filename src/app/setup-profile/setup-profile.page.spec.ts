import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SetupProfilePage } from './setup-profile.page';

describe('SetupProfilePage', () => {
  let component: SetupProfilePage;
  let fixture: ComponentFixture<SetupProfilePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SetupProfilePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
