import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UpgradePage } from './upgrade.page';

describe('UpgradePage', () => {
  let component: UpgradePage;
  let fixture: ComponentFixture<UpgradePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(UpgradePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
