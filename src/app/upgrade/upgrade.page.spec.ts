import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UpgradePage } from './upgrade.page';
import { UpgradePageModule } from './upgrade.module';

describe('UpgradePage', () => {
  let component: UpgradePage;
  let fixture: ComponentFixture<UpgradePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [UpgradePageModule] }).compileComponents();

    fixture = TestBed.createComponent(UpgradePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
